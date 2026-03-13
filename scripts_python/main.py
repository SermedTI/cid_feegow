from __future__ import annotations

import argparse
from datetime import date, timedelta

from diagnostics_loader import (
    DEFAULT_FULL_START_DATE,
    create_db_engine,
    create_feegow_client,
    delete_diagnostics_range,
    load_diagnostics_range,
    parse_date,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Carga completa de diagnostics para o PostgreSQL.")
    parser.add_argument("--start-date", default=DEFAULT_FULL_START_DATE.isoformat(), help="Data inicial YYYY-MM-DD")
    parser.add_argument(
        "--end-date",
        default=(date.today() - timedelta(days=1)).isoformat(),
        help="Data final YYYY-MM-DD",
    )
    parser.add_argument("--chunk-days", type=int, default=30, help="Tamanho da janela em dias")
    parser.add_argument("--min-chunk-days", type=int, default=1, help="Menor janela permitida no split adaptativo")
    parser.add_argument(
        "--delete-range-before-load",
        action="store_true",
        help="Apaga previamente os diagnostics do intervalo informado antes de recarregar",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    start_date = parse_date(args.start_date)
    end_date = parse_date(args.end_date)

    engine = create_db_engine()
    api = create_feegow_client()

    if args.delete_range_before_load:
        deleted = delete_diagnostics_range(engine, start_date, end_date)
        print(f"Deleted {deleted} existing row(s) in requested range")

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
        f"Completed load: {result.inserted_rows} row(s) inserted across "
        f"{result.windows_processed} processed window(s)."
    )


if __name__ == "__main__":
    main()
