# Technical Design Document (TDD) — FinPulse
**Version:** 1.1.0 | **Last Updated:** 2026-06-03 | **Status:** Active

---

## 1. System Architecture Overview

FinPulse is a **modular monolith** with clearly bounded service domains, designed so individual modules can be extracted into true microservices with minimal refactoring. All inter-module communication that crosses a domain boundary goes through Kafka events.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          React 19 Frontend (Vite)                        │
│              Zustand State │ WebSocket Client │ REST API Client           │
└────────────┬───────────────────────────────────────────┬─────────────────┘
             │ HTTPS / REST                              │ WSS / WebSocket
┌────────────▼───────────────────────────────────────────▼─────────────────┐
│                     NGINX Ingress Controller (TLS 1.3)                   │
└────────────┬───────────────────────────────────────────┬─────────────────┘
             │                                           │
┌────────────▼───────────────────────────────────────────▼─────────────────┐
│              Spring Boot 3.x / WebFlux — FinPulse Backend                │
│                                                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  Auth /     │  │  Trade      │  │  Wallet /    │  │  Market Data  │  │
│  │  Identity   │  │  Engine     │  │  Ledger      │  │  Simulator    │  │
│  │  Service    │  │  (CQRS)     │  │  Service     │  │  (@Scheduled) │  │
│  └─────────────┘  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│                           │               │                   │          │
│  ┌─────────────┐          │               │                   │          │
│  │  Audit /    │◄─────────┴───────────────┘                   │          │
│  │  Compliance │                                               │          │
│  │  Service    │                                               │          │
│  └─────────────┘                                               │          │
└────────────────────────────────────────────────────────────────┼──────────┘
                                                                 │
┌──────────────────────────────────────────────────────┐         │
│                   Apache Kafka 3.x                   │◄────────┘
│   Topics: trade.events │ market.ticks │ notifications │
└──────────┬───────────────────────────────────────────┘
           │ Consumed by
┌──────────▼───────────────────────────────────────────────────────────────┐
│              PostgreSQL 16 + TimescaleDB                Redis 7           │
│  Tables: users, wallets, trades, audit_logs, market_ticks               │
│  Token blacklist │ Session cache                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Backend Service Design

### 2.1 Thread Pool & Concurrency Architecture

Java 21 Virtual Threads are the default execution model for Spring WebFlux's non-blocking I/O. A custom `ThreadPoolTaskExecutor` is defined for CPU-bound operations (e.g., P&L batch calculations) to prevent blocking event-loop threads.

```java
@Configuration
@EnableAsync
public class ThreadPoolConfig {

    @Bean(name = "tradeEngineTaskExecutor")
    public Executor tradeEngineTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(16);
        executor.setMaxPoolSize(64);
        executor.setQueueCapacity(5000);
        executor.setThreadNamePrefix("trade-exec-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }

    // Virtual thread executor for I/O-bound tasks (Java 21+)
    @Bean(name = "virtualThreadExecutor")
    public Executor virtualThreadExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }
}
```

### 2.2 CQRS Architecture

Write (command) and read (query) paths are fully separated.

```
[POST /api/v1/trades]
        │
        ▼
[TradeCommandController]
        │
        ▼
[TradeCommandService]
  - Validate request
  - Acquire PESSIMISTIC_WRITE lock on wallet row
  - Deduct locked balance
  - Persist Trade entity (status=PENDING)
  - Publish TradeExecutedEvent → Kafka topic: trade.events
        │
        ├──► [ComplianceEventConsumer] → INSERT INTO audit_logs
        └──► [PortfolioProjectionConsumer] → REFRESH MATERIALIZED VIEW portfolio_summary

[GET /api/v1/trades/user/{id}]
        │
        ▼
[TradeQueryController]
        │
        ▼
[TradeQueryService]
  - Read from read-optimized TimescaleDB views (no locking)
  - Return paginated Flux<TradeResponse>
```

### 2.3 Reactive Programming Model

All user-facing controllers use Project Reactor's `Mono<T>` and `Flux<T>` for fully non-blocking request handling.

```java
@RestController
@RequestMapping("/api/v1/trades")
public class TradeController {

    private final TradeCommandService tradeCommandService;
    private final TradeQueryService tradeQueryService;

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Mono<TradeResponse> executeTrade(
            @RequestBody Mono<TradeRequest> requestMono,
            @AuthenticationPrincipal Jwt jwt) {
        return requestMono
                .flatMap(req -> tradeCommandService.processTradeCommand(req, jwt.getSubject()))
                .subscribeOn(Schedulers.boundedElastic());
    }

    @GetMapping("/user/{userId}")
    public Flux<TradeResponse> getUserTrades(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return tradeQueryService.getTradesForUser(userId, PageRequest.of(page, size));
    }
}
```

### 2.4 WebSocket Architecture

Spring's reactive WebSocket API (replacing STOMP/SockJS for lower overhead) broadcasts market ticks and trade notifications.

```java
@Component
public class MarketDataWebSocketHandler implements WebSocketHandler {

    private final Sinks.Many<MarketTick> tickSink =
            Sinks.many().multicast().onBackpressureBuffer();

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        return session.send(
                tickSink.asFlux()
                        .map(tick -> session.textMessage(toJson(tick)))
        );
    }

    public void emit(MarketTick tick) {
        tickSink.tryEmitNext(tick);
    }
}
```

### 2.5 Market Data Simulator

A `@Scheduled` service generates simulated price ticks with configurable volatility.

```java
@Service
public class MarketDataSimulatorService {

    private final KafkaTemplate<String, MarketTick> kafkaTemplate;
    private final Map<String, BigDecimal> lastPrices = new ConcurrentHashMap<>();

    @Scheduled(fixedDelay = 500) // Emit every 500 ms
    public void emitTick() {
        SYMBOLS.forEach(symbol -> {
            BigDecimal newPrice = applyRandomWalk(lastPrices.getOrDefault(symbol, BASE_PRICES.get(symbol)));
            lastPrices.put(symbol, newPrice);
            kafkaTemplate.send("market.ticks", symbol, new MarketTick(symbol, newPrice, Instant.now()));
        });
    }
}
```

---

## 3. Database Design

### 3.1 PostgreSQL + TimescaleDB Topology

| Table | Type | Purpose |
|-------|------|---------|
| `users` | Standard | Identity records |
| `wallets` | Standard | Ledger balances with pessimistic locking |
| `portfolio_assets` | Standard | User's current asset holdings |
| `trades` | Standard (OLTP) | Trade orders write path |
| `trade_history` | Standard | Status change log per trade |
| `market_ticks` | TimescaleDB Hypertable | Time-series price data, partitioned by day |
| `audit_logs` | TimescaleDB Hypertable | Immutable compliance log, partitioned by month |
| `compliance_events` | TimescaleDB Hypertable | Rule-based risk events |

### 3.2 Pessimistic Locking Pattern

Used in `WalletService` to prevent concurrent double-spending:

```java
@Transactional(isolation = Isolation.SERIALIZABLE)
public Wallet lockAndDebit(UUID userId, BigDecimal amount, String currency) {
    // Acquires FOR UPDATE lock on the row for the duration of the transaction
    Wallet wallet = walletRepository.findByUserIdAndCurrencyForUpdate(userId, currency)
            .orElseThrow(() -> new WalletNotFoundException(userId));

    if (wallet.getAvailableBalance().compareTo(amount) < 0) {
        throw new InsufficientFundsException(userId, amount);
    }

    wallet.setLockedBalance(wallet.getLockedBalance().add(amount));
    wallet.setBalance(wallet.getBalance().subtract(amount));
    return walletRepository.save(wallet);
}
```

```java
// Repository
@Query(value = "SELECT * FROM wallets WHERE user_id = :userId AND currency = :currency FOR UPDATE",
       nativeQuery = true)
Optional<Wallet> findByUserIdAndCurrencyForUpdate(
    @Param("userId") UUID userId,
    @Param("currency") String currency);
```

### 3.3 TimescaleDB Hypertable Configuration

```sql
-- Partition market_ticks by day
SELECT create_hypertable('market_ticks', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Enable compression after 7 days
ALTER TABLE market_ticks SET (timescaledb.compress, timescaledb.compress_segmentby = 'symbol');
SELECT add_compression_policy('market_ticks', INTERVAL '7 days');

-- Continuous aggregate for OHLCV candles (1-minute buckets)
CREATE MATERIALIZED VIEW market_ticks_1m
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', timestamp) AS bucket,
    symbol,
    first(price, timestamp) AS open,
    max(price) AS high,
    min(price) AS low,
    last(price, timestamp) AS close,
    sum(volume) AS volume
FROM market_ticks
GROUP BY bucket, symbol;

SELECT add_continuous_aggregate_policy('market_ticks_1m',
    start_offset => INTERVAL '1 hour',
    end_offset   => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute');
```

---

## 4. Frontend Architecture

### 4.1 State Management (Zustand)

```typescript
interface AppState {
  token: string | null;
  userId: string | null;
  marketTicks: Record<string, MarketTick[]>;   // symbol → history (max 100)
  latestPrices: Record<string, number>;         // symbol → latest price
  portfolio: PortfolioAsset[];
  notifications: Notification[];

  setToken: (token: string | null) => void;
  setUserId: (id: string | null) => void;
  addMarketTick: (tick: MarketTick) => void;
  setPortfolio: (assets: PortfolioAsset[]) => void;
  addNotification: (n: Notification) => void;
}
```

### 4.2 WebSocket Client

```typescript
class WebSocketService {
  private ws: WebSocket | null = null;

  connect(token: string) {
    this.ws = new WebSocket(`wss://${API_HOST}/ws/market-data?token=${token}`);

    this.ws.onmessage = (event) => {
      const tick: MarketTick = JSON.parse(event.data);
      useStore.getState().addMarketTick(tick);
    };

    this.ws.onclose = () => {
      // Exponential back-off reconnect
      setTimeout(() => this.connect(token), 2000);
    };
  }
}
```

### 4.3 Performance Optimizations

- `React.memo` on all ticker row components to prevent re-renders on unrelated price updates
- `useMemo` to compute portfolio totals only when `portfolio` or `latestPrices` changes
- `react-window` `FixedSizeList` for the order history table (renders only visible rows)
- Zustand slice selectors to prevent components from subscribing to irrelevant state slices

---

## 5. Security Architecture

| Layer | Control |
|-------|---------|
| Transport | TLS 1.3 enforced at NGINX ingress; HSTS preloaded |
| Authentication | RS256-signed JWT; 15-minute access token; 7-day refresh token in HttpOnly cookie |
| Authorization | Spring Security RBAC; method-level `@PreAuthorize` annotations |
| Token Revocation | Redis blacklist checked on every request via `JwtAuthenticationFilter` |
| Secrets | Kubernetes Secrets (base64) → mounted as env vars; production uses HashiCorp Vault |
| Database | Parameterized queries only (JPA/R2DBC); no raw string concatenation |
| Audit | Hibernate Envers on all `@Audited` entities; append-only `audit_logs` hypertable |

---

## 6. Observability Stack

| Signal | Tool | Integration |
|--------|------|-------------|
| Metrics | Prometheus + Grafana | Spring Boot Actuator `/actuator/prometheus` |
| Logs | Loki + Grafana | Logback JSON appender → Loki push API |
| Traces | Tempo + Grafana | OpenTelemetry Java agent; auto-instrumentation |
| Alerting | Grafana Alerting | Rules for: KafkaLag > 10k, p99 > 200ms, DB connections > 80% |
| Dashboards | Grafana | JVM, Kafka consumer lag, trade throughput, DB connection pool |

---

## 7. Deployment Architecture

See `docs/DEPLOYMENT/kubernetes-deployment-guide.md` for full manifests.

| Component | Replicas (min/max) | Scale Trigger |
|-----------|-------------------|---------------|
| `finpulse-backend` | 2 / 20 | CPU > 70% OR Kafka consumer lag > 5,000 |
| `finpulse-frontend` | 2 / 10 | CPU > 60% |
| `finpulse-market-simulator` | 1 / 1 | N/A (singleton) |

---

## 8. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-05-27 | FinPulse Team | Initial TDD |
| 1.1.0 | 2026-06-03 | FinPulse Team | Added Virtual Thread config, WebSocket architecture, TimescaleDB continuous aggregates, observability table, frontend architecture |
