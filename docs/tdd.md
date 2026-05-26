# Technical Design Document (TDD) - FinPulse

## 1. System Architecture
FinPulse uses a reactive microservices architecture built on Spring Boot and Project Reactor.

### 1.1 Microservices
- **Identity Service**: Handles user authentication and JWT generation.
- **Trade Service**: Executes trades, manages order book logic.
- **Wallet Service**: Handles ledger updates with pessimistic locking.
- **Audit Service**: (NEW) Consumes Kafka events to maintain immutable audit trails.

### 1.2 Event-Driven Communication
- **Kafka**: Used as the central nervous system.
  - `trade.events`: Topic for executed trades (CQRS pattern).
  - `market.ticks`: Topic for real-time market data.

## 2. Database Schema
We use TimescaleDB (PostgreSQL) for time-series optimization. All primary keys are UUIDs.

### 2.1 Tables
- `users` (id UUID, email VARCHAR, role VARCHAR)
- `wallets` (id UUID, user_id UUID, currency VARCHAR, balance DECIMAL, locked_balance DECIMAL, updated_at TIMESTAMPTZ)
- `trades` (id UUID, user_id UUID, symbol VARCHAR, side VARCHAR, quantity DECIMAL, price DECIMAL, status VARCHAR, created_at TIMESTAMPTZ)
- `audit_logs` (NEW) (id UUID, user_id UUID, timestamp TIMESTAMPTZ, action VARCHAR, details JSONB)

## 3. API Design
- **REST APIs**: Reactive endpoints for synchronous operations (e.g., placing orders). OpenAPI 3.0 specification available at `/v3/api-docs`.
- **WebSockets**: Reactive WebSockets (replacing STOMP) for streaming market data and user notifications.

## 4. Deployment Strategy
- Dual-cloud deployment using GKE (Google Cloud) and EKS (AWS) for high availability.
- Terraform for infrastructure as code.
- Helm charts for Kubernetes deployments with autoscaling (HPA) configured.
