CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL,
    balance DECIMAL(18,8) DEFAULT 0.0,
    locked_balance DECIMAL(18,8) DEFAULT 0.0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, currency)
);

CREATE TABLE trades (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(10) NOT NULL,
    order_type VARCHAR(20) NOT NULL,
    amount DECIMAL(18,8) NOT NULL,
    price DECIMAL(18,8),
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP
);

-- We would create TimescaleDB hypertable for market_ticks here
CREATE TABLE market_ticks (
    time TIMESTAMP NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    price DECIMAL(18,8) NOT NULL,
    volume DECIMAL(18,8) NOT NULL
);
-- SELECT create_hypertable('market_ticks', 'time');
