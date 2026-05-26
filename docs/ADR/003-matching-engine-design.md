# ADR 003: Matching Engine Design

## Status
Accepted

## Context
Currently, trades in FinPulse are executed instantly at the current market price without a counterparty. To be a realistic trading simulation and wealth management platform, we need a true Order Matching Engine.

## Decision
We will implement an **In-Memory Order Matching Engine**.
- **Architecture**: A new microservice (or logical service inside the backend) `OrderBookService` will maintain an in-memory limit order book for each symbol.
- **Event-Driven**: It will listen to the `trade.events` Kafka topic for `PENDING` orders, attempt to match them against the book, and emit `TRADE_MATCHED` events back to Kafka.
- **Persistence**: While the order book is entirely in-memory for ultra-low latency, snapshotting will occur via Kafka log compaction to recover state on restart.

## Consequences
- **Positive**: True trading realism. Ability to support limit orders, market orders, and stop-loss orders.
- **Negative**: Increased complexity. We must ensure the `OrderBookService` is highly available, or sharded by symbol (e.g., node A handles BTC/USD, node B handles ETH/USD) to avoid race conditions in matching.
