# Product Requirements Document (PRD) — FinPulse
**Version:** 1.1.0 | **Last Updated:** 2026-06-03 | **Status:** Active

---

## 1. Executive Summary

FinPulse is an enterprise-grade, high-performance wealth management and high-frequency trade auditing platform. It enables users to track multi-asset portfolios (stocks, crypto, fiat), monitor real-time net worth fluctuations, execute simulated trades, configure automated trading triggers, and review immutable, regulation-compliant audit trails for every transaction.

The platform is purpose-built to demonstrate and validate advanced backend engineering: reactive programming, CQRS, event-driven architecture, ACID-compliant ledger management, and real-time WebSocket data streaming — all wrapped in a polished React 19 frontend.

---

## 2. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| High-throughput trade processing | Trade orders processed per second | ≥ 10,000 TPS (p99 < 50 ms) |
| UI responsiveness | Time-to-interactive on Dashboard | < 2 seconds |
| Compliance readiness | Audit log coverage of financial events | 100% |
| Security hardening | OWASP Top-10 coverage | Full coverage |
| System availability | Uptime SLA | 99.9% |

---

## 3. User Roles & Personas

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| `ROLE_USER` | Standard retail investor | Trade, view portfolio, deposit/withdraw |
| `ROLE_ANALYST` | Read-only financial analyst | View reports, market data, analytics |
| `ROLE_AUDITOR` | Compliance officer | Read-only access to all audit logs |
| `ROLE_ADMIN` | Platform administrator | Full access, user management, system config |

---

## 4. Core Functional Modules & User Stories

### Module 1: User Onboarding & Identity Access Management
**Description:** Secure RBAC authorization via Spring Security OAuth2/JWT with Redis-backed token revocation.

| Story ID | User Story | Acceptance Criteria |
|----------|-----------|---------------------|
| US-AUTH-01 | As a User, I want to register with username, email, and password so I can access the platform. | Registration creates a hashed-password user record, assigns `ROLE_USER`, and returns a valid JWT. |
| US-AUTH-02 | As a User, I want to log in so I can access my portfolio. | Successful login returns a signed JWT (RS256, 15-min expiry) and a refresh token in an HttpOnly cookie. |
| US-AUTH-03 | As a User, I want to log out so my session is securely terminated. | Logout adds the JWT to Redis blacklist; subsequent requests with that token are rejected 401. |
| US-AUTH-04 | As an Admin, I want to manage user roles so I can control platform access. | Admin can promote/demote users via `PATCH /api/v1/admin/users/{id}/role`. |
| US-KYC-01 | As a User, I want to complete a mock KYC flow so I can access trading features. | KYC status transitions from `PENDING` → `APPROVED`; unlocks trading endpoints. |

### Module 2: Wallet & ACID Ledger Service
**Description:** High-security double-entry bookkeeping with pessimistic locking to prevent double-spending.

| Story ID | User Story | Acceptance Criteria |
|----------|-----------|---------------------|
| US-WALLET-01 | As a User, I want to deposit USD into my virtual account to start buying assets. | Deposit increments `balance`, logs an `AUDIT_DEPOSIT` event, responds within 200 ms. |
| US-WALLET-02 | As a User, I want to see my available vs. locked balance to know how much I can trade. | Wallet endpoint returns `{ balance, lockedBalance, availableBalance, currency }`. |
| US-WALLET-03 | As the System, I want to block trades when a user has insufficient funds. | `POST /trades` with insufficient funds returns HTTP 400 and publishes no Kafka event. |
| US-WALLET-04 | As a User, I want to withdraw funds back to a simulated bank account. | Withdrawal debits balance, checks for minimum threshold, creates audit log. |

### Module 3: Market Data & Price Feed Simulation
**Description:** Background Spring `@Scheduled` service generates realistic price ticks and streams them via Kafka → WebSocket.

| Story ID | User Story | Acceptance Criteria |
|----------|-----------|---------------------|
| US-MARKET-01 | As a User, I want to see live price updates for assets on the dashboard. | WebSocket `/ws/market-data` emits ticks every 500 ms; UI chart updates without full re-render. |
| US-MARKET-02 | As a User, I want to view historical OHLCV candle data for any asset. | `GET /api/v1/market/{symbol}/history?range=1D` returns up to 1,440 data points from TimescaleDB. |
| US-MARKET-03 | As an Analyst, I want to filter assets by sector and performance. | Market overview page supports filtering, sorting, and pagination. |

### Module 4: Trade Execution Engine
**Description:** CQRS-architected trade service with Kafka-backed event sourcing and asynchronous fulfillment.

| Story ID | User Story | Acceptance Criteria |
|----------|-----------|---------------------|
| US-TRADE-01 | As a User, I want to place a BUY/SELL order so I can build my portfolio. | Order is accepted (HTTP 202), funds locked, event published to `trade.events` Kafka topic. |
| US-TRADE-02 | As a User, I want to see all my open and historical orders. | `GET /api/v1/trades/user/{id}` returns paginated results, newest first. |
| US-TRADE-03 | As a User, I want to set automated buy/sell triggers (limit orders). | System stores trigger rules; Market Data service evaluates them against each tick. |
| US-TRADE-04 | As a User, I want to be notified in real-time when my order is executed. | WebSocket `/ws/notifications` pushes a `TRADE_EXECUTED` event within 1 second of fulfillment. |

### Module 5: Compliance & Audit Trail
**Description:** Immutable, append-only audit log stored in a TimescaleDB hypertable; powers SOC2 compliance reporting.

| Story ID | User Story | Acceptance Criteria |
|----------|-----------|---------------------|
| US-AUDIT-01 | As an Auditor, I want to query all trade and wallet events for a user. | `GET /api/v1/audit/user/{id}` returns paginated audit log, sortable by timestamp. |
| US-AUDIT-02 | As the System, every financial mutation must be recorded. | Hibernate Envers revision table is populated for every `@Audited` entity change. |
| US-AUDIT-03 | As an Admin, I want compliance event reports exportable as CSV. | `GET /api/v1/audit/export?userId={id}&from={date}&to={date}` returns a CSV stream. |

### Module 6: Portfolio Analytics Dashboard
**Description:** Dynamic React dashboard showing net worth, P&L, allocation breakdowns, and performance charts.

| Story ID | User Story | Acceptance Criteria |
|----------|-----------|---------------------|
| US-ANALYTICS-01 | As a User, I want to see my total portfolio value in real-time. | Dashboard hero widget recalculates total value on every incoming market tick. |
| US-ANALYTICS-02 | As a User, I want to see my daily/weekly/monthly P&L. | P&L chart supports 1D, 1W, 1M, 1Y time ranges; data fetched from materialized view. |
| US-ANALYTICS-03 | As a User, I want to see my asset allocation breakdown as a pie chart. | Allocation chart re-renders when portfolio changes; uses `react-window` for performance. |

---

## 5. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Trade API p99 latency < 50 ms under 10,000 concurrent requests |
| **Scalability** | Kubernetes HPA scales backend pods from 2 → 20 based on CPU / Kafka consumer lag |
| **Security** | All endpoints JWT-protected; OWASP Top-10 mitigated; TLS 1.3 enforced at ingress |
| **Availability** | 99.9% uptime; hot PostgreSQL replica for failover; multi-zone Kubernetes deployment |
| **Observability** | Prometheus metrics + Grafana dashboards; structured JSON logging (Logback); distributed tracing (OpenTelemetry) |
| **Compliance** | SOC2-aligned audit trail; GDPR-compliant PII handling; immutable audit_logs hypertable |
| **Accessibility** | WCAG 2.1 AA compliance for all frontend UI components |

---

## 6. Out of Scope (v1.x)

- Real brokerage integration (Alpaca, Interactive Brokers)
- Mobile native applications (iOS / Android)
- Multi-currency fiat exchange / FX rates
- Machine-learning-based trade recommendations
- Two-factor authentication (2FA)

---

## 7. Dependencies & Integrations

| Dependency | Purpose | Version |
|------------|---------|---------|
| Apache Kafka | Async trade event streaming (CQRS write side) | 3.x |
| Redis | JWT token revocation blacklist, session cache | 7.x |
| TimescaleDB | Time-series market tick & audit log storage | 2.x (PostgreSQL 16) |
| Prometheus + Grafana | Metrics collection and visualization | Latest stable |
| ArgoCD | GitOps-based Kubernetes continuous deployment | 2.x |

---

## 8. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-05-27 | FinPulse Team | Initial PRD |
| 1.1.0 | 2026-06-03 | FinPulse Team | Added KYC module, analytics stories, NFR table, dependency matrix |
