from __future__ import annotations

import argparse
from datetime import date, timedelta

from diagnostics_loader import (
    DEFAULT_FULL_START_DATE,
    create_db_engine,
    create_feegow_client,
    get_last_diagnostics_timestamp,
    load_diagnostics_range,
    parse_date,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Carga incremental de diagnostics a partir da ultima DataHora.")
    parser.add_argument("--start-date", help="Sobrescreve a data inicial YYYY-MM-DD")
    parser.add_argument(
        "--end-date",
        default=(date.today() - timedelta(days=1)).isoformat(),
        help="Data final YYYY-MM-DD",
    )
    parser.add_argument("--chunk-days", type=int, default=30, help="Tamanho da janela em dias")
    parser.add_argument("--min-chunk-days", type=int, default=1, help="Menor janela permitida no split adaptativo")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    engine = create_db_engine()
    api = create_feegow_client()

    if args.start_date:
        start_date = parse_date(args.start_date)
        print(f"Using manual start date: {start_date.isoformat()}")
    else:
        last_ts = get_last_diagnostics_timestamp(engine)
        if last_ts is None:
            start_date = DEFAULT_FULL_START_DATE
            print("No existing diagnostics found. Falling back to full start date.")
        else:
            start_date = last_ts.date() + timedelta(days=1)
            print(f"Last diagnostics timestamp found: {last_ts.isoformat(sep=' ')}")

    end_date = parse_date(args.end_date)
    if start_date > end_date:
        print(f"No work to do. Start date {start_date.isoformat()} is after end date {end_date.isoformat()}.")
        return

    result = load_diagnostics_range(
        engine,
        api,
        start_date=start_date,
        end_date=end_date,
        chunk_days=args.chunk_days,
        adaptive_split=True,
        min_chunk_days=args.min_chunk_days,
    )

    print(
        f"Incremental load completed: {result.inserted_rows} row(s) inserted across "
        f"{result.windows_processed} processed window(s)."
    )


if __name__ == "__main__":
    main()
