# ADR 0001: Use Kafka for Event Streaming

**Date:** 2026-05-27
**Status:** Accepted

## Context
FinPulse requires processing thousands of simulated trade execution events per second (up to 10,000 TPS). Traditional synchronous REST API chains between the Trade Engine and the Wallet/Ledger services introduce latency bottlenecks, transaction timeouts, and tight coupling. We need a reliable messaging system to handle high-throughput, ordered event streams.

## Decision
We will use **Apache Kafka** as our central nervous system for event-driven communication.
Specifically, we will use it for:
- `trade.events`: Publishing executed trades for asynchronous processing by the Audit and Analytics services.
- `market.ticks`: High-throughput distribution of market data to WebSocket handlers.

## Consequences
### Positive
- **Decoupling**: Services can scale independently based on consumer lag.
- **Throughput**: Kafka's partition-based log model easily supports our 10k TPS requirement.
- **Durability**: Event sourcing becomes viable, enabling robust audit trails.

### Negative
- **Operational Complexity**: Requires managing Zookeeper/KRaft and monitoring Kafka broker health.
- **Eventual Consistency**: The frontend must be designed to handle asynchronous updates.
