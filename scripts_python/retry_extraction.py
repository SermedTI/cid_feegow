from __future__ import annotations

import argparse

from diagnostics_loader import (
    create_db_engine,
    create_feegow_client,
    delete_diagnostics_range,
    load_diagnostics_range,
    sanitize_ranges,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Reprocessa intervalos especificos de diagnostics.")
    parser.add_argument(
        "--range",
        dest="ranges",
        action="append",
        required=True,
        help="Intervalo no formato YYYY-MM-DD:YYYY-MM-DD. Pode repetir a flag.",
    )
    parser.add_argument("--chunk-days", type=int, default=15, help="Tamanho da janela em dias")
    parser.add_argument("--min-chunk-days", type=int, default=1, help="Menor janela permitida no split adaptativo")
    parser.add_argument(
        "--delete-range-before-load",
        action="store_true",
        help="Apaga previamente os diagnostics dos intervalos informados antes de recarregar",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    ranges = sanitize_ranges(args.ranges)

    engine = create_db_engine()
    api = create_feegow_client()

    grand_total = 0
    total_windows = 0

    for start_date, end_date in ranges:
        if args.delete_range_before_load:
            deleted = delete_diagnostics_range(engine, start_date, end_date)
            print(
                f"Deleted {deleted} existing row(s) before retry for "
                f"{start_date.isoformat()} -> {end_date.isoformat()}"
            )

        result = load_diagnostics_range(
            engine,
            api,
            start_date=start_date,
            end_date=end_date,
            chunk_days=args.chunk_days,
            adaptive_split=True,
            min_chunk_days=args.min_chunk_days,
        )
        grand_total += result.inserted_rows
        total_windows += result.windows_processed

    print(
        f"Retry completed: {grand_total} row(s) inserted across "
        f"{total_windows} processed window(s)."
    )


if __name__ == "__main__":
    main()
