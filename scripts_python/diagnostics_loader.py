from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
import os
from pathlib import Path
import re
from typing import Any, Iterable

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, URL

from feegow_api import FeegowAPI


DEFAULT_REPORT_NAME = "diagnostics"
DEFAULT_FULL_START_DATE = date(2024, 1, 1)
TRANSIENT_ERROR_PATTERNS = (
    "504",
    "502",
    "503",
    "gateway",
    "timeout",
    "timed out",
    "max retries exceeded",
    "connection reset",
)


@dataclass
class LoadResult:
    inserted_rows: int = 0
    windows_processed: int = 0


def load_environment() -> None:
    for candidate in (Path(".env"), Path("apps/api/.env")):
        if candidate.exists():
            load_dotenv(candidate, override=False)


def create_db_engine() -> Engine:
    load_environment()
    url = URL.create(
        "postgresql+psycopg2",
        username=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.getenv("DB_NAME"),
    )
    return create_engine(url)


def create_feegow_client() -> FeegowAPI:
    load_environment()
    token = os.getenv("FEEGOW_TOKEN")
    if not token:
        raise RuntimeError("FEEGOW_TOKEN not found in .env")
    return FeegowAPI(token=token)


def parse_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def daterange_chunks(start_date: date, end_date: date, chunk_days: int) -> Iterable[tuple[date, date]]:
    current = start_date
    while current <= end_date:
        current_end = min(current + timedelta(days=chunk_days - 1), end_date)
        yield current, current_end
        current = current_end + timedelta(days=1)


def extract_rows(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [row for row in payload if isinstance(row, dict)]

    if isinstance(payload, dict):
        for key in ("content", "data", "items", "rows"):
            value = payload.get(key)
            if isinstance(value, list):
                return [row for row in value if isinstance(row, dict)]

    return []


def is_transient_error(error: Exception) -> bool:
    message = str(error).lower()
    return any(pattern in message for pattern in TRANSIENT_ERROR_PATTERNS)


def get_last_diagnostics_timestamp(engine: Engine) -> datetime | None:
    with engine.connect() as connection:
        return connection.execute(
            text(
                """
                SELECT MAX(to_timestamp("DataHora", 'DD/MM/YYYY HH24:MI'))
                FROM diagnostics
                WHERE "DataHora" IS NOT NULL
                """
            )
        ).scalar()


def delete_diagnostics_range(engine: Engine, start_date: date, end_date: date) -> int:
    with engine.begin() as connection:
        result = connection.execute(
            text(
                """
                DELETE FROM diagnostics
                WHERE to_timestamp("DataHora", 'DD/MM/YYYY HH24:MI') >= :start_ts
                  AND to_timestamp("DataHora", 'DD/MM/YYYY HH24:MI') < :end_ts
                """
            ),
            {
                "start_ts": datetime.combine(start_date, datetime.min.time()),
                "end_ts": datetime.combine(end_date + timedelta(days=1), datetime.min.time()),
            },
        )
        return result.rowcount or 0


def insert_payload(engine: Engine, rows: list[dict[str, Any]], table_name: str = DEFAULT_REPORT_NAME) -> int:
    if not rows:
        return 0

    frame = pd.DataFrame(rows)
    frame.to_sql(table_name, engine, if_exists="append", index=False, method="multi", chunksize=1000)
    return len(frame.index)


def process_window(
    engine: Engine,
    api: FeegowAPI,
    start_date: date,
    end_date: date,
    report_name: str = DEFAULT_REPORT_NAME,
    adaptive_split: bool = True,
    min_chunk_days: int = 1,
    extra_payload: dict[str, Any] | None = None,
) -> LoadResult:
    print(f"Processing window {start_date.isoformat()} -> {end_date.isoformat()}")

    try:
        payload = api.generate_report(
            report_name,
            start_date.isoformat(),
            end_date.isoformat(),
            extra_payload=extra_payload,
        )
        inserted = insert_payload(engine, extract_rows(payload), table_name=report_name)
        print(f"Inserted {inserted} row(s)")
        return LoadResult(inserted_rows=inserted, windows_processed=1)
    except Exception as error:
        window_days = (end_date - start_date).days + 1
        if not adaptive_split or window_days <= min_chunk_days or not is_transient_error(error):
            raise

        midpoint = start_date + timedelta(days=(window_days // 2) - 1)
        midpoint = max(start_date, midpoint)
        if midpoint >= end_date:
            raise

        print(
            f"Transient error on {start_date.isoformat()} -> {end_date.isoformat()}: {error}. "
            f"Splitting window."
        )

        left = process_window(
            engine,
            api,
            start_date,
            midpoint,
            report_name=report_name,
            adaptive_split=adaptive_split,
            min_chunk_days=min_chunk_days,
            extra_payload=extra_payload,
        )
        right = process_window(
            engine,
            api,
            midpoint + timedelta(days=1),
            end_date,
            report_name=report_name,
            adaptive_split=adaptive_split,
            min_chunk_days=min_chunk_days,
            extra_payload=extra_payload,
        )
        return LoadResult(
            inserted_rows=left.inserted_rows + right.inserted_rows,
            windows_processed=left.windows_processed + right.windows_processed,
        )


def load_diagnostics_range(
    engine: Engine,
    api: FeegowAPI,
    start_date: date,
    end_date: date,
    chunk_days: int = 30,
    report_name: str = DEFAULT_REPORT_NAME,
    adaptive_split: bool = True,
    min_chunk_days: int = 1,
    extra_payload: dict[str, Any] | None = None,
) -> LoadResult:
    if start_date > end_date:
        return LoadResult()

    result = LoadResult()
    for chunk_start, chunk_end in daterange_chunks(start_date, end_date, chunk_days):
        current = process_window(
            engine,
            api,
            chunk_start,
            chunk_end,
            report_name=report_name,
            adaptive_split=adaptive_split,
            min_chunk_days=min_chunk_days,
            extra_payload=extra_payload,
        )
        result.inserted_rows += current.inserted_rows
        result.windows_processed += current.windows_processed

    return result


def sanitize_ranges(ranges: list[str]) -> list[tuple[date, date]]:
    parsed: list[tuple[date, date]] = []
    for raw in ranges:
        match = re.fullmatch(r"(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})", raw.strip())
        if not match:
            raise ValueError(f"Invalid range '{raw}'. Expected YYYY-MM-DD:YYYY-MM-DD")

        start_date = parse_date(match.group(1))
        end_date = parse_date(match.group(2))
        if start_date > end_date:
            raise ValueError(f"Invalid range '{raw}'. Start date must be <= end date.")
        parsed.append((start_date, end_date))

    return parsed
