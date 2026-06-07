# Schema Reference — FinPulse
**Version:** 1.1.0 | **Last Updated:** 2026-06-03

This is the concise quick-reference companion to `db_schema.md`. Use it for a fast column-level lookup during development and code review.

---

## Table: `users`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `username` | VARCHAR(50) | NO | — | UNIQUE |
| `email` | VARCHAR(255) | NO | — | UNIQUE |
| `password_hash` | VARCHAR(255) | NO | — | BCrypt cost=12 |
| `role` | VARCHAR(20) | NO | `ROLE_USER` | Enum: USER/ANALYST/AUDITOR/ADMIN |
| `kyc_status` | VARCHAR(20) | NO | `PENDING` | Enum: PENDING/APPROVED/REJECTED |
| `is_active` | BOOLEAN | NO | `TRUE` | |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Auto-updated by trigger |
| `deleted_at` | TIMESTAMPTZ | YES | NULL | Soft delete |

---

## Table: `refresh_tokens`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `user_id` | UUID | NO | — | FK → users.id |
| `token` | VARCHAR(512) | NO | — | UNIQUE |
| `expires_at` | TIMESTAMPTZ | NO | — | |
| `revoked` | BOOLEAN | NO | `FALSE` | |
| `revoked_at` | TIMESTAMPTZ | YES | NULL | |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | |

---

## Table: `wallets`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `user_id` | UUID | NO | — | FK → users.id |
| `currency` | VARCHAR(10) | NO | `USD` | |
| `balance` | NUMERIC(20,8) | NO | `0` | CHECK ≥ 0 |
| `locked_balance` | NUMERIC(20,8) | NO | `0` | CHECK ≥ 0; funds held in open orders |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Auto-updated |

**Derived field (application layer):** `available_balance = balance - locked_balance`

---

## Table: `portfolio_assets`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `user_id` | UUID | NO | — | FK → users.id |
| `symbol` | VARCHAR(20) | NO | — | e.g. `BTC/USD` |
| `quantity` | NUMERIC(20,8) | NO | `0` | CHECK ≥ 0 |
| `avg_entry_price` | NUMERIC(20,8) | NO | `0` | VWAP of all buys |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Auto-updated |

---

## Table: `trades`
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `user_id` | UUID | NO | — | FK → users.id |
| `symbol` | VARCHAR(20) | NO | — | |
| `side` | VARCHAR(4) | NO | — | `BUY` or `SELL` |
| `quantity` | NUMERIC(20,8) | NO | — | CHECK > 0 |
| `price` | NUMERIC(20,8) | NO | — | CHECK > 0 |
| `total_cost` | NUMERIC(20,8) | NO | — | GENERATED: quantity × price |
| `status` | VARCHAR(20) | NO | `PENDING` | PENDING/COMPLETED/FAILED/CANCELLED |
| `idempotency_key` | VARCHAR(128) | YES | NULL | UNIQUE; prevents duplicate submission |
| `executed_at` | TIMESTAMPTZ | YES | NULL | Set when status → COMPLETED |
| `created_at` | TIMESTAMPTZ | NO | `NOW()` | |
| `updated_at` | TIMESTAMPTZ | NO | `NOW()` | Auto-updated |

---

## Table: `trade_history`
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NO | PK |
| `trade_id` | UUID | NO | FK → trades.id |
| `from_status` | VARCHAR(20) | NO | Previous status |
| `to_status` | VARCHAR(20) | NO | New status |
| `reason` | TEXT | YES | Optional explanation |
| `created_at` | TIMESTAMPTZ | NO | |

---

## Hypertable: `market_ticks`
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `timestamp` | TIMESTAMPTZ | NO | PK (part 1); partition key |
| `symbol` | VARCHAR(20) | NO | PK (part 2) |
| `price` | NUMERIC(20,8) | NO | |
| `volume` | NUMERIC(20,8) | NO | Default 0 |
| `bid` | NUMERIC(20,8) | YES | |
| `ask` | NUMERIC(20,8) | YES | |

**Partitioning:** By day. Compression after 7 days. Retention: 90 days.

---

## Continuous Aggregate: `market_ticks_1m`
| Column | Type | Notes |
|--------|------|-------|
| `bucket` | TIMESTAMPTZ | 1-minute time bucket |
| `symbol` | VARCHAR(20) | |
| `open` | NUMERIC(20,8) | First price in bucket |
| `high` | NUMERIC(20,8) | |
| `low` | NUMERIC(20,8) | |
| `close` | NUMERIC(20,8) | Last price in bucket |
| `volume` | NUMERIC(20,8) | Sum of volume |
| `tick_count` | BIGINT | Number of raw ticks |

---

## Hypertable: `audit_logs`
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `timestamp` | TIMESTAMPTZ | NO | PK (part 1); partition key |
| `id` | UUID | NO | PK (part 2) |
| `user_id` | UUID | NO | No FK (user may be deleted) |
| `action` | VARCHAR(50) | NO | e.g. TRADE_PLACED, DEPOSIT, LOGIN |
| `entity_type` | VARCHAR(50) | YES | e.g. TRADE, WALLET |
| `entity_id` | UUID | YES | |
| `details` | JSONB | YES | Action-specific metadata |
| `ip_address` | INET | YES | |

**Partitioning:** By month. Retention: 7 years (manual archival after 2 years).

---

## Hypertable: `compliance_events`
| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `timestamp` | TIMESTAMPTZ | NO | PK (part 1) |
| `id` | UUID | NO | PK (part 2) |
| `user_id` | UUID | NO | |
| `rule_id` | VARCHAR(50) | NO | e.g. LARGE_TRADE, RAPID_SUCCESSION |
| `trade_id` | UUID | YES | |
| `risk_score` | NUMERIC(5,2) | YES | 0–100 |
| `details` | JSONB | YES | |
| `resolved` | BOOLEAN | NO | Default FALSE |

---

## Materialized View: `portfolio_summary`
| Column | Type | Notes |
|--------|------|-------|
| `user_id` | UUID | |
| `symbol` | VARCHAR(20) | |
| `quantity` | NUMERIC(20,8) | |
| `avg_entry_price` | NUMERIC(20,8) | |
| `cost_basis` | NUMERIC(20,8) | quantity × avg_entry_price |
| `last_updated` | TIMESTAMPTZ | |

**Refreshed by:** `PortfolioProjectionConsumer` after each `trade.events` Kafka message.

---

## Key Relationships Diagram

```
users ─────┬──── wallets (1:N, one per currency)
           ├──── portfolio_assets (1:N, one per symbol)
           ├──── trades (1:N)
           │         └── trade_history (1:N)
           └──── refresh_tokens (1:N)

audit_logs        (no FK; user_id by value for immutability)
compliance_events (no FK; references trade_id by value)
market_ticks      (no FK; independent time-series)
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-05-27 | FinPulse Team | Initial schema reference |
| 1.1.0 | 2026-06-03 | FinPulse Team | Added refresh_tokens, trade_history, compliance_events, materialized view, relationships diagram |
