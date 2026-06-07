# Master Test Plan — FinPulse
**Version:** 1.1.0 | **Last Updated:** 2026-06-03 | **Status:** Active

---

## 1. Introduction & Scope

This document defines the complete testing strategy for the FinPulse platform, covering all layers of the application stack: backend Spring Boot services, frontend React application, database integrity, WebSocket streaming, security, and end-to-end user journeys.

**In Scope:**
- Unit testing (backend services, frontend components, Zustand stores)
- Integration testing (Spring Boot with Testcontainers, API contract testing)
- End-to-End testing (Playwright, critical user journeys)
- Performance / Load testing (k6, 10,000 TPS target)
- Security testing (OWASP ZAP, dependency scanning)
- Database integrity testing (schema migrations, locking behavior)

**Out of Scope:**
- Real brokerage API testing
- Mobile native app testing (not yet in scope)

---

## 2. Test Environments

| Environment | Purpose | Refresh Cadence |
|-------------|---------|-----------------|
| `local` | Developer local testing via Docker Compose | On-demand |
| `ci` | GitHub Actions CI pipeline | Every push / PR |
| `staging` | Full Kubernetes replica of production | Every merge to `main` |
| `production` | Smoke tests only post-deployment | Post every release |

---

## 3. Testing Layers & Coverage Targets

### 3.1 Unit Testing

**Backend — Spring Boot (JUnit 5 + Mockito)**
- Target coverage: **≥ 85%** (line coverage, measured by JaCoCo)
- All `@Service` classes tested with mocked repositories
- All `@Component` Kafka consumers/producers tested in isolation
- Reactive streams tested with `StepVerifier`
- Password hashing, JWT generation, and role assignment logic covered 100%

**Frontend — React 19 (Vitest + React Testing Library)**
- Target coverage: **≥ 80%** (line coverage, measured by V8)
- All Zustand store actions tested in isolation
- All API service functions tested with `vi.mock()`
- All UI components tested for: render, user interaction, error states, loading states
- Accessible queries (`getByRole`, `getByLabelText`) used as primary selectors

### 3.2 Integration Testing

**Backend (Spring Boot + Testcontainers)**
- Spin up real PostgreSQL (TimescaleDB) and Kafka containers per test class via `@Testcontainers`
- Test repository layer: CRUD operations, pessimistic locking, hypertable inserts
- Test Kafka producer → consumer pipeline: event published → consumed → DB side-effect verified
- Test full HTTP request → service → DB round trip using `WebTestClient`

**Frontend (Vitest + MSW — Mock Service Worker)**
- API boundary mocked at network level using MSW handlers
- Component trees rendered together to test data-flow between components
- WebSocket mock tested for: connect, receive tick, reconnect on close

### 3.3 End-to-End Testing

Tool: **Playwright** (TypeScript)
Location: `f:\FinPulse\playwright\`

Critical journeys covered:
1. User Registration → Login → Dashboard renders with zeroed portfolio
2. Deposit funds → Wallet balance updates
3. Place BUY order → Wallet locked balance increases → Order appears in history
4. Place SELL order → Portfolio position decreases → Wallet balance released
5. Real-time market tick received → Dashboard portfolio value updates
6. Token expiry → Refresh token flow → Session maintained
7. Unauthorized access attempt → Redirected to login
8. Auditor role → Views audit log → Cannot access trade endpoints

See `docs/E2E_TESTS/e2e-test-cases.md` for detailed step-by-step test cases.

### 3.4 Performance Testing

Tool: **k6** (scripts in `tests/performance/`)

| Test Scenario | Target | Pass Criteria |
|---------------|--------|---------------|
| Trade endpoint throughput | 10,000 req/s | p99 latency < 50 ms, 0% error rate |
| WebSocket concurrent connections | 5,000 connections | No message drops, memory stable |
| Portfolio dashboard load | 500 concurrent users | Page TTI < 2 sec |
| Database locking contention | 200 concurrent wallets | No deadlocks, all transactions commit |

### 3.5 Security Testing

- **Dependency scanning:** `trivy` in CI pipeline on every Docker image build
- **SAST:** SpotBugs + Find Security Bugs on every backend build
- **DAST:** OWASP ZAP baseline scan against staging environment on every release
- **JWT tests:** Expired token, tampered signature, missing `Authorization` header all return 401
- **SQL injection:** All parameterized query paths fuzz-tested
- **RBAC tests:** Each role tested against endpoints it should and should not access

### 3.6 Database Testing

- Flyway migration scripts validated in CI against a fresh PostgreSQL + TimescaleDB container
- Pessimistic locking tested with 50 concurrent threads attempting to debit the same wallet
- Hypertable chunk creation and compression policy verified post-migration
- Rollback of each migration script verified manually before merging

---

## 4. Test Toolchain Summary

| Layer | Tool | Config Location |
|-------|------|----------------|
| Backend unit/integration | JUnit 5, Mockito, Testcontainers, StepVerifier | `apps/backend/src/test/` |
| Frontend unit/integration | Vitest, React Testing Library, MSW | `apps/frontend/src/test/` |
| E2E | Playwright | `playwright/` |
| Performance | k6 | `tests/performance/` |
| Security SAST | SpotBugs, Find Security Bugs | `.github/workflows/ci.yml` |
| Security DAST | OWASP ZAP | `.github/workflows/release.yml` |
| Coverage (backend) | JaCoCo → SonarQube | `apps/backend/pom.xml` |
| Coverage (frontend) | Vitest V8 provider | `apps/frontend/vitest.config.ts` |
| DB migrations | Flyway | `apps/backend/src/main/resources/db/migration/` |

---

## 5. Test Execution in CI/CD

```
Push / PR to any branch:
  ├── Backend unit tests (JUnit 5)       → must pass
  ├── Frontend unit tests (Vitest)       → must pass
  ├── Flyway migration validation        → must pass
  └── Code coverage gates               → backend ≥ 85%, frontend ≥ 80%

Merge to main:
  ├── All above +
  ├── Backend integration tests (Testcontainers)  → must pass
  ├── Playwright E2E against staging              → must pass
  └── trivy vulnerability scan                   → no CRITICAL findings

Release tag:
  ├── All above +
  ├── k6 performance smoke test (1,000 TPS, 60 sec)  → must pass
  └── OWASP ZAP DAST baseline scan                   → no HIGH/CRITICAL findings
```

---

## 6. Defect Management

| Severity | Definition | SLA to Fix |
|----------|-----------|-----------|
| P0 — Critical | Data loss, security breach, total outage | Same day |
| P1 — High | Core trade/wallet functionality broken | Within 24 hours |
| P2 — Medium | Non-critical feature broken, performance degraded | Within 1 sprint |
| P3 — Low | UI cosmetic issue, minor UX degradation | Backlog |

All defects tracked in GitHub Issues with labels: `bug`, `severity:P0/P1/P2/P3`, `component:backend/frontend/infra`.

---

## 7. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-05-27 | FinPulse Team | Initial master test plan |
| 1.1.0 | 2026-06-03 | FinPulse Team | Added performance/security/DB testing sections, CI gates, defect SLAs |
