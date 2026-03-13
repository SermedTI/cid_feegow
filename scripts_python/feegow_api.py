from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
import time
from typing import Any

import requests


API_URL = "https://api.feegow.com/v1/api/reports/generate"


def _to_feegow_date(value: str | date | datetime) -> str:
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y")

    if isinstance(value, date):
        return value.strftime("%d/%m/%Y")

    text = value.strip()
    if "/" in text:
        return text

    return datetime.strptime(text, "%Y-%m-%d").strftime("%d/%m/%Y")


@dataclass
class FeegowAPI:
    token: str
    timeout_seconds: int = 60
    max_attempts: int = 3
    backoff_seconds: int = 2

    def __post_init__(self) -> None:
        self.session = requests.Session()
        self.session.headers.update(
            {
                "x-access-token": self.token,
                "Accept": "application/json",
                "Content-Type": "application/json",
            }
        )

    def generate_report(
        self,
        report_name: str,
        start_date: str | date | datetime,
        end_date: str | date | datetime,
        extra_payload: dict[str, Any] | None = None,
    ) -> Any:
        payload = {
            "report": report_name,
            "DATA_INICIO": _to_feegow_date(start_date),
            "DATA_FIM": _to_feegow_date(end_date),
        }

        if extra_payload:
            payload.update(extra_payload)

        last_error: Exception | None = None

        for attempt in range(1, self.max_attempts + 1):
            try:
                response = self.session.post(API_URL, json=payload, timeout=self.timeout_seconds)
                response.raise_for_status()
                return response.json()
            except requests.RequestException as error:
                last_error = error
                if attempt >= self.max_attempts:
                    break

                wait_seconds = self.backoff_seconds ** attempt
                print(
                    f"(Attempt {attempt}/{self.max_attempts} failed: {error}) "
                    f"Retrying in {wait_seconds}s..."
                )
                time.sleep(wait_seconds)

        raise RuntimeError(str(last_error) if last_error else "Feegow request failed without details.")

    def gerar_relatorio(
        self,
        report_name: str,
        start_date: str | date | datetime,
        end_date: str | date | datetime,
        extra_payload: dict[str, Any] | None = None,
    ) -> Any:
        return self.generate_report(report_name, start_date, end_date, extra_payload)
