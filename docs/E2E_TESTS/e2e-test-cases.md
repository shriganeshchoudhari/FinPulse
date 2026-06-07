# End-to-End (E2E) Test Cases — FinPulse
**Version:** 1.1.0 | **Last Updated:** 2026-06-03 | **Tool:** Playwright (TypeScript)
**Location:** `f:\FinPulse\playwright\`

---

## 1. Test Environment & Setup

```typescript
// playwright.config.ts
baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173'
use:
  headless: true
  screenshot: 'only-on-failure'
  video: 'retain-on-failure'
  trace: 'on-first-retry'
```

All E2E tests use a dedicated test database seeded via `tests/e2e/fixtures/seed.sql` before each test suite.

---

## 2. Authentication Flows

### E2E-AUTH-01 — Successful User Registration
**Preconditions:** Email not already registered
```
1. Navigate to /login
2. Click "Create an account" toggle
3. Fill: username="e2euser", email="e2e@finpulse.dev", password="Test@1234"
4. Click "Register"
Expected:
  - Redirected to /dashboard
  - "Welcome, e2euser" visible
  - JWT token present in Zustand store (check via page.evaluate)
  - No console errors
```

### E2E-AUTH-02 — Successful Login
```
1. Navigate to /login
2. Fill: username="testuser", password="Test@1234"
3. Click "Sign In"
Expected:
  - Redirected to /dashboard
  - Sidebar displays "FinPulse" brand and all nav links
  - Authorization header sent in subsequent API calls (verified via network intercept)
```

### E2E-AUTH-03 — Invalid Credentials
```
1. Navigate to /login
2. Fill: username="testuser", password="WrongPassword"
3. Click "Sign In"
Expected:
  - Stays on /login page
  - Red error banner: "Invalid credentials"
  - No token in store
```

### E2E-AUTH-04 — Duplicate Registration
```
1. Navigate to /login
2. Toggle to "Register"
3. Fill email that already exists in DB
4. Click "Register"
Expected:
  - Error banner: "Email already registered"
  - No navigation away from /login
```

### E2E-AUTH-05 — Logout & Session Termination
```
1. Log in as testuser
2. Click "Logout" in sidebar
Expected:
  - Redirected to /login
  - All subsequent API calls with old token return 401
  - localStorage / cookie cleared
```

### E2E-AUTH-06 — Unauthenticated Access Redirect
```
1. Navigate directly to /dashboard without logging in
Expected:
  - Immediately redirected to /login
```

### E2E-AUTH-07 — Token Expiry & Refresh
```
1. Log in as testuser (JWT expires in 15 min)
2. Advance mock clock by 20 minutes (or stub token with exp in past)
3. Trigger any API call (e.g., open Wallet panel)
Expected:
  - Refresh token endpoint called automatically
  - New access token stored
  - Original API call retried and succeeds
  - User not redirected to login
```

---

## 3. Wallet Flows

### E2E-WALLET-01 — Deposit Funds
```
1. Log in as testuser (initial balance: $0.00)
2. Navigate to /wallet
3. Click "Deposit"
4. Enter amount: 1000.00
5. Click "Confirm Deposit"
Expected:
  - Success toast: "Deposit successful"
  - Total Balance updates to $1,000.00
  - Available Funds = $1,000.00
  - Locked in Orders = $0.00
```

### E2E-WALLET-02 — Available vs. Locked Balance After Order
```
1. Log in as testuser with $1,000.00 balance
2. Place a BUY limit order: BTC/USD, qty=0.01, price=$50,000 (cost=$500)
3. Navigate to /wallet
Expected:
  - Total Balance = $1,000.00 (unchanged)
  - Locked in Orders = $500.00
  - Available Funds = $500.00
```

### E2E-WALLET-03 — Withdraw Funds
```
1. Log in as testuser with $1,000.00 available balance
2. Navigate to /wallet
3. Click "Withdraw", enter $200.00
4. Confirm
Expected:
  - Available balance decreases to $800.00
  - Audit log entry created (verifiable in /audit page for ROLE_AUDITOR)
```

### E2E-WALLET-04 — Insufficient Funds Withdrawal
```
1. Attempt to withdraw $2,000 with only $500 available
Expected:
  - Error: "Insufficient available funds"
  - Balance unchanged
```

---

## 4. Trade Execution Flows

### E2E-TRADE-01 — Place BUY Order
```
1. Log in, deposit $5,000
2. Navigate to /trade
3. Select symbol: BTC/USD, side: BUY, qty: 0.05, price: $60,000
4. Click "Place Order"
Expected:
  - Success notification: "BUY order placed — PENDING"
  - Wallet: Locked in Orders increases by $3,000
  - Order History shows new BUY order with status PENDING
```

### E2E-TRADE-02 — Place SELL Order
```
1. Log in, seed portfolio with 1 BTC
2. Navigate to /trade
3. Select symbol: BTC/USD, side: SELL, qty: 0.5, price: $65,000
4. Click "Place Order"
Expected:
  - Order appears in history with status PENDING
  - Portfolio position for BTC decreases by 0.5 once order is processed
```

### E2E-TRADE-03 — BUY Order Rejected — Insufficient Funds
```
1. Log in with $100 balance
2. Attempt to buy 1 BTC at $60,000
Expected:
  - Error banner: "Insufficient funds"
  - No new entry in Order History
  - Wallet balance unchanged
```

### E2E-TRADE-04 — Duplicate Order (Idempotency)
```
1. Place BUY order with Idempotency-Key header (intercepted via page.route)
2. Re-send same request with same Idempotency-Key
Expected:
  - Only 1 order in Order History
  - Second request returns same response as first
```

### E2E-TRADE-05 — Real-Time Order Execution Notification
```
1. Log in, place BUY order
2. Backend simulator processes the trade (marks COMPLETE)
Expected:
  - WebSocket notification received within 2 seconds
  - Notification toast: "BUY BTC/USD order filled at $X"
  - Order status in history updates from PENDING → COMPLETED
```

---

## 5. Portfolio & Market Data Flows

### E2E-PORTFOLIO-01 — Portfolio Value Updates on Market Tick
```
1. Log in, seed portfolio: 1 BTC
2. Current BTC price: $60,000 → Portfolio value shows $60,000
3. WebSocket emits new tick: BTC/USD = $61,000
Expected:
  - Dashboard hero widget updates to $61,000 within 1 second
  - No full page re-render (only chart and value widget update)
```

### E2E-PORTFOLIO-02 — P&L Chart Renders & Filters
```
1. Log in with seeded historical trade data
2. Navigate to /dashboard → P&L chart visible
3. Click "1W" time-range filter
Expected:
  - Chart re-fetches 7-day data
  - Chart updates with new data points
  - No chart crash or blank render
```

### E2E-PORTFOLIO-03 — Asset Allocation Breakdown
```
1. Log in, seed portfolio with BTC, ETH, AAPL
2. Navigate to /dashboard → Allocation pie chart visible
Expected:
  - Pie chart shows 3 slices with correct percentages
  - Hovering a slice shows symbol and value tooltip
```

### E2E-MARKET-01 — Live Chart Updates
```
1. Navigate to /markets
2. Select BTC/USD chart
3. WebSocket emits 5 new ticks over 2.5 seconds
Expected:
  - Chart appends 5 new data points sequentially
  - No visual glitch or re-mount of chart component
```

---

## 6. Audit & Compliance Flows

### E2E-AUDIT-01 — Auditor Views Audit Log
```
1. Log in as user with ROLE_AUDITOR
2. Navigate to /audit
Expected:
  - Paginated table of audit events visible
  - Columns: timestamp, userId, action, details
  - No access to /trade or /wallet modification endpoints
```

### E2E-AUDIT-02 — Audit Event Created for Trade
```
1. Log in as ROLE_ADMIN, navigate to /audit
2. Place a trade as a regular user
Expected:
  - Within 3 seconds, new row in audit log: action=TRADE_PLACED
```

---

## 7. Accessibility & Cross-Browser

### E2E-A11Y-01 — Login Page Keyboard Navigation
```
1. Navigate to /login
2. Use Tab key to move through form fields and submit button
Expected:
  - All interactive elements reachable via Tab
  - Focus ring visible on all focused elements
  - Enter key submits form when submit button is focused
```

### E2E-A11Y-02 — ARIA Labels on Dynamic Content
```
1. Trigger loading state on Wallet panel
2. Inspect ARIA attributes
Expected:
  - Loading spinner has aria-label="Loading wallet data"
  - Error states have role="alert"
  - Charts have aria-label describing their content
```

### E2E-BROWSER-01 — Cross-Browser Compatibility
| Browser | Version | Pass Criteria |
|---------|---------|---------------|
| Chromium | Latest | All E2E tests pass |
| Firefox | Latest | All E2E tests pass |
| WebKit (Safari) | Latest | All E2E tests pass |

---

## 8. Running E2E Tests

```bash
# Install Playwright browsers (first time)
npx playwright install

# Run all E2E tests (headless)
npx playwright test

# Run with headed browser (debug mode)
npx playwright test --headed

# Run specific test file
npx playwright test playwright/auth.spec.ts

# View HTML test report
npx playwright show-report

# Run in CI mode
npx playwright test --reporter=github
```

---

## 9. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-05-27 | FinPulse Team | Initial E2E test cases |
| 1.1.0 | 2026-06-03 | FinPulse Team | Added wallet flows, token refresh, SELL order, idempotency, audit, accessibility, cross-browser tests |
