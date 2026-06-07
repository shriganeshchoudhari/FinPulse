-- V1__init_schema.sql
-- Flyway Database Migration script for FinPulse

-- Enable necessary standard PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable TimescaleDB if available (ignore if already enabled or not installed in target env)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS timescaledb;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'TimescaleDB extension not available, continuing with standard PostgreSQL partitioning.';
END $$;

-- =========================================================================
-- 1. Identity & Access Control Tables
-- =========================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'ROLE_USER' CHECK (role IN ('ROLE_USER', 'ROLE_ANALYST', 'ROLE_AUDITOR', 'ROLE_ADMIN')),
    kyc_status VARCHAR(50) DEFAULT 'PENDING' CHECK (kyc_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(512) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens (token);

-- =========================================================================
-- 2. Wallet & Balance Ledger Tables
-- =========================================================================
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000 CHECK (balance >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolio_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    quantity NUMERIC(18, 8) NOT NULL CHECK (quantity >= 0),
    avg_price NUMERIC(18, 4) NOT NULL CHECK (avg_price >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_asset UNIQUE (user_id, symbol)
);

-- =========================================================================
-- 3. Trading & Ledger History Tables
-- =========================================================================
CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    quantity NUMERIC(18, 8) NOT NULL CHECK (quantity > 0),
    price NUMERIC(18, 4) NOT NULL CHECK (price > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trade_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 4. High-Frequency Market Streams & Time-Series
-- =========================================================================
CREATE TABLE IF NOT EXISTS market_ticks (
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    price NUMERIC(18, 4) NOT NULL CHECK (price > 0),
    volume NUMERIC(18, 4) NOT NULL CHECK (volume >= 0)
);

-- Convert to TimescaleDB Hypertable if TimescaleDB extension is loaded
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        PERFORM create_hypertable('market_ticks', 'timestamp', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);
    END IF;
END $$;

-- =========================================================================
-- 5. Immutable Audit Logs & Alerting
-- =========================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB NOT NULL
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        PERFORM create_hypertable('audit_logs', 'timestamp', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS compliance_events (
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    event_id UUID NOT NULL DEFAULT gen_random_uuid(),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    rule_id VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        PERFORM create_hypertable('compliance_events', 'timestamp', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 6. Views, Materialized Views, and Continuous Aggregates
-- =========================================================================

-- Materialized view for portfolio summary
CREATE MATERIALIZED VIEW IF NOT EXISTS portfolio_summary AS
SELECT
    pa.user_id,
    pa.symbol,
    pa.quantity,
    pa.avg_price AS avg_entry_price,
    pa.quantity * pa.avg_price AS cost_basis,
    pa.updated_at AS last_updated
FROM portfolio_assets pa
WHERE pa.quantity > 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_summary_user_symbol
    ON portfolio_summary (user_id, symbol);

-- Continuous aggregate or standard view for OHLCV candles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'market_ticks_1m') THEN
            EXECUTE 'CREATE MATERIALIZED VIEW market_ticks_1m WITH (timescaledb.continuous) AS
                     SELECT time_bucket(''1 minute'', timestamp) AS bucket,
                            symbol,
                            first(price, timestamp) AS open,
                            max(price) AS high,
                            min(price) AS low,
                            last(price, timestamp) AS close,
                            sum(volume) AS volume
                     FROM market_ticks
                     GROUP BY bucket, symbol WITH NO DATA;';
            PERFORM add_continuous_aggregate_policy('market_ticks_1m',
                start_offset => INTERVAL '1 hour',
                end_offset => INTERVAL '1 minute',
                schedule_interval => INTERVAL '1 minute');
        END IF;
    ELSE
        EXECUTE 'CREATE OR REPLACE VIEW market_ticks_1m AS
                 SELECT date_trunc(''minute'', timestamp) AS bucket,
                        symbol,
                        (array_agg(price ORDER BY timestamp))[1] AS open,
                        max(price) AS high,
                        min(price) AS low,
                        (array_agg(price ORDER BY timestamp DESC))[1] AS close,
                        sum(volume) AS volume
                 FROM market_ticks
                 GROUP BY date_trunc(''minute'', timestamp), symbol;';
    END IF;
END $$;

-- =========================================================================
-- 7. Advanced Performance Indexing & Protection Triggers
-- =========================================================================

-- Composite Index for Portfolio performance retrievals
CREATE INDEX IF NOT EXISTS idx_portfolio_user_symbol ON portfolio_assets(user_id, symbol);

-- Partial Index for high-frequency pending order matching
CREATE INDEX IF NOT EXISTS idx_trades_pending ON trades(created_at) WHERE status = 'PENDING';

-- Index for User history order lookups
CREATE INDEX IF NOT EXISTS idx_trades_user_history ON trades(user_id, created_at DESC);

-- Immutable Trigger to protect Audit Logs from updates and deletes
CREATE OR REPLACE FUNCTION block_audit_modifications()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit records are immutable and cannot be updated or deleted!';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_audit_updates
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION block_audit_modifications();
