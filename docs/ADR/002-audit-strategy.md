# ADR-002: Audit Trail Implementation Strategy

## Status
Accepted

## Context
We need a robust, immutable audit trail for all financial transactions to meet compliance requirements.

## Options Considered
1. **Hibernate Envers**: Easy to integrate, but uses blocking JDBC which conflicts with our reactive WebFlux stack.
2. **PostgreSQL Triggers**: Purely database-level. Performs well but encapsulates logic outside the application layer.
3. **Kafka Event Sourcing**: Emit events for every state change and consume them in a dedicated Audit Service.

## Decision
We chose **Option 3: Kafka Event Sourcing**, supplemented by PostgreSQL triggers (already present) for absolute data integrity.
The Trade service will publish a `TradeExecutedEvent` to Kafka. A dedicated `ComplianceEventConsumer` listens to this topic and writes the JSON payload into the `audit_logs` table using R2DBC.

## Consequences
- **Positive**: Fully reactive, non-blocking audit logging. Enables CQRS where other services (like notifications or analytics) can also consume these events.
- **Negative**: Eventual consistency in the audit logs. Requires Kafka cluster maintenance.
