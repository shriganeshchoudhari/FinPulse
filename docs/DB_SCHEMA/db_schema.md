# Database Schema Specification

FinPulse uses PostgreSQL with the **TimescaleDB** extension enabled. 

---

## 1. High-Level Entity Relationship Diagram

```
 +-------------+        +-------------+        +-------------+
 |    users    |<------>|    roles    |        |   wallets   |
 +-------------+        +-------------+        +-------------+
        |                                             |
        v                                             v
 +------------------+                         +--------------+
 | portfolio_assets |                         |    trades    |
 +------------------+                         +--------------+
```

---

## 2. Table Specifications

### 2.1 Users & Roles (Identity Service)
```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    kyc_status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 Wallet & ACID Ledger Service
```sql
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000 CHECK (balance >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE portfolio_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    quantity NUMERIC(18, 8) NOT NULL CHECK (quantity >= 0),
    avg_price NUMERIC(18, 4) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_symbol UNIQUE(user_id, symbol)
);
```

### 2.3 Trades & Market Data (OLTP & Time-Series)
```sql
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    quantity NUMERIC(18, 8) NOT NULL,
    price NUMERIC(18, 4) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trade_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id UUID NOT NULL REFERENCES trades(id),
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Time-Series Table for Ticker Stream
CREATE TABLE market_ticks (
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    price NUMERIC(18, 4) NOT NULL,
    volume NUMERIC(18, 4) NOT NULL
);
SELECT create_hypertable('market_ticks', 'timestamp');
```

### 2.4 Audits & Alerts
```sql
-- Audit Hypertable for immutable logs
CREATE TABLE audit_logs (
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB NOT NULL
);
SELECT create_hypertable('audit_logs', 'timestamp');

CREATE TABLE compliance_events (
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    event_id UUID NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    rule_id VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL
);
SELECT create_hypertable('compliance_events', 'timestamp');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. High-Performance Indexing Strategy
To optimize high-concurrency read/write queries:
1. **Composite Index:** Designed for multi-asset queries.
   ```sql
   CREATE INDEX idx_portfolio_user_symbol ON portfolio_assets (user_id, symbol);
   ```
2. **Partial Index:** Optimizes filtering pending records in real-time execution loops.
   ```sql
   CREATE INDEX idx_trades_pending ON trades (created_at) WHERE status = 'PENDING';
   ```
3. **TimescaleDB Compression Policy:**
   ```sql
   ALTER TABLE market_ticks SET (timescaledb.compress, timescaledb.compress_segmentby = 'symbol');
   SELECT add_compression_policy('market_ticks', INTERVAL '7 days');
   ```
