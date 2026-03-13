CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'reader')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    token_id UUID NOT NULL UNIQUE,
    revoked_at TIMESTAMPTZ NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NULL REFERENCES app_users(id) ON DELETE SET NULL,
    action VARCHAR(60) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_auth_sessions_user_id
    ON app_auth_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_app_auth_sessions_expires_at
    ON app_auth_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_app_audit_logs_user_id_created_at
    ON app_audit_logs(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_app_users_updated_at ON app_users;
CREATE TRIGGER trg_app_users_updated_at
BEFORE UPDATE ON app_users
FOR EACH ROW
EXECUTE FUNCTION touch_updated_at();

-- Seed inicial opcional:
-- INSERT INTO app_users (name, email, password_hash, role)
-- VALUES ('Administrador', 'admin@example.com', '<bcrypt-hash>', 'admin')
-- ON CONFLICT (email) DO NOTHING;
