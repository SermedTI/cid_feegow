# CID Feegow Platform

Monorepo com dashboard autenticado para analise de beneficiarios por empresa usando a tabela `cad_plano_benef` do banco `cid_feegow`.

## Estrutura

- `apps/api`: backend Node.js + Express + TypeScript
- `apps/web`: frontend React 18 + Vite + componentes no estilo shadcn/ui
- `packages/shared`: contratos TypeScript compartilhados
- `infra/sql/bootstrap_auth.sql`: schema de usuarios, sessoes e auditoria

## Variaveis importantes

A raiz continua usando o `.env` existente para o PostgreSQL. Para a API, complemente quando necessario com:

- `HOST=0.0.0.0`
- `PORT=3333`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `APP_ORIGIN`

## Desenvolvimento

```bash
npm install
npm run build --workspace packages/shared
npm run dev:api
npm run dev:web
```

## Scripts Python de Carga

Os scripts legados de populacao da tabela `diagnostics` foram restaurados na raiz:

```bash
python main.py
python update_diagnostics_incremental.py
python retry_extraction.py --range 2026-03-01:2026-03-10
```

Comandos uteis:

- `python main.py --start-date 2024-01-01 --end-date 2026-03-10`
- `python update_diagnostics_incremental.py --end-date 2026-03-11`
- `python retry_extraction.py --range 2026-02-01:2026-02-07 --delete-range-before-load`

Enderecos locais esperados:

- frontend: `http://localhost:5175`
- frontend via IP: `http://10.10.8.101:5175`
- API: `http://localhost:3333/health`
- API via IP: `http://10.10.8.101:3333/health`

Se outro dispositivo da rede nao acessar, libere as portas `5175` e `3333` no Firewall do Windows.

## Docker

```bash
docker compose up --build
```

O `docker compose` sobe apenas `api` e `web`; o PostgreSQL existente permanece externo.
