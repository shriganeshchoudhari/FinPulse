# Database Schema — FinPulse
**Version:** 1.1.0 | **Last Updated:** 2026-06-03 | **Engine:** PostgreSQL 16 + TimescaleDB 2.x

---

## 1. Schema Overview

| Table / View | Type | Purpose |
|---|---|---|
| `users` | Standard | Identity & credentials |
| `refresh_tokens` | Standard | Refresh token store |
| `wallets` | Standard | User ledger balances |
| `portfolio_assets` | Standard | Current holdings per user |
| `trades` | Standard (OLTP) | Trade order write path |
| `trade_history` | Standard | Status change log per trade |
| `market_ticks` | TimescaleDB Hypertable | Time-series price feed |
| `market_ticks_1m` | Continuous Aggregate | 1-min OHLCV buckets |
| `audit_logs` | TimescaleDB Hypertable | Immutable compliance log |
| `compliance_events` | TimescaleDB Hypertable | Rule-based risk events |
| `portfolio_summary` | Materialized View | Pre-computed portfolio stats |

---

## 2. Entity Definitions

### 2.1 `users`

```sql
CREATE TABLE users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username         VARCHAR(50)  NOT NULL UNIQUE,
    email            VARCHAR(255) NOT NULL UNIQUE,
    password_hash    VARCHAR(255) NOT NULL,
    role             VARCHAR(20)  NOT NULL DEFAULT 'ROLE_USER'
                     CHECK (role IN ('ROLE_USER','ROLE_ANALYST','ROLE_AUDITOR','ROLE_ADMIN')),
    kyc_status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                     CHECK (kyc_status IN ('PENDING','APPROVED','REJECTED')),
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ  -- soft delete; NULL = active
);

CREATE INDEX idx_users_email   ON users (email);
CREATE INDEX idx_users_role    ON users (role);
CREATE INDEX idx_users_active  ON users (is_active) WHERE is_active = TRUE;
```

### 2.2 `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token        VARCHAR(512) NOT NULL UNIQUE,
    expires_at   TIMESTAMPTZ  NOT NULL,
    revoked      BOOLEAN      NOT NULL DEFAULT FALSE,
    revoked_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token   ON refresh_tokens (token);
-- Partial index for valid (non-revoked, non-expired) tokens
CREATE INDEX idx_refresh_tokens_valid   ON refresh_tokens (user_id)
    WHERE revoked = FALSE AND expires_at > NOW();
```

### 2.3 `wallets`

```sql
CREATE TABLE wallets (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency         VARCHAR(10)    NOT NULL DEFAULT 'USD',
    balance          NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    locked_balance   NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, currency)
);

CREATE INDEX idx_wallets_user_id ON wallets (user_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2.4 `portfolio_assets`

```sql
CREATE TABLE portfolio_assets (
    id             UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol         VARCHAR(20)    NOT NULL,   -- e.g. 'BTC/USD'
    quantity       NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    avg_entry_price NUMERIC(20, 8) NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, symbol)
);

CREATE INDEX idx_portfolio_user_id ON portfolio_assets (user_id);
CREATE INDEX idx_portfolio_symbol  ON portfolio_assets (symbol);

CREATE TRIGGER portfolio_assets_updated_at
    BEFORE UPDATE ON portfolio_assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2.5 `trades`

```sql
CREATE TABLE trades (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID           NOT NULL REFERENCES users(id),
    symbol          VARCHAR(20)    NOT NULL,
    side            VARCHAR(4)     NOT NULL CHECK (side IN ('BUY', 'SELL')),
    quantity        NUMERIC(20, 8) NOT NULL CHECK (quantity > 0),
    price           NUMERIC(20, 8) NOT NULL CHECK (price > 0),
    total_cost      NUMERIC(20, 8) GENERATED ALWAYS AS (quantity * price) STORED,
    status          VARCHAR(20)    NOT NULL DEFAULT 'PENDING'
                    CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    idempotency_key VARCHAR(128)   UNIQUE,    -- prevents duplicate order submission
    executed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trades_user_id    ON trades (user_id);
CREATE INDEX idx_trades_symbol     ON trades (symbol);
CREATE INDEX idx_trades_status     ON trades (status);
CREATE INDEX idx_trades_created_at ON trades (created_at DESC);
-- Composite for user trade history queries
CREATE INDEX idx_trades_user_created ON trades (user_id, created_at DESC);

CREATE TRIGGER trades_updated_at
    BEFORE UPDATE ON trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2.6 `trade_history`

```sql
CREATE TABLE trade_history (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id     UUID        NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    from_status  VARCHAR(20) NOT NULL,
    to_status    VARCHAR(20) NOT NULL,
    reason       TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trade_history_trade_id ON trade_history (trade_id);
```

### 2.7 `market_ticks` (TimescaleDB Hypertable)

```sql
CREATE TABLE market_ticks (
    timestamp  TIMESTAMPTZ    NOT NULL,
    symbol     VARCHAR(20)    NOT NULL,
    price      NUMERIC(20, 8) NOT NULL,
    volume     NUMERIC(20, 8) NOT NULL DEFAULT 0,
    bid        NUMERIC(20, 8),
    ask        NUMERIC(20, 8),
    PRIMARY KEY (timestamp, symbol)
);

-- Convert to hypertable, partitioned by day
SELECT create_hypertable('market_ticks', 'timestamp',
    chunk_time_interval => INTERVAL '1 day');

-- Composite index for symbol + time range queries
CREATE INDEX idx_market_ticks_symbol_time
    ON market_ticks (symbol, timestamp DESC);

-- Enable compression after 7 days
ALTER TABLE market_ticks SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'symbol',
    timescaledb.compress_orderby = 'timestamp DESC'
);
SELECT add_compression_policy('market_ticks', INTERVAL '7 days');

-- Data retention: drop chunks older than 90 days
SELECT add_retention_policy('market_ticks', INTERVAL '90 days');
```

### 2.8 `market_ticks_1m` (Continuous Aggregate)

```sql
CREATE MATERIALIZED VIEW market_ticks_1m
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', timestamp) AS bucket,
    symbol,
    first(price, timestamp)   AS open,
    max(price)                AS high,
    min(price)                AS low,
    last(price, timestamp)    AS close,
    sum(volume)               AS volume,
    count(*)                  AS tick_count
FROM market_ticks
GROUP BY bucket, symbol
WITH NO DATA;

SELECT add_continuous_aggregate_policy('market_ticks_1m',
    start_offset  => INTERVAL '1 hour',
    end_offset    => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute');
```

### 2.9 `audit_logs` (TimescaleDB Hypertable)

```sql
CREATE TABLE audit_logs (
    timestamp   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    id          UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL,        -- NOT FK; user might be deleted
    action      VARCHAR(50)  NOT NULL,        -- e.g. TRADE_PLACED, DEPOSIT, WITHDRAW
    entity_type VARCHAR(50),                  -- e.g. TRADE, WALLET
    entity_id   UUID,
    details     JSONB,                        -- action-specific metadata
    ip_address  INET,
    PRIMARY KEY (timestamp, id)
);

SELECT create_hypertable('audit_logs', 'timestamp',
    chunk_time_interval => INTERVAL '1 month');

CREATE INDEX idx_audit_logs_user_time
    ON audit_logs (user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_action
    ON audit_logs (action, timestamp DESC);
CREATE INDEX idx_audit_logs_entity
    ON audit_logs (entity_type, entity_id, timestamp DESC);

-- Retain audit logs for 7 years (regulatory requirement)
-- No automatic retention policy; manual archival to cold storage after 2 years
```

### 2.10 `compliance_events` (TimescaleDB Hypertable)

```sql
CREATE TABLE compliance_events (
    timestamp     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    id            UUID         NOT NULL DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL,
    rule_id       VARCHAR(50)  NOT NULL,   -- e.g. LARGE_TRADE, RAPID_SUCCESSION
    trade_id      UUID,
    risk_score    NUMERIC(5,2),
    details       JSONB,
    resolved      BOOLEAN      NOT NULL DEFAULT FALSE,
    PRIMARY KEY (timestamp, id)
);

SELECT create_hypertable('compliance_events', 'timestamp',
    chunk_time_interval => INTERVAL '1 month');

CREATE INDEX idx_compliance_user_time
    ON compliance_events (user_id, timestamp DESC);
CREATE INDEX idx_compliance_unresolved
    ON compliance_events (resolved, timestamp DESC)
    WHERE resolved = FALSE;
```

### 2.11 `portfolio_summary` (Materialized View)

```sql
CREATE MATERIALIZED VIEW portfolio_summary AS
SELECT
    pa.user_id,
    pa.symbol,
    pa.quantity,
    pa.avg_entry_price,
    pa.quantity * pa.avg_entry_price AS cost_basis,
    pa.updated_at AS last_updated
FROM portfolio_assets pa
WHERE pa.quantity > 0;

CREATE UNIQUE INDEX idx_portfolio_summary_user_symbol
    ON portfolio_summary (user_id, symbol);

-- Refreshed by Kafka PortfolioProjectionConsumer after each trade execution
```

---

## 3. Flyway Migration Files

```
apps/backend/src/main/resources/db/migration/
├── V1__create_users_and_auth.sql
├── V2__create_wallets.sql
├── V3__create_portfolio_assets.sql
├── V4__create_trades.sql
├── V5__create_timescaledb_hypertables.sql
├── V6__create_continuous_aggregates.sql
├── V7__create_audit_logs.sql
├── V8__create_compliance_events.sql
├── V9__create_materialized_views.sql
└── V10__create_indexes_and_policies.sql
```

Each migration is:
- Forward-only (no automatic down migrations in production)
- Tested in CI against a fresh TimescaleDB container
- Reviewed for index safety (use `CREATE INDEX CONCURRENTLY` for production migrations)

---

## 4. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-05-27 | FinPulse Team | Initial DB schema |
| 1.1.0 | 2026-06-03 | FinPulse Team | Added refresh_tokens, trade_history, compliance_events, continuous aggregate, materialized view, Flyway file list, retention policies |
