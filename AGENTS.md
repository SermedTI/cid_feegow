# Repository Guidelines

## Project Structure & Module Organization
This repository is a flat Python ETL/reporting project. Core entrypoints live at the repo root: `main.py` extracts Feegow diagnostic data into PostgreSQL, `retry_extraction.py` reprocesses failed date ranges, and `generate_report.py` builds charts and `Relatorio_Diagnosticos.pdf`. `feegow_api.py` contains the API client. Files such as `analyze_insights.py`, `check_*.py`, `inspect_*.py`, `debug_report.py`, and `final_check.py` are ad-hoc validation scripts. Generated artifacts (`chart_*.png`, `Relatorio_Diagnosticos.pdf`) are also written to the root directory.

## Build, Test, and Development Commands
Create an isolated environment and install dependencies before running scripts:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python main.py
python retry_extraction.py
python generate_report.py
python analyze_insights.py
```

Use `python main.py` for the full extraction, `python retry_extraction.py` for specific failed windows, and `python generate_report.py` after the `diagnostics` table is populated.

## Coding Style & Naming Conventions
Follow standard Python style: 4-space indentation, `snake_case` for functions/files/variables, and `UPPER_CASE` for module-level constants such as `REPORT_NAME`. Keep modules focused on one workflow. Prefer small helper functions over long inline blocks. Preserve the database’s case-sensitive column names in SQL with double quotes, for example `"Codigo"` and `"DataHora"`.

## Testing Guidelines
There is no automated test suite in this workspace today. Validate changes by running the affected script against a safe environment and then using the inspection scripts to confirm row counts, schema, and report outputs. If you add tests, place them in a new `tests/` directory and use `pytest` with names like `test_feegow_api.py`.

## Commit & Pull Request Guidelines
Git history is not available in this workspace, so follow a simple conventional format: `feat: add retry guard`, `fix: handle empty API payload`. Keep commits scoped to one concern. PRs should describe the data flow impact, required environment variables, database assumptions, and whether generated PNG/PDF artifacts were intentionally refreshed.

## Security & Configuration Tips
Configuration is loaded from `.env`. Required values include `FEEGOW_TOKEN`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`. Do not commit secrets or production-specific exports. Treat generated reports as sensitive healthcare data and sanitize samples before sharing.
