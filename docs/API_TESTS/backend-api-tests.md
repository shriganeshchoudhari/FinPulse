# Backend API Test Cases — FinPulse
**Version:** 1.1.0 | **Last Updated:** 2026-06-03 | **Tool:** JUnit 5 + Mockito + Testcontainers + WebTestClient

---

## 1. Authentication Service

### Unit Tests (`AuthServiceTest.java`)

| Test ID | Method Under Test | Setup | Assertion |
|---------|------------------|-------|-----------|
| UNIT-AUTH-01 | `register(RegisterRequest)` | Mock `userRepo.existsByEmail` returns false | User saved with BCrypt-hashed password; JWT returned |
| UNIT-AUTH-02 | `register(RegisterRequest)` | Mock `userRepo.existsByEmail` returns true | Throws `UserAlreadyExistsException` |
| UNIT-AUTH-03 | `login(LoginRequest)` | Mock user found; BCrypt matches | Returns `AuthResponse` with valid JWT |
| UNIT-AUTH-04 | `login(LoginRequest)` | Mock user found; BCrypt fails | Throws `BadCredentialsException` |
| UNIT-AUTH-05 | `logout(jti, expiresAt)` | Mock Redis set | Adds `blacklist:{jti}` key to Redis with correct TTL |
| UNIT-AUTH-06 | JWT token structure | Call `generateToken(user)` | Token contains correct `sub`, `roles`, `exp` claims |
| UNIT-AUTH-07 | `refreshToken(refreshToken)` | Valid refresh token in DB | Returns new access JWT; old refresh token invalidated |
| UNIT-AUTH-08 | `refreshToken(refreshToken)` | Expired refresh token | Throws `RefreshTokenExpiredException` |

### Integration Tests (`AuthControllerIntegrationTest.java`) — Testcontainers

| Test ID | Endpoint | Request | Expected Response |
|---------|----------|---------|-------------------|
| INT-AUTH-01 | `POST /api/v1/auth/register` | Valid `{ username, email, password }` | HTTP 201; body contains `token`; user row inserted in DB |
| INT-AUTH-02 | `POST /api/v1/auth/register` | Duplicate email | HTTP 400 `{ error: "Email already registered" }` |
| INT-AUTH-03 | `POST /api/v1/auth/register` | Missing `password` field | HTTP 400 validation error; no DB record created |
| INT-AUTH-04 | `POST /api/v1/auth/login` | Valid credentials | HTTP 200; valid JWT; `Set-Cookie: refreshToken` header present |
| INT-AUTH-05 | `POST /api/v1/auth/login` | Wrong password | HTTP 401 `{ error: "Invalid credentials" }` |
| INT-AUTH-06 | `POST /api/v1/auth/logout` | Valid Bearer token | HTTP 204; token JTI added to Redis blacklist |
| INT-AUTH-07 | Any protected endpoint | JWT from step INT-AUTH-06 | HTTP 401 after logout |
| INT-AUTH-08 | `POST /api/v1/auth/refresh` | Valid refresh token cookie | HTTP 200; new access token returned |

---

## 2. Wallet & Ledger Service

### Unit Tests (`WalletServiceTest.java`)

| Test ID | Method Under Test | Setup | Assertion |
|---------|------------------|-------|-----------|
| UNIT-WALLET-01 | `lockAndDebit(userId, amount, currency)` | Wallet with $1,000 balance | Balance reduced; `lockedBalance` increased by amount |
| UNIT-WALLET-02 | `lockAndDebit(userId, amount, currency)` | Wallet with $50; amount = $100 | Throws `InsufficientFundsException`; no DB write |
| UNIT-WALLET-03 | `releaseAndCredit(userId, amount, currency)` | Wallet with $200 locked | `lockedBalance` reduced; `balance` restored |
| UNIT-WALLET-04 | `deposit(userId, amount)` | Valid amount | Balance incremented; audit event published to Kafka |
| UNIT-WALLET-05 | `deposit(userId, amount)` | Negative amount | Throws `InvalidAmountException` |
| UNIT-WALLET-06 | `withdraw(userId, amount)` | Available balance sufficient | Balance decremented; audit event published |
| UNIT-WALLET-07 | Concurrent debit simulation | 50 threads → same wallet | No overdraft; all successful debits atomic; `InsufficientFundsException` for failures |

### Integration Tests (`WalletControllerIntegrationTest.java`)

| Test ID | Endpoint | Request | Expected Response |
|---------|----------|---------|-------------------|
| INT-WALLET-01 | `GET /api/v1/wallets/user/{userId}/USD` | Authenticated request by wallet owner | HTTP 200; `{ balance, lockedBalance, availableBalance, currency }` |
| INT-WALLET-02 | `GET /api/v1/wallets/user/{userId}/USD` | Authenticated as different user | HTTP 403 Forbidden |
| INT-WALLET-03 | `GET /api/v1/wallets/user/{userId}/USD` | No Authorization header | HTTP 401 Unauthorized |
| INT-WALLET-04 | `POST /api/v1/wallets/deposit` | `{ amount: 500.00, currency: "USD" }` | HTTP 200; `balance` increases by 500.00; `audit_logs` row inserted |
| INT-WALLET-05 | `POST /api/v1/wallets/deposit` | `{ amount: -100.00 }` | HTTP 400 validation error |
| INT-WALLET-06 | `POST /api/v1/wallets/withdraw` | Amount > available balance | HTTP 400 `{ error: "Insufficient funds" }` |

---

## 3. Trade Execution Engine

### Unit Tests (`TradeCommandServiceTest.java`)

| Test ID | Method Under Test | Setup | Assertion |
|---------|------------------|-------|-----------|
| UNIT-TRADE-01 | `processTradeCommand(BUY, BTC, 0.1, 60000)` | Wallet with $10,000 | Trade saved as `PENDING`; wallet debited $6,000; Kafka event published |
| UNIT-TRADE-02 | `processTradeCommand(BUY, BTC, 10, 60000)` | Wallet with $100 | Throws `InsufficientFundsException`; no Kafka event; no DB write |
| UNIT-TRADE-03 | `processTradeCommand(SELL, BTC, 1, 60000)` | Portfolio with 0.5 BTC | Throws `InsufficientHoldingsException` |
| UNIT-TRADE-04 | `processTradeCommand(SELL, BTC, 0.1, 60000)` | Portfolio with 1 BTC | Trade saved as `PENDING`; Kafka event published |
| UNIT-TRADE-05 | Idempotency key check | Same `Idempotency-Key` sent twice | Second call returns cached response; no duplicate DB row |

### Integration Tests (`TradeControllerIntegrationTest.java`)

| Test ID | Endpoint | Request | Expected Response |
|---------|----------|---------|-------------------|
| INT-TRADE-01 | `POST /api/v1/trades` | Valid BUY order, sufficient funds | HTTP 202; `{ id, status: "PENDING" }`; Kafka event verified via consumer |
| INT-TRADE-02 | `POST /api/v1/trades` | BUY order, insufficient funds | HTTP 400 `{ error: "Insufficient funds" }`; no Kafka event |
| INT-TRADE-03 | `POST /api/v1/trades` | Missing `symbol` field | HTTP 400 validation error |
| INT-TRADE-04 | `POST /api/v1/trades` | Unauthenticated | HTTP 401 |
| INT-TRADE-05 | `GET /api/v1/trades/user/{userId}` | Authenticated owner; page=0&size=10 | HTTP 200; array of up to 10 trades, newest first |
| INT-TRADE-06 | `GET /api/v1/trades/user/{userId}` | Authenticated as different user | HTTP 403 |
| INT-TRADE-07 | `GET /api/v1/trades/{tradeId}` | Valid trade ID owned by requester | HTTP 200; full trade details |
| INT-TRADE-08 | `GET /api/v1/trades/{tradeId}` | Trade owned by different user | HTTP 403 |
| INT-TRADE-09 | `POST /api/v1/trades` | Duplicate `Idempotency-Key` header | HTTP 200; same trade response returned; no duplicate in DB |

---

## 4. Market Data Endpoints

### Unit Tests (`MarketDataServiceTest.java`)

| Test ID | Method Under Test | Setup | Assertion |
|---------|------------------|-------|-----------|
| UNIT-MARKET-01 | `getHistory(symbol, range="1D")` | 1,440 ticks seeded in TimescaleDB | Returns correct number of OHLCV data points |
| UNIT-MARKET-02 | `getHistory(symbol, range="1W")` | 7 days of ticks | Returns 7 × 1,440 = 10,080 data points (or minute buckets) |
| UNIT-MARKET-03 | `getSymbolList()` | 12 symbols configured | Returns list of all 12 supported symbols |
| UNIT-MARKET-04 | `getLatestPrice(symbol)` | Redis cache hit | Returns cached price without querying DB |
| UNIT-MARKET-05 | `getLatestPrice(symbol)` | Redis cache miss | Queries DB last tick; populates cache |

### Integration Tests

| Test ID | Endpoint | Request | Expected Response |
|---------|----------|---------|-------------------|
| INT-MARKET-01 | `GET /api/v1/market/BTC-USD/history?range=1D` | Authenticated | HTTP 200; array of OHLCV objects with `bucket, open, high, low, close, volume` |
| INT-MARKET-02 | `GET /api/v1/market/INVALID/history` | Authenticated | HTTP 404 `{ error: "Symbol not found" }` |
| INT-MARKET-03 | `GET /api/v1/market/symbols` | Authenticated | HTTP 200; array of supported symbol strings |

---

## 5. Audit & Compliance Endpoints

### Integration Tests

| Test ID | Endpoint | Request | Expected Response |
|---------|----------|---------|-------------------|
| INT-AUDIT-01 | `GET /api/v1/audit/user/{userId}` | `ROLE_AUDITOR` or `ROLE_ADMIN` token | HTTP 200; paginated audit log entries |
| INT-AUDIT-02 | `GET /api/v1/audit/user/{userId}` | `ROLE_USER` token | HTTP 403 Forbidden |
| INT-AUDIT-03 | `GET /api/v1/audit/user/{userId}?from=2026-01-01&to=2026-06-01` | Auditor token | HTTP 200; filtered to date range |
| INT-AUDIT-04 | `GET /api/v1/audit/export?userId={id}&from={d}&to={d}` | Admin token | HTTP 200; `Content-Type: text/csv`; CSV rows for each audit event |
| INT-AUDIT-05 | Trade execution | Valid trade placed | Kafka consumer inserts `audit_logs` row with `action=TRADE_PLACED` within 2 seconds |

---

## 6. WebSocket Tests

### Unit Tests (`MarketDataWebSocketHandlerTest.java`)

| Test ID | Description | Assertion |
|---------|-------------|-----------|
| WS-UNIT-01 | `emit(tick)` pushes to Sinks.Many | Flux emits the tick to all subscribers |
| WS-UNIT-02 | `handle(session)` subscribes session to tick Flux | Session sends message for each emitted tick |
| WS-UNIT-03 | Null tick emission is skipped | No NPE; no empty message sent to client |

### Integration Tests (`WebSocketIntegrationTest.java`)

| Test ID | Description | Assertion |
|---------|-------------|-----------|
| WS-INT-01 | Client connects to `/ws/market-data` with valid JWT | Connection established; HTTP 101 Switching Protocols |
| WS-INT-02 | Client connects without JWT | Connection rejected; HTTP 401 |
| WS-INT-03 | Market simulator emits tick → client receives within 1 second | Tick arrives at client; JSON deserializes to `MarketTick` |
| WS-INT-04 | 100 concurrent WebSocket clients receive the same tick | All 100 clients receive the tick; no message drops |

---

## 7. Security Tests

| Test ID | Scenario | Expected |
|---------|----------|----------|
| SEC-01 | All `/api/v1/**` endpoints without `Authorization` header | HTTP 401 for all |
| SEC-02 | `ROLE_USER` accessing `GET /api/v1/audit/**` | HTTP 403 |
| SEC-03 | `ROLE_ANALYST` accessing `POST /api/v1/trades` | HTTP 403 |
| SEC-04 | Tampered JWT signature | HTTP 401 |
| SEC-05 | Expired JWT (exp in past) | HTTP 401 |
| SEC-06 | JWT in Redis blacklist (post-logout) | HTTP 401 |
| SEC-07 | SQL injection attempt in `symbol` param | HTTP 400; no DB error; parameterized query safe |
| SEC-08 | `ROLE_USER` accessing another user's wallet | HTTP 403 |

---

## 8. Running Tests

```bash
cd apps/backend

# Run all unit tests
./mvnw test

# Run integration tests (requires Docker for Testcontainers)
./mvnw verify -P integration-tests

# Run a specific test class
./mvnw test -Dtest=TradeCommandServiceTest

# Generate JaCoCo coverage report
./mvnw verify jacoco:report
# Report at: target/site/jacoco/index.html
```

---

## 9. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-05-27 | FinPulse Team | Initial backend API tests |
| 1.1.0 | 2026-06-03 | FinPulse Team | Added audit endpoints, WebSocket, security, idempotency, and market data test cases |
