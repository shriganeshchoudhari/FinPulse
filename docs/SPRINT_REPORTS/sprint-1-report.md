# Sprint Reports — FinPulse
**Directory Index** | **Last Updated:** 2026-06-03

---

## Sprint Summary Index

| Sprint | Date Range | Focus | Status |
|--------|-----------|-------|--------|
| [Sprint 1](./sprint-1-report.md) | 2026-05-13 → 2026-05-26 | Project scaffolding, Auth, CI/CD foundation | ✅ Complete |
| [Sprint 2](./sprint-2-report.md) | 2026-05-27 → 2026-06-09 | Wallet/Ledger, Trade Engine, Kafka integration | 🔄 In Progress |

---

# Sprint 1 Report
**Dates:** 2026-05-13 → 2026-05-26 | **Status:** ✅ Complete

## Goals
Establish the full project foundation: monorepo structure, CI/CD pipeline, authentication service, frontend scaffolding, database schema, and Kubernetes base manifests.

## Completed Stories

| Story ID | Description | Points | Status |
|----------|-------------|--------|--------|
| US-AUTH-01 | User registration with hashed password + JWT | 5 | ✅ Done |
| US-AUTH-02 | Login with JWT + refresh token | 5 | ✅ Done |
| US-AUTH-03 | Logout with Redis JWT blacklist | 3 | ✅ Done |
| US-KYC-01 | Mock KYC status flow (PENDING → APPROVED) | 2 | ✅ Done |
| INFRA-01 | Docker Compose local dev environment | 3 | ✅ Done |
| INFRA-02 | GitHub Actions CI pipeline (unit tests + coverage gate) | 3 | ✅ Done |
| DB-01 | Flyway migrations V1–V4 (users, wallets, portfolio, trades) | 3 | ✅ Done |
| FE-01 | React 19 + Vite + TypeScript project scaffold | 2 | ✅ Done |
| FE-02 | Zustand store setup (auth slice) | 2 | ✅ Done |
| FE-03 | Login / Register UI with form validation | 3 | ✅ Done |
| FE-04 | Protected route + JWT token management | 3 | ✅ Done |
| FE-05 | Sidebar navigation component | 2 | ✅ Done |

**Total points delivered:** 36 / 36 (100%)

## Key Technical Decisions
- Selected **RS256** (asymmetric) over HS256 for JWT to support future microservice token verification without sharing a secret.
- Selected **Zustand** over Redux Toolkit for simpler, boilerplate-free state management in a project of this scale.
- Used **Testcontainers** from day 1 to avoid test database drift between CI and local environments.

## Blockers & Resolutions
- **Blocker:** TimescaleDB `create_hypertable` not available in the standard PostgreSQL Docker image. **Resolution:** Switched to `timescale/timescaledb:latest-pg16` image in Docker Compose and Testcontainers config.

## Metrics
| Metric | Value |
|--------|-------|
| Backend unit test coverage | 87% |
| Frontend unit test coverage | 82% |
| CI pipeline duration | 4m 12s |
| Open bugs at sprint end | 0 P0/P1; 2 P3 |

---

# Sprint 2 Report
**Dates:** 2026-05-27 → 2026-06-09 | **Status:** 🔄 In Progress

## Goals
Implement the core financial engine: Wallet & Ledger Service (with pessimistic locking), Trade Execution Engine (CQRS + Kafka), Market Data Simulator, and real-time WebSocket streaming.

## Stories In Progress

| Story ID | Description | Points | Status |
|----------|-------------|--------|--------|
| US-WALLET-01 | Deposit endpoint + audit event | 3 | ✅ Done |
| US-WALLET-02 | Get wallet (balance + locked balance) | 2 | ✅ Done |
| US-WALLET-03 | Pessimistic lock → block trade on insufficient funds | 5 | ✅ Done |
| US-WALLET-04 | Withdraw endpoint | 3 | ✅ Done |
| US-TRADE-01 | BUY/SELL order placement (CQRS command) | 8 | ✅ Done |
| US-TRADE-02 | Order history query endpoint (CQRS read) | 3 | ✅ Done |
| US-MARKET-01 | Market Data Simulator (@Scheduled + Kafka) | 5 | 🔄 In Progress |
| US-MARKET-02 | WebSocket server (Spring reactive WebSocket) | 5 | 🔄 In Progress |
| US-MARKET-03 | TimescaleDB hypertable ingestion consumer | 3 | 📋 Not Started |
| FE-TRADE-01 | Trade panel UI (BUY/SELL form + order preview) | 5 | 🔄 In Progress |
| FE-WALLET-01 | Wallet panel UI (balance + deposit modal) | 3 | ✅ Done |
| FE-WS-01 | WebSocket hook + Zustand market tick integration | 5 | 📋 Not Started |
| DB-05 | TimescaleDB hypertable migrations V5–V8 | 3 | ✅ Done |
| INFRA-03 | Kubernetes base manifests (backend, frontend, HPA) | 5 | 🔄 In Progress |

**Total points:** 58 | **Completed:** 24 | **In Progress:** 20 | **Not Started:** 14

## Key Progress Notes
- Pessimistic locking implementation for `WalletService.lockAndDebit` tested with 50 concurrent threads — 0 overdraft violations.
- CQRS split clean: `TradeCommandService` writes to DB and publishes Kafka event; `TradeQueryService` reads from TimescaleDB views only.
- TimescaleDB Flyway migrations verified in CI against fresh container.

## Risks
- WebSocket reactive backpressure handling under high-tick volume needs load testing — scheduled for Sprint 3.
- Kafka consumer-group offset lag needs Grafana alerting rule before Sprint 3 goes live.

## Sprint 3 Preview
- Portfolio analytics dashboard (P&L chart, allocation pie)
- Audit log endpoints + compliance event consumer
- k6 performance testing suite
- ArgoCD GitOps pipeline setup
- OWASP ZAP integration in CI
