# FinPulse Advanced Enterprise Roadmap - Sprint 2 & 3

This document outlines the user stories and tasks for the Advanced Enterprise Roadmap, broken down by feature area.

## 1. Security Infrastructure

### User Story 1.1: Implement OAuth2/JWT Refresh Tokens
**Description:** As a user, I want my session to remain active securely without constantly logging in, so I can use the application continuously.
**Tasks:**
- Add Refresh Token entity and repository.
- Create `/auth/refresh` endpoint.
- Update frontend to intercept 401s and refresh the token automatically.

### User Story 1.2: Redis-Based Token Revocation
**Description:** As an administrator, I want to immediately invalidate compromised tokens to secure user accounts.
**Tasks:**
- Integrate Spring Data Redis.
- Store token signatures/jti in Redis on logout or revocation.
- Add JWT filter check against Redis blacklist.

### User Story 1.3: API Rate Limiting with Bucket4j
**Description:** As a system operator, I want to prevent abuse of the API endpoints to ensure high availability.
**Tasks:**
- Integrate Bucket4j.
- Create RateLimitFilter or Interceptor.
- Define rate limit tiers based on user roles or IP.

## 2. Real-Time Market Data Engine

### User Story 2.1: Virtual Threads Market Data Simulator
**Description:** As a backend system, I need a lightweight, high-throughput market data simulator to emulate real market conditions.
**Tasks:**
- Enable Java 21 Virtual Threads.
- Create a Simulator Service generating stock price ticks.
- Utilize Virtual Threads for concurrent ticker generation.

### User Story 2.2: Kafka Integration for Market Data Streaming
**Description:** As a data pipeline, I want market ticks to be published to Kafka for decoupled, scalable processing.
**Tasks:**
- Add spring-kafka dependencies and configuration.
- Publish simulated ticks to a `market-data` Kafka topic.
- Create a Kafka listener in the WebSocket service.

### User Story 2.3: STOMP WebSockets for Real-Time Price Updates
**Description:** As a frontend application, I want to receive live market updates via WebSockets so the UI reflects current prices.
**Tasks:**
- Configure Spring WebSocket with STOMP.
- Broadcast Kafka market data to WebSocket topics (`/topic/market`).
- Implement connection security (token auth on connect).

### User Story 2.4: React Virtualized Dashboard
**Description:** As a user, I want to view high-frequency market data in a dashboard without browser lag.
**Tasks:**
- Integrate `react-virtualized` or `react-window`.
- Create a real-time data grid component.
- Connect frontend WebSocket client to the data grid.

## 3. Portfolio & Wallet Management

### User Story 3.1: Double-Entry Ledger System
**Description:** As an accountant/system, I need a double-entry ledger that maps to the existing Wallet to ensure financial consistency.
**Tasks:**
- Create `LedgerTransaction` and `LedgerEntry` entities.
- Refactor Wallet deposit/withdrawal to generate paired ledger entries.
- Ensure sum of entries is always zero.

### User Story 3.2: Pessimistic Locking for Transactions
**Description:** As a user, I want my wallet transactions to be safe from race conditions during concurrent trades.
**Tasks:**
- Add `@Lock(LockModeType.PESSIMISTIC_WRITE)` to Wallet repository queries.
- Handle lock timeout exceptions gracefully.

### User Story 3.3: Smart Portfolio Rebalancing
**Description:** As an investor, I want to define target portfolio allocations and automatically rebalance my holdings.
**Tasks:**
- Create Allocation Target schema.
- Implement a Rebalance Service to calculate required buy/sell orders.
- Expose `/portfolio/rebalance` endpoint.

### User Story 3.4: Historical Charts for Portfolio
**Description:** As a user, I want to visualize my portfolio value over time.
**Tasks:**
- Create a scheduled task to snapshot portfolio value daily.
- Expose API to fetch historical snapshots.
- Integrate Chart.js or Recharts on the frontend.

## 4. Trade Execution Engine

### User Story 4.1: Limit Orders
**Description:** As a trader, I want to place limit orders that only execute when a specific price is reached.
**Tasks:**
- Update `Order` entity with order type (MARKET, LIMIT) and target price.
- Create an Order Matching engine that listens to market data.
- Execute limit orders when conditions are met.

### User Story 4.2: Async Workers for Trade Execution
**Description:** As a system, I want trade execution to happen asynchronously to prevent blocking the main request threads.
**Tasks:**
- Configure `@EnableAsync` with a custom ThreadPoolTaskExecutor.
- Move trade execution logic to `@Async` methods.

### User Story 4.3: Strict @Transactional Boundaries
**Description:** As a developer, I need to ensure trade executions are fully atomic.
**Tasks:**
- Review and refine `@Transactional` annotations on trade services.
- Write integration tests verifying rollback on failure.

## 5. Immutable Compliance Trail

### User Story 5.1: Hibernate Envers Integration
**Description:** As a compliance officer, I need a complete history of all changes to user and financial records.
**Tasks:**
- Add Hibernate Envers dependency.
- Annotate `User`, `Wallet`, `Order`, and `Portfolio` with `@Audited`.
- Verify audit tables are generated.

### User Story 5.2: Postgres Triggers for Critical Tables
**Description:** As a database administrator, I want database-level auditing for critical tables to prevent bypassed application logic.
**Tasks:**
- Write Flyway migration scripts for audit trigger functions.
- Apply triggers to `ledger_entry` and `users` tables.

### User Story 5.3: Compliance Portal
**Description:** As a compliance officer, I want a UI to search and view the audit trail.
**Tasks:**
- Create API endpoints to query Envers revisions.
- Build a React Compliance Dashboard restricted to ADMIN/COMPLIANCE roles.

## 6. Infrastructure & Observability

### User Story 6.1: Docker Compose Setup
**Description:** As a developer, I want to spin up the entire application stack locally with one command.
**Tasks:**
- Create `docker-compose.yml` including Postgres, Redis, Kafka, Zookeeper, and the Spring Boot app.
- Configure application properties for Docker environments.

### User Story 6.2: Prometheus Metrics
**Description:** As a DevOps engineer, I want the application to expose metrics for monitoring.
**Tasks:**
- Add Spring Boot Actuator and Micrometer Prometheus registry.
- Expose `/actuator/prometheus` endpoint.
- Add custom metrics for trade execution latency and volume.

### User Story 6.3: Grafana Dashboards
**Description:** As a DevOps engineer, I want visual dashboards to monitor application health and business metrics.
**Tasks:**
- Add Grafana to `docker-compose.yml`.
- Provision a default dashboard JSON file for JVM, API, and Trade metrics.
