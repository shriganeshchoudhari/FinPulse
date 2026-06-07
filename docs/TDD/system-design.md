# System Design Document — FinPulse
**Version:** 1.0.0 | **Last Updated:** 2026-06-03 | **Status:** Active

---

## 1. High-Level System Design

FinPulse is architected as a **reactive modular monolith** on the backend, with a clear boundary separation that supports future extraction into microservices. The system is designed around three core pillars:

1. **Event-Driven Core** — Kafka decouples the trade write path from projections and compliance.
2. **Reactive Throughput** — Spring WebFlux ensures non-blocking I/O end-to-end.
3. **Time-Series Optimized Storage** — TimescaleDB hypertables handle millions of market ticks and audit records.

### 1.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Client Layer                                    │
│                                                                          │
│   Browser / Mobile (React 19 + Vite)                                    │
│   ├── REST API calls (Axios, /api/v1/*)                                  │
│   └── WebSocket connection (WSS /ws/market-data, /ws/notifications)     │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                        Edge / Ingress Layer                              │
│                                                                          │
│   NGINX Ingress Controller                                               │
│   ├── TLS 1.3 termination (cert-manager + Let's Encrypt)                │
│   ├── Rate limiting: 1000 req/min per IP                                │
│   └── Routes: /api/* → backend:8080, /ws/* → backend:8080              │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                       Application Layer                                  │
│                                                                          │
│   Spring Boot 3.3 / WebFlux (Project Reactor)                           │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  Security Layer: JwtAuthenticationFilter → Redis blacklist      │   │
│   │  check → Spring Security RBAC                                   │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│   │ AuthService  │  │ TradeService │  │WalletService │  │MarketData │  │
│   │              │  │   (CQRS)     │  │ (ACID Locks) │  │Simulator  │  │
│   └──────────────┘  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  │
│                             │                 │                │         │
│   ┌──────────────┐          │                 │                │         │
│   │AuditService  │◄─────────┴─────────────────┘                │         │
│   │(Compliance)  │                                              │         │
│   └──────────────┘                                              │         │
└──────────────────────────────────────────────────────────────── ┼ ───────┘
                                                                  │
                    ┌─────────────────────────────────────────────▼───────┐
                    │                   Apache Kafka 3.x                  │
                    │                                                      │
                    │  ┌─────────────────┐  ┌───────────────────────────┐ │
                    │  │  trade.events   │  │      market.ticks         │ │
                    │  │  (3 partitions) │  │      (12 partitions,      │ │
                    │  │  RF=3           │  │       1 per symbol)       │ │
                    │  └────────┬────────┘  └─────────────┬─────────────┘ │
                    │           │                          │               │
                    └───────────┼──────────────────────────┼───────────────┘
                                │                          │
          ┌─────────────────────▼──────┐    ┌─────────────▼──────────────┐
          │  ComplianceEventConsumer   │    │  WebSocketBroadcastService │
          │  PortfolioProjectConsumer  │    │  (push to connected clients)│
          └─────────────────────┬──────┘    └────────────────────────────┘
                                │
┌───────────────────────────────▼────────────────────────────────────────┐
│                       Persistence Layer                                 │
│                                                                         │
│   PostgreSQL 16 + TimescaleDB extension                                │
│   ├── Primary (write): trades, wallets, users (ACID)                   │
│   ├── Hypertables: market_ticks, audit_logs, compliance_events          │
│   └── Hot Replica (read): analytics queries, materialized views         │
│                                                                         │
│   Redis 7                                                               │
│   ├── JWT blacklist (SET with TTL = token expiry)                       │
│   └── Market tick cache (last price per symbol, TTL = 1 sec)           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow Diagrams

### 2.1 Trade Execution Flow

```
User Browser
     │
     │  POST /api/v1/trades  {symbol, side, qty, price}
     ▼
NGINX Ingress  ──JWT validation──►  Redis blacklist check
     │
     ▼
TradeCommandController (WebFlux)
     │
     ▼
TradeCommandService
     ├── 1. Validate TradeRequest (symbol valid, qty > 0, price > 0)
     ├── 2. WalletService.lockAndDebit(userId, cost)   ← PESSIMISTIC_WRITE lock
     ├── 3. tradeRepository.save(Trade{status=PENDING})
     ├── 4. kafkaTemplate.send("trade.events", TradeExecutedEvent)
     └── 5. Return Mono<TradeResponse{id, status=PENDING}>
                │
                │   Kafka: trade.events
                │
          ┌─────▼─────────────────────────────┐
          │                                    │
          ▼                                    ▼
ComplianceEventConsumer            PortfolioProjectionConsumer
  - INSERT INTO audit_logs           - UPDATE portfolio_assets
  - INSERT compliance_events           (avg_price, quantity)
    if risk rule triggered           - REFRESH MATERIALIZED VIEW
                                       portfolio_summary

          + NotificationService
            kafkaTemplate.send("notifications", TradeExecutedNotification)
                │
                ▼
        WebSocket broadcast to user's session
```

### 2.2 Market Data Flow

```
MarketDataSimulatorService (@Scheduled every 500ms)
     │
     │  For each symbol: apply random walk to last price
     ▼
kafkaTemplate.send("market.ticks", MarketTick{symbol, price, volume, timestamp})
     │
     ▼
MarketDataKafkaConsumer
     ├── 1. Save MarketTick to TimescaleDB hypertable (batch insert, 100ms flush)
     ├── 2. Update Redis cache: SET market:price:{symbol} {price} EX 1
     └── 3. Forward to WebSocketBroadcastService.emit(tick)
                │
                ▼
        All connected WebSocket clients receive MarketTick JSON
        React frontend: useStore.getState().addMarketTick(tick)
        → Portfolio value recalculated via useMemo
        → Chart component appends new data point
```

### 2.3 Authentication Flow

```
POST /api/v1/auth/login  {username, password}
     │
     ▼
AuthController
     │
     ▼
AuthService
     ├── 1. Load UserDetails from PostgreSQL
     ├── 2. BCrypt.matches(password, storedHash)
     ├── 3. Build JWT claims: sub=userId, roles=[...], iat, exp=+15min
     ├── 4. Sign with RS256 private key (loaded from K8s Secret)
     └── 5. Create RefreshToken (UUID, stored in PostgreSQL, TTL=7d)
                │
                ▼
Response: { accessToken: "eyJ...", expiresIn: 900 }
Set-Cookie: refreshToken=<uuid>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800

Subsequent requests:
Authorization: Bearer eyJ...
     │
     ▼
JwtAuthenticationFilter
     ├── 1. Parse + verify RS256 signature
     ├── 2. Check Redis: EXISTS blacklist:{jti}  →  if true, reject 401
     └── 3. Set SecurityContextHolder with JWT principal
```

---

## 3. Kafka Topic Design

| Topic | Partitions | Replication | Key | Consumer Groups |
|-------|-----------|-------------|-----|-----------------|
| `trade.events` | 3 | 3 | `userId` (ensures ordering per user) | `compliance-service`, `portfolio-projection` |
| `market.ticks` | 12 | 2 | `symbol` (ensures ordering per symbol) | `websocket-broadcaster`, `timescale-ingester` |
| `notifications` | 3 | 2 | `userId` | `notification-delivery` |

**Retention:** `trade.events` = 30 days (compliance), `market.ticks` = 24 hours, `notifications` = 7 days.

---

## 4. Caching Strategy

| Cache | Store | TTL | Eviction |
|-------|-------|-----|---------|
| Latest price per symbol | Redis `market:price:{symbol}` | 1 second | TTL expiry |
| JWT blacklist | Redis `blacklist:{jti}` | = token remaining TTL | TTL expiry |
| User session claims | Redis `session:{userId}` | 15 minutes | TTL expiry |
| Compiled analytics views | PostgreSQL materialized view | Refreshed every 1 min by Kafka consumer | Manual refresh |

---

## 5. API Design Principles

- All responses use `application/json`
- Errors follow RFC 9457 Problem Details: `{ type, title, status, detail, traceId }`
- Pagination uses cursor-based pagination for time-series: `?before={timestamp}&limit=50`
- Idempotency keys required for `POST /trades` via `Idempotency-Key` header
- API versioning via URL path: `/api/v1/`, `/api/v2/`

---

## 6. Infrastructure Design

See `docs/DEPLOYMENT/kubernetes-deployment-guide.md` for full Kubernetes manifests.

### 6.1 Kubernetes Namespace Layout

```
finpulse-prod namespace:
  Deployments: finpulse-backend, finpulse-frontend, finpulse-market-simulator
  StatefulSets: finpulse-kafka, finpulse-redis
  Services: ClusterIP for all internal; LoadBalancer for ingress
  HPAs: finpulse-backend (2-20 pods), finpulse-frontend (2-10 pods)
  Secrets: db-credentials, jwt-private-key, kafka-creds
  ConfigMaps: app-config, logging-config
```

### 6.2 Resource Requests & Limits

| Pod | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----|------------|-----------|----------------|--------------|
| `finpulse-backend` | 500m | 2000m | 512Mi | 2Gi |
| `finpulse-frontend` | 100m | 500m | 128Mi | 256Mi |
| `finpulse-market-simulator` | 200m | 500m | 256Mi | 512Mi |

---

## 7. Disaster Recovery

| Scenario | RTO | RPO | Strategy |
|----------|-----|-----|---------|
| Pod crash | < 30 sec | 0 | K8s liveness probe restarts container |
| Node failure | < 2 min | 0 | K8s reschedules pods on healthy nodes |
| DB primary failure | < 5 min | < 1 min | PostgreSQL hot standby promoted via Patroni |
| AZ outage | < 10 min | < 5 min | Multi-AZ K8s node groups; cross-AZ read replica |
| Full region outage | < 30 min | < 15 min | Restore from S3/GCS daily backup; DNS failover |

---

## 8. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-06-03 | FinPulse Team | Initial system design document |
