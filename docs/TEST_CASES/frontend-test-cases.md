# Frontend Unit & Integration Test Cases — FinPulse
**Version:** 1.1.0 | **Last Updated:** 2026-06-03 | **Tool:** Vitest + React Testing Library

---

## 1. State Management — `useStore.test.ts`

### 1.1 Auth Slice

| Test ID | Description | Assertion |
|---------|-------------|-----------|
| STORE-AUTH-01 | `setToken(token)` stores token in Zustand state | `useStore.getState().token === token` |
| STORE-AUTH-02 | `setToken(null)` clears token on logout | `useStore.getState().token === null` |
| STORE-AUTH-03 | `setUserId(id)` stores user ID in state | `useStore.getState().userId === id` |
| STORE-AUTH-04 | `setUserId(null)` clears user ID on logout | `useStore.getState().userId === null` |

### 1.2 Market Data Slice

| Test ID | Description | Assertion |
|---------|-------------|-----------|
| STORE-MARKET-01 | `addMarketTick(tick)` appends tick to `marketTicks[symbol]` history | Array length increases by 1 |
| STORE-MARKET-02 | `addMarketTick` updates `latestPrices[symbol]` with the newest price | `latestPrices['BTC/USD'] === tick.price` |
| STORE-MARKET-03 | `marketTicks[symbol]` history is capped at 100 items for performance | Array never exceeds length 100 |
| STORE-MARKET-04 | Ticks for different symbols are stored independently | `BTC/USD` and `ETH/USD` arrays are separate |

### 1.3 Portfolio Slice

| Test ID | Description | Assertion |
|---------|-------------|-----------|
| STORE-PORT-01 | `setPortfolio(assets)` replaces portfolio array in state | State equals new array |
| STORE-PORT-02 | `setPortfolio([])` correctly clears portfolio | `portfolio.length === 0` |
| STORE-PORT-03 | `addNotification(n)` prepends to notifications array | First element is newest notification |
| STORE-PORT-04 | Notifications array is capped at 50 items | `notifications.length <= 50` |

---

## 2. API Services — `api.test.ts`

### 2.1 Auth Service

| Test ID | Description | Assertion |
|---------|-------------|-----------|
| API-AUTH-01 | `authService.login({username, password})` calls `POST /api/v1/auth/login` with correct body | Axios called with correct URL and payload |
| API-AUTH-02 | `authService.register({username, email, password})` calls `POST /api/v1/auth/register` | Axios called with all three fields |
| API-AUTH-03 | `authService.login` returns `{ token }` on success | Promise resolves with token string |
| API-AUTH-04 | `authService.login` throws an error with status 401 on bad credentials | Promise rejects with AxiosError status 401 |
| API-AUTH-05 | `authService.logout()` calls `POST /api/v1/auth/logout` with Authorization header | Correct header present |

### 2.2 Trade Service

| Test ID | Description | Assertion |
|---------|-------------|-----------|
| API-TRADE-01 | `tradeService.placeOrder(order)` calls `POST /api/v1/trades` with correct payload | Correct HTTP method, URL, and body |
| API-TRADE-02 | `tradeService.getUserTrades(userId, page)` calls `GET /api/v1/trades/user/{id}?page={n}` | Query params correctly appended |
| API-TRADE-03 | Requests include `Authorization: Bearer <token>` from Zustand store | Axios interceptor attaches token |
| API-TRADE-04 | `tradeService.placeOrder` with insufficient funds resolves with error response 400 | Handles 400 without uncaught error |

### 2.3 Wallet Service

| Test ID | Description | Assertion |
|---------|-------------|-----------|
| API-WALLET-01 | `walletService.getWallet(userId)` calls `GET /api/v1/wallets/user/{id}/USD` | Correct URL constructed |
| API-WALLET-02 | `walletService.deposit(amount)` calls `POST /api/v1/wallets/deposit` | Correct body `{ amount, currency: 'USD' }` |
| API-WALLET-03 | Wallet response is correctly mapped to `WalletDto` type | `balance`, `lockedBalance`, `currency` fields present |

---

## 3. UI Components

### 3.1 `LoginPanel.test.tsx`

| Test ID | Description | Assertion |
|---------|-------------|-----------|
| UI-LOGIN-01 | Renders login form by default | Username and Password inputs visible; no Email input |
| UI-LOGIN-02 | Toggle to "Register" mode shows Email field | Email input appears; form title changes to "Register" |
| UI-LOGIN-03 | Submitting login calls `authService.login` with form values | `vi.mock` captures correct `{ username, password }` |
| UI-LOGIN-04 | Shows "Processing..." state while login is pending | Button disabled with loading text during async call |
| UI-LOGIN-05 | Displays red error banner on 401 response | `getByRole('alert')` shows "Invalid credentials" |
| UI-LOGIN-06 | Successful login stores token and navigates to `/dashboard` | `useStore.getState().token` is set; `navigate` called with `/dashboard` |
| UI-LOGIN-07 | Password field is of type `password` (masked) | `input[type="password"]` present in DOM |
| UI-LOGIN-08 | All inputs have associated `<label>` elements (a11y) | `getByLabelText('Username')`, `getByLabelText('Password')` work |
| UI-LOGIN-09 | Form disables submit button when fields are empty | Button `disabled` attribute present when inputs are blank |

### 3.2 `Sidebar.test.tsx`

| Test ID | Description | Assertion |
|---------|-------------|-----------|
| UI-SIDEBAR-01 | Renders "FinPulse" brand name | `getByText('FinPulse')` present |
| UI-SIDEBAR-02 | Renders all navigation links | Dashboard, Markets, Trade, Wallet, Settings links visible |
| UI-SIDEBAR-03 | Active route link has active class/styling | Link for current route has `aria-current="page"` |
| UI-SIDEBAR-04 | Logout button calls `authService.logout` and clears store | Token set to null, navigate to `/login` |
| UI-SIDEBAR-05 | Sidebar is not rendered when user is not authenticated | Null/hidden when `token === null` |

### 3.3 `WalletPanel.test.tsx`

| Test ID | Description | Assertion |
|---------|-------------|-----------|
| UI-WALLET-01 | Shows loading skeleton on initial render | Loading indicator visible before data arrives |
| UI-WALLET-02 | Renders zeroed balances before API responds | "$0.00" displayed for all balance fields |
| UI-WALLET-03 | Fetches wallet data and renders total balance | `walletService.getWallet` called; balance formatted as "$1,000.00" |
| UI-WALLET-04 | Renders locked vs. available balance separately | Both "Locked in Orders" and "Available Funds" widgets render |
| UI-WALLET-05 | Deposit button opens deposit modal | Clicking "Deposit" renders modal with amount input |
| UI-WALLET-06 | Submitting deposit calls `walletService.deposit` | Mock called with entered amount |
| UI-WALLET-07 | Shows error state when wallet fetch fails | Error message displayed; retry button present |

### 3.4 `TradePanel.test.tsx`

| Test ID | Description | Assertion |
|---------|-------------|-----------|
| UI-TRADE-01 | Renders BUY/SELL toggle, symbol selector, quantity and price inputs | All form elements visible |
| UI-TRADE-02 | Switching to SELL mode updates button colour (red) | Correct style class applied |
| UI-TRADE-03 | Order cost preview updates as quantity/price inputs change | "Estimated Cost: $X" recalculates on change |
| UI-TRADE-04 | Submit calls `tradeService.placeOrder` with correct payload | Mock captures `{ symbol, side, quantity, price }` |
| UI-TRADE-05 | Insufficient funds warning shown when order cost > available balance | Warning text rendered; submit button disabled |
| UI-TRADE-06 | Success toast notification shown after successful order | Toast with "Order Placed" appears after API resolves |

### 3.5 `MarketChart.test.tsx`

| Test ID | Description | Assertion |
|---------|-------------|-----------|
| UI-CHART-01 | Renders chart with initial data points from store | Recharts `<LineChart>` rendered with seed data |
| UI-CHART-02 | Adding market tick via Zustand updates chart data | New data point appended to chart; `useMemo` recalculates |
| UI-CHART-03 | Time-range selector (1D / 1W / 1M / 1Y) triggers API fetch | Correct `?range=` param sent on tab change |
| UI-CHART-04 | Chart renders empty state when no data available | "No data available" placeholder visible |

### 3.6 `DashboardPage.test.tsx`

| Test ID | Description | Assertion |
|---------|-------------|-----------|
| UI-DASH-01 | Redirects unauthenticated user to `/login` | `navigate('/login')` called when `token === null` |
| UI-DASH-02 | Portfolio total value calculated from positions × latest prices | `useMemo` output matches expected sum |
| UI-DASH-03 | Portfolio value recalculates on new market tick | Total updates without full re-render (memoization verified) |
| UI-DASH-04 | Order history table renders paginated results | First page of trades rendered; "Next" button navigates to page 2 |

---

## 4. WebSocket Hook — `useMarketWebSocket.test.ts`

| Test ID | Description | Assertion |
|---------|-------------|-----------|
| WS-01 | Hook establishes WebSocket connection on mount | `WebSocket` constructor called with correct WSS URL |
| WS-02 | Incoming message dispatches `addMarketTick` to Zustand | Store tick history updated on `onmessage` |
| WS-03 | Reconnection attempted after `onclose` event (exponential backoff) | `WebSocket` constructor called again after 2000 ms |
| WS-04 | Hook disconnects WebSocket on component unmount | `ws.close()` called in cleanup function |
| WS-05 | Malformed JSON in message is caught without crashing | Error logged; store state unchanged |

---

## 5. Testing Standards & Conventions

- All state-mutating operations must be wrapped in `act(...)` or awaited via `waitFor()`
- API calls must be mocked with `vi.mock()` — no real network requests in unit tests
- DOM queries use accessible selectors: `getByRole`, `getByLabelText`, `getByText` (in that priority order)
- Each test file must clean up: `vi.clearAllMocks()` in `afterEach`; Zustand store reset in `beforeEach`
- Snapshot tests are discouraged — prefer explicit assertions
- Test file naming: `ComponentName.test.tsx` co-located next to component, or in `src/test/`

---

## 6. Running Tests

```bash
# Run all frontend tests once
cd apps/frontend
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run a specific test file
npx vitest run src/test/components/LoginPanel.test.tsx
```

---

## 7. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-05-27 | FinPulse Team | Initial frontend test cases |
| 1.1.0 | 2026-06-03 | FinPulse Team | Added TradePanel, MarketChart, Dashboard, WebSocket hook test cases; expanded coverage for all existing panels |
