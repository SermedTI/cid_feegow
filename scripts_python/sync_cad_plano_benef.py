"""
Sincroniza a tabela cad_plano_benef do Oracle para o PostgreSQL.

Uso:
    python sync_cad_plano_benef.py [--batch-size 5000] [--dry-run]

Variáveis de ambiente necessárias (podem estar no .env):
    # Oracle
    ORACLE_DSN            - host:port/service_name  (ex: 192.168.1.10:1521/ORCL)
    ORACLE_USER           - usuário Oracle
    ORACLE_PASSWORD       - senha Oracle
    # PostgreSQL (já existentes no projeto)
    DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD

Requer Oracle Instant Client (thick mode) para Oracle 11.2.
No Docker, o Instant Client é instalado em /opt/oracle/instantclient_23_4.
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import oracledb
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, URL


TABLE_NAME = "cad_plano_benef"

ORACLE_QUERY = """
SELECT
    cpb.empresa,
    ce.nome,
    cpb.matricula,
    cb.matricula_pep,
    cpb.titular
FROM cad_plano_benef cpb
INNER JOIN cad_benef cb
    ON cb.matricula = cpb.matricula
INNER JOIN cad_empresa ce
    ON ce.empresa = cpb.empresa
WHERE cpb.baixa = 1
ORDER BY cpb.empresa, cpb.titular, cpb.matricula
"""

COLUMNS = ["empresa", "nome", "matricula", "matricula_pep", "titular"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_environment() -> None:
    for candidate in (Path(".env"), Path("apps/api/.env"), Path("../../.env")):
        if candidate.exists():
            load_dotenv(candidate, override=False)


def create_pg_engine() -> Engine:
    url = URL.create(
        "postgresql+psycopg2",
        username=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.getenv("DB_NAME"),
    )
    return create_engine(url)


ORACLE_LIB_DIR = "/opt/oracle/instantclient_21_12"


def init_oracle_client() -> None:
    """Inicializa o Oracle Client em thick mode (obrigatório para Oracle 11.2)."""
    try:
        oracledb.init_oracle_client(lib_dir=ORACLE_LIB_DIR)
        print(f"  Thick mode inicializado ({ORACLE_LIB_DIR})")
    except oracledb.ProgrammingError as err:
        if "NJS-077" in str(err):
            # Já inicializado — ok.
            pass
        else:
            raise RuntimeError(
                f"ERRO FATAL: Thick mode obrigatório para Oracle 11g mas falhou: {err}"
            ) from err


def connect_oracle() -> oracledb.Connection:
    dsn = os.getenv("ORACLE_DSN")
    user = os.getenv("ORACLE_USER")
    password = os.getenv("ORACLE_PASSWORD")

    missing = []
    if not dsn:
        missing.append("ORACLE_DSN")
    if not user:
        missing.append("ORACLE_USER")
    if not password:
        missing.append("ORACLE_PASSWORD")
    if missing:
        raise RuntimeError(f"Variáveis de ambiente ausentes: {', '.join(missing)}")

    init_oracle_client()
    return oracledb.connect(user=user, password=password, dsn=dsn)


# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------

def fetch_from_oracle(batch_size: int) -> pd.DataFrame:
    print(f"Conectando ao Oracle ({os.getenv('ORACLE_DSN')})...")
    conn = connect_oracle()
    try:
        cursor = conn.cursor()
        cursor.arraysize = batch_size
        print("Executando consulta no Oracle...")
        cursor.execute(ORACLE_QUERY)

        rows: list[list] = []
        while True:
            batch = cursor.fetchmany(batch_size)
            if not batch:
                break
            rows.extend(batch)
            print(f"  ... {len(rows)} linhas lidas", end="\r")

        print(f"\nTotal de linhas lidas do Oracle: {len(rows)}")
        return pd.DataFrame(rows, columns=COLUMNS)
    finally:
        conn.close()


def load_into_postgres(engine: Engine, df: pd.DataFrame, batch_size: int) -> None:
    print(f"Carregando {len(df)} linhas no PostgreSQL (tabela {TABLE_NAME})...")

    with engine.begin() as conn:
        count_before = conn.execute(text(f"SELECT count(*) FROM {TABLE_NAME}")).scalar()
        print(f"  Linhas existentes antes: {count_before}")

        conn.execute(text(f"TRUNCATE TABLE {TABLE_NAME}"))
        print("  Tabela truncada.")

        df.to_sql(
            TABLE_NAME,
            conn,
            if_exists="append",
            index=False,
            method="multi",
            chunksize=batch_size,
        )

    with engine.connect() as conn:
        count_after = conn.execute(text(f"SELECT count(*) FROM {TABLE_NAME}")).scalar()
        print(f"  Linhas após carga: {count_after}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Sincroniza cad_plano_benef do Oracle para o PostgreSQL."
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=5000,
        help="Tamanho do lote para fetch/insert (default: 5000)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Apenas lê do Oracle sem gravar no PostgreSQL",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    load_environment()

    start = time.time()

    df = fetch_from_oracle(args.batch_size)

    if df.empty:
        print("Nenhuma linha retornada do Oracle. Abortando.")
        sys.exit(0)

    if args.dry_run:
        print("[DRY-RUN] Dados lidos com sucesso. Nenhuma gravação realizada.")
        print(df.head(10).to_string(index=False))
        return

    engine = create_pg_engine()
    load_into_postgres(engine, df, args.batch_size)

    elapsed = time.time() - start
    print(f"Sincronização concluída em {elapsed:.1f}s.")


if __name__ == "__main__":
    main()
