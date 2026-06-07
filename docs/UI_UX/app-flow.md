# App Flow — FinPulse
**Version:** 1.0.0 | **Last Updated:** 2026-06-06 | **Status:** Active
**Location:** `docs/UI_UX/app-flow.md`

---

## 1. Overview

This document maps every user-facing flow in the FinPulse platform — from first visit to advanced trading and compliance. Each flow describes the page sequence, state changes, API calls made, and edge cases handled.

---

## 2. Application Entry Points

```
Browser hits finpulse.dev
        │
        ├── Has valid JWT in Zustand (persisted via sessionStorage)?
        │       │
        │       YES → Validate token expiry client-side
        │               │
        │               ├── Token still valid → Navigate to /dashboard
        │               └── Token expired → Attempt silent refresh (POST /auth/refresh)
        │                           │
        │                           ├── Refresh success → /dashboard
        │                           └── Refresh failed  → /login (clear store)
        │
        └── No JWT → Navigate to /login
```

---

## 3. Authentication Flows

### 3.1 Registration Flow

```
/login (Register tab)
│
├── User fills: Username, Email, Password
├── Client-side validation:
│       • Username 3–50 chars
│       • Valid email format
│       • Password ≥ 8 chars, uppercase + digit + special char
│       • Submit button disabled until all pass
│
├── POST /api/v1/auth/register
│       │
│       ├── 201 Created ──────────────────────────────────────────────────┐
│       │       • Store accessToken + userId in Zustand                   │
│       │       • refreshToken set in HttpOnly cookie by server           │
│       │       • Navigate to /dashboard                                  │
│       │       • Dashboard triggers: GET /wallets, GET /portfolio         │
│       │                                                                  │
│       └── 400 Bad Request                                               │
│               • "Email already registered" → show inline error          │
│               • Validation errors → highlight failing fields            │
│                                                                          ▼
│                                                                   /dashboard (fresh, zeroed)
│
└── Toggle "Already have an account?" → Switch to Login tab
```

### 3.2 Login Flow

```
/login (Login tab — default)
│
├── User fills: Username, Password
├── Submit button enabled when both fields non-empty
│
├── POST /api/v1/auth/login
│       │
│       ├── 200 OK
│       │       • Store { accessToken, userId, roles } in Zustand
│       │       • refreshToken HttpOnly cookie set by server
│       │       • Navigate to /dashboard
│       │       • Axios interceptor attached: adds Authorization header to all future requests
│       │
│       ├── 401 Unauthorized
│       │       • Show red banner: "Invalid credentials"
│       │       • Clear password field; focus returns to password input
│       │       • No navigation
│       │
│       └── 429 Too Many Requests
│               • Show: "Too many login attempts. Please wait 60 seconds."
│               • Disable submit button for 60 seconds
│
└── Toggle "Create an account" → Switch to Register tab
```

### 3.3 Token Refresh Flow (Silent, Background)

```
Axios Response Interceptor (fires on every 401 response)
│
├── Is this already a /auth/refresh call? → YES → Clear store → /login (prevent loop)
│
└── NO → POST /api/v1/auth/refresh (sends refreshToken cookie automatically)
            │
            ├── 200 OK
            │       • Store new accessToken in Zustand
            │       • Retry original failed request with new token
            │       • User never sees any interruption
            │
            └── 401 / cookie missing / expired
                    • Clear Zustand store (token, userId, roles)
                    • Navigate to /login
                    • Show toast: "Session expired. Please log in again."
```

### 3.4 Logout Flow

```
User clicks "Logout" in Sidebar
│
├── POST /api/v1/auth/logout (sends current JWT in Authorization header)
│       • Server adds token JTI to Redis blacklist
│       • Server clears refreshToken cookie
│
├── Clear Zustand store: token = null, userId = null, roles = []
├── Close WebSocket connection
├── Navigate to /login
└── Show toast: "You have been logged out."
```

---

## 4. Dashboard Flow

```
/dashboard (requires auth)
│
├── On mount — parallel API calls:
│       ├── GET /api/v1/wallets/user/{userId}/USD        → populate WalletWidget
│       ├── GET /api/v1/portfolio/user/{userId}           → populate PortfolioTable + AllocationChart
│       └── GET /api/v1/trades/user/{userId}?page=0&size=5 → populate RecentOrdersWidget
│
├── WebSocket: connect to wss://api.finpulse.dev/ws/market-data?token={jwt}
│       • On message (MarketTick):
│               → useStore.addMarketTick(tick)
│               → useMemo recalculates total portfolio value
│               → Hero "Net Worth" widget updates instantly
│               → LivePriceChart appends new data point
│
├── WebSocket: connect to wss://api.finpulse.dev/ws/notifications?token={jwt}
│       • On message (TradeExecutedNotification):
│               → Show toast notification (top-right)
│               → Refresh order history widget silently
│
└── Layout:
        ┌────────────────────────────────────────────────────────────┐
        │  Sidebar  │  Hero: Net Worth   │  Wallet Summary Widget    │
        │           │──────────────────────────────────────────────  │
        │  Dashboard│  P&L Chart (1D/1W/1M/1Y tabs)                 │
        │  Markets  │──────────────────────────────────────────────  │
        │  Trade    │  Asset Allocation  │  Recent Orders            │
        │  Wallet   │  Pie Chart         │  Table (5 rows)           │
        │  Audit    │                    │                           │
        │  Settings │────────────────────────────────────────────── │
        │           │  Live Market Ticker (horizontal scroll strip)  │
        │  Logout   │                                                │
        └────────────────────────────────────────────────────────────┘
```

### 4.1 P&L Chart Time-Range Filter

```
User clicks time-range tab: [1D] [1W] [1M] [1Y]
│
├── GET /api/v1/market/{symbol}/history?range={range}
│       • Show skeleton loader on chart while fetching
│       • On success: replace chart data; animate transition
│       └── On error: show "Failed to load chart data" with Retry button
│
└── Selected tab highlighted; chart x-axis re-labeled for range
```

---

## 5. Market Data Flow

```
/markets
│
├── On mount:
│       └── GET /api/v1/market/symbols → render symbol list
│
├── Each symbol row shows:
│       • Symbol name (e.g. BTC/USD)
│       • Current price (from latestPrices in Zustand — updated by WebSocket)
│       • 24h % change (computed from first and last tick in marketTicks history)
│       • Colour: green if price ↑, red if price ↓ since last tick
│
├── User clicks on a symbol row:
│       • Open symbol detail panel (right drawer or full page)
│       • GET /api/v1/market/{symbol}/history?range=1D
│       • Render detailed OHLCV candlestick chart
│       • "Trade" CTA button → navigate to /trade?symbol={symbol}&prefill=true
│
└── Search / filter bar:
        • Filters symbol list client-side (no API call)
        • Clears on route change
```

---

## 6. Wallet Flow

```
/wallet
│
├── On mount:
│       └── GET /api/v1/wallets/user/{userId}/USD
│               • Show: Total Balance, Locked in Orders, Available Funds
│               • Show: Transaction History table (last 20 audit events)
│                       → GET /api/v1/audit/user/{userId}?action=DEPOSIT,WITHDRAW
│
├── ── DEPOSIT FLOW ──────────────────────────────────────────────────────────
│   User clicks "Deposit"
│   │
│   ├── Open Deposit Modal
│   │       • Amount input (min $0.01)
│   │       • Currency selector (USD only in v1)
│   │       • "Confirm Deposit" button (disabled when amount ≤ 0)
│   │
│   ├── POST /api/v1/wallets/deposit { amount, currency }
│   │       │
│   │       ├── 200 OK
│   │       │       • Close modal
│   │       │       • Update WalletDto in component state
│   │       │       • Show success toast: "Deposit of $X successful"
│   │       │       • Refresh transaction history table
│   │       │
│   │       └── 400 Bad Request
│   │               • Show inline error: "Invalid amount"
│
├── ── WITHDRAW FLOW ─────────────────────────────────────────────────────────
│   User clicks "Withdraw"
│   │
│   ├── Open Withdraw Modal
│   │       • Amount input (max = availableBalance)
│   │       • Live preview: "New available balance: $X"
│   │       • Disabled if availableBalance = 0
│   │
│   ├── POST /api/v1/wallets/withdraw { amount, currency }
│   │       │
│   │       ├── 200 OK → close modal; refresh balances; success toast
│   │       └── 400 Insufficient Funds → inline error in modal
│
└── Balance widgets auto-refresh when a TradeExecutedNotification arrives via WebSocket
```

---

## 7. Trade Execution Flow

```
/trade (or slide-in panel from /dashboard)
│
├── On mount (optional prefill from query param ?symbol=BTC/USD):
│       └── GET /api/v1/wallets/user/{userId}/USD → load availableBalance
│
├── ── FORM STATE ─────────────────────────────────────────────────────────────
│   • BUY / SELL toggle (default: BUY)
│   • Symbol selector (dropdown, populated from /market/symbols)
│   • Quantity input (number, min 0.00000001)
│   • Price input (number, pre-filled with latest price from Zustand store)
│   • Estimated Cost preview: quantity × price (updates on every keystroke)
│   • Funds check: if estimatedCost > availableBalance → warning banner + submit disabled
│
├── ── PLACE ORDER ────────────────────────────────────────────────────────────
│   User clicks "Place Order"
│   │
│   ├── Client generates Idempotency-Key (UUID v4) — stored in ref to prevent duplicate submits
│   │
│   ├── POST /api/v1/trades { symbol, side, quantity, price }
│   │       Header: Idempotency-Key: <uuid>
│   │       │
│   │       ├── 202 Accepted
│   │       │       • Show success toast: "BUY BTC/USD order placed — PENDING"
│   │       │       • Reset form (clear quantity; keep symbol)
│   │       │       • Trigger silent refresh of Order History table
│   │       │       • Wallet lockedBalance updates via WebSocket notification
│   │       │
│   │       ├── 400 Insufficient Funds
│   │       │       • Show inline error: "Insufficient available funds"
│   │       │       • Highlight available balance widget in red
│   │       │
│   │       ├── 400 Validation Error
│   │       │       • Show field-level errors below each invalid input
│   │       │
│   │       └── 403 KYC Not Approved
│   │               • Show banner: "Complete KYC verification to start trading"
│   │               • CTA button: "Complete KYC" → /settings/kyc
│
└── ── ORDER HISTORY TABLE ─────────────────────────────────────────────────
        • Below trade form (or separate /orders route)
        • GET /api/v1/trades/user/{userId}?page=0&size=20
        • Columns: Symbol | Side | Qty | Price | Total | Status | Date
        • Status badge colours: PENDING=amber, COMPLETED=green, FAILED=red, CANCELLED=grey
        • Pagination: "Next" / "Previous" buttons; cursor-style navigation
        • Click a row → expand inline detail showing trade_history status transitions
```

---

## 8. Real-Time Notification Flow

```
WebSocket /ws/notifications receives TradeExecutedNotification:
{
  "type": "TRADE_EXECUTED",
  "tradeId": "uuid",
  "symbol": "BTC/USD",
  "side": "BUY",
  "quantity": 0.05,
  "executedPrice": 60100.00,
  "status": "COMPLETED"
}
│
├── useStore.addNotification(n)
│       → Notification bell counter increments (+1)
│
├── Toast notification (top-right, auto-dismiss 5 seconds):
│       "✅ BUY 0.05 BTC/USD filled @ $60,100.00"
│
├── If user is on /trade or /dashboard:
│       → Silently refresh Order History table (re-fetch page 0)
│       → Silently refresh Portfolio (re-fetch /portfolio/user/{id})
│       → Portfolio value re-calculated via useMemo
│
└── Notification Bell dropdown (click to expand):
        • Lists last 50 notifications (from Zustand store)
        • "Mark all as read" clears the counter
        • Each row: icon | message | timestamp (relative: "2 min ago")
```

---

## 9. Audit Log Flow (ROLE_AUDITOR / ROLE_ADMIN)

```
/audit (only rendered in sidebar for AUDITOR and ADMIN roles)
│
├── On mount:
│       └── GET /api/v1/audit/user/{userId}?page=0&size=50
│               • Table: Timestamp | User | Action | Entity | Details | IP
│               • Cursor pagination (before={timestamp}&limit=50)
│
├── Filter Bar:
│       • User ID input (UUID)
│       • Action dropdown (TRADE_PLACED, DEPOSIT, WITHDRAW, LOGIN, LOGOUT, ...)
│       • Date range picker (from / to)
│       • "Apply Filters" → re-fetches with query params
│
├── Row expansion:
│       • Click row → expand to show full `details` JSONB as formatted key-value list
│
└── Export:
        • "Export CSV" button (ADMIN only; hidden for AUDITOR)
        • GET /api/v1/audit/export?userId=...&from=...&to=...
        • Browser triggers file download: audit_log_{userId}_{date}.csv
        • Show progress spinner while streaming
```

---

## 10. Settings Flow

```
/settings
│
├── Profile section:
│       • Display: Username, Email, KYC status badge
│       • "Update email" form → PATCH /api/v1/users/{id}/email (planned v1.2)
│
├── KYC section (if kycStatus = PENDING):
│       • Mock KYC form: Full Name, Date of Birth, Country
│       • Submit → PATCH /api/v1/admin/users/{id}/kyc { kycStatus: "APPROVED" }
│               (in v1, self-approval for demo purposes)
│       • On approval: KYC badge updates; trading endpoints unlocked
│
└── Security section:
        • Change password form (current + new + confirm)
        • POST /api/v1/auth/change-password (planned v1.2)
        • "Log out of all devices" → invalidates all refresh tokens in DB
                POST /api/v1/auth/logout-all
```

---

## 11. Role-Based UI Differences

| UI Element | ROLE_USER | ROLE_ANALYST | ROLE_AUDITOR | ROLE_ADMIN |
|------------|-----------|-------------|-------------|-----------|
| Dashboard | ✅ Full | ✅ Read-only | ✅ Read-only | ✅ Full |
| Trade panel | ✅ Full | ❌ Hidden | ❌ Hidden | ✅ Full |
| Wallet panel | ✅ Full | ❌ Hidden | ❌ Hidden | ✅ Full |
| Markets page | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| Audit page | ❌ Hidden | ❌ Hidden | ✅ Full | ✅ Full |
| Export CSV button | ❌ Hidden | ❌ Hidden | ❌ Hidden | ✅ Visible |
| Admin panel | ❌ Hidden | ❌ Hidden | ❌ Hidden | ✅ Full |
| Settings | ✅ Own profile | ✅ Own profile | ✅ Own profile | ✅ All users |

---

## 12. Route Map

| Route | Component | Auth Required | Roles Allowed |
|-------|-----------|--------------|---------------|
| `/login` | `LoginPage` | No | All (redirects to `/dashboard` if already logged in) |
| `/dashboard` | `DashboardPage` | Yes | All |
| `/markets` | `MarketsPage` | Yes | All |
| `/markets/:symbol` | `SymbolDetailPage` | Yes | All |
| `/trade` | `TradePage` | Yes | USER, ADMIN |
| `/wallet` | `WalletPage` | Yes | USER, ADMIN |
| `/orders` | `OrderHistoryPage` | Yes | USER, ADMIN |
| `/audit` | `AuditPage` | Yes | AUDITOR, ADMIN |
| `/settings` | `SettingsPage` | Yes | All |
| `/settings/kyc` | `KycPage` | Yes | USER (PENDING only) |
| `/*` | `NotFoundPage` | No | — |

---

## 13. Global Error Handling

```
Axios Global Response Interceptor:
│
├── 401 → Token refresh flow (see §3.3)
├── 403 → Show toast: "You don't have permission to do that."
├── 404 → Show inline "Not found" state in the relevant component
├── 429 → Show toast: "Too many requests. Please slow down."
├── 500 → Show toast: "Something went wrong on our end. Try again shortly."
│         Log traceId to console for debugging
└── Network error (no response) → Show banner: "Connection lost. Retrying..."
        WebSocket reconnect also triggers (exponential backoff)

Global React Error Boundary:
└── Catches unhandled render errors
        → Shows fallback: "Something went wrong. Refresh the page."
        → Reports error + component stack to observability (planned: Sentry)
```

---

## 14. WebSocket Connection Lifecycle

```
App mounts (user authenticated)
│
├── WebSocketService.connect(token)
│       • new WebSocket(`wss://api.finpulse.dev/ws/market-data?token=${token}`)
│       • new WebSocket(`wss://api.finpulse.dev/ws/notifications?token=${token}`)
│
├── onopen  → log "WS connected"; set connectionStatus = CONNECTED in store
├── onmessage → dispatch to appropriate Zustand action
├── onerror → log error; connectionStatus = ERROR
└── onclose → connectionStatus = DISCONNECTED
                → scheduleReconnect(delay) — exponential back-off:
                        Attempt 1: 2 sec
                        Attempt 2: 4 sec
                        Attempt 3: 8 sec
                        Attempt 4+: 30 sec (cap)
                → If token expired during reconnect: trigger token refresh first

App unmounts / user logs out
└── ws.close() called in useEffect cleanup → no memory leaks
```

---

## 15. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-06-06 | FinPulse Team | Initial app flow document — all flows, route map, role-based UI, WebSocket lifecycle |
