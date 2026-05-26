# UI/UX Specifications - FinPulse

## 1. Design & Typography tokens

FinPulse features a premium dark theme tailored for financial data visualization. It supports high contrast, vibrant green/red indicators for price movements, and seamless typography transitions.

### Color Palette (Vanilla CSS Custom Properties)
```css
:root {
  --color-bg: #090d16;
  --color-surface: #121824;
  --color-surface-hover: #1e2638;
  --color-border: #1f2a40;
  
  --color-text-primary: #f3f4f6;
  --color-text-secondary: #9ca3af;
  --color-text-muted: #6b7280;
  
  --color-accent-green: #10b981;
  --color-accent-green-alpha: rgba(16, 185, 129, 0.1);
  
  --color-accent-red: #ef4444;
  --color-accent-red-alpha: rgba(239, 68, 68, 0.1);
  
  --color-brand: #3b82f6;
  --color-brand-hover: #2563eb;
  
  --font-family-sans: 'Inter', sans-serif;
  --font-family-display: 'Outfit', sans-serif;
}
```

---

## 2. Dashboard Components

### 2.1 Live Ticker Banner
- **Behavior:** Slides horizontally containing real-time price updates for Stocks and Cryptocurrencies.
- **Visuals:** Flashes bright green (`--color-accent-green`) on positive ticks, and red (`--color-accent-red`) on negative ticks using smooth CSS keyframes.

### 2.2 Portfolio Performance Graph
- **Technology:** Recharts / ApexCharts Area Chart.
- **Interaction:** Zoom/Pan controls, time-range selectors (1D, 1W, 1M, 1Y).
- **Data Stream:** Fed via reactive WebSocket STOMP endpoint `/topic/portfolio/{userId}`.

---

## 3. Redux Toolkit State Design

To avoid unneeded UI redraws, state is split into isolated slices:
- **`authSlice`**: Token details, user info, KYC progress status.
- **`tickerSlice`**: Key-value mapping of `{ [symbol]: lastPrice }` optimized with `React.memo` to limit rendering loops.
- **`portfolioSlice`**: Balance and asset arrays with fast calculations.
