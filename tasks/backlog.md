# FinPulse Product Backlog

This backlog lists the long-term items and epics required to implement the complete wealth management and high-frequency trade auditing system.

## 📦 Epics & Stories

### Epic 1: Identity & Security (Auth Service)
- **[FIN-AUTH-1] OAuth2 Authentication & JWT Service**
  - **Priority:** High | **Estimate:** 5 SP
  - **Description:** Implement JWT authentication, RBAC, refresh token rotation, and invalidation using Redis.
- **[FIN-AUTH-2] KYC Onboarding & Verification Mock**
  - **Priority:** Medium | **Estimate:** 3 SP
  - **Description:** Basic user KYC registration status flag and state triggers.

### Epic 2: Transaction Ledger & Wallet Management (Ledger Service)
- **[FIN-WAL-1] Balance Management with Pessimistic Locking**
  - **Priority:** Critical | **Estimate:** 8 SP
  - **Description:** Maintain deposit, withdrawal, and portfolio asset allocations using ACID transactions with strict database-level writing locks to prevent double-spending.
- **[FIN-WAL-2] Hibernate Envers Auditing**
  - **Priority:** High | **Estimate:** 3 SP
  - **Description:** Track historical entity revisions for wallets and assets automatically on write.

### Epic 3: High-Frequency Market Simulation
- **[FIN-MKT-1] Ticker Event Stream**
  - **Priority:** High | **Estimate:** 5 SP
  - **Description:** Non-blocking generator emitting simulated crypto and stock ticks into Kafka topics (`market.ticker`).

### Epic 4: Trade Execution Core
- **[FIN-TRD-1] Kafka Trade Command Ingestion**
  - **Priority:** Critical | **Estimate:** 8 SP
  - **Description:** Ingest trade requests via Kafka, validate balance, lock wallet, write to DB, and emit final trade events.

### Epic 5: Reactive Reporting & Analytics
- **[FIN-ANL-1] Parallel P&L Calculation Engine**
  - **Priority:** High | **Estimate:** 8 SP
  - **Description:** Read aggregated TimescaleDB data and calculate multiple client portfolio returns concurrently.

### Epic 6: Real-Time UI & Alerting
- **[FIN-UI-1] Live Dashboard Visualization**
  - **Priority:** High | **Estimate:** 8 SP
  - **Description:** React dashboard utilizing WebSockets to feed real-time charts (ApexCharts/Recharts) and receive trade notifications.
