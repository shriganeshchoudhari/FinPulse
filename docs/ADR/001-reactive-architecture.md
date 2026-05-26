# ADR-001: Reactive Architecture & Microservices Transition

## Status
Accepted

## Context
FinPulse requires high throughput (10k+ TPS) and low latency for trade execution. The initial design was a modular monolith. Furthermore, mixing traditional Servlet-based components (like Spring WebSocket STOMP) with WebFlux caused runtime blocking issues.

## Decision
1. **Fully Reactive Stack**: We will use Spring WebFlux, Project Reactor, and R2DBC exclusively. No blocking calls are permitted in the main execution paths.
2. **Microservices Transition**: We are transitioning from the flawed modular monolith to a true microservices architecture to allow independent scaling of the Trade, Wallet, and Audit domains.
3. **Reactive WebSockets**: Replace Spring STOMP with raw Reactive WebSockets integrated with Reactor Sinks to avoid Servlet API conflicts.

## Consequences
- **Positive**: Significantly higher throughput and lower memory footprint. Independent scaling of services.
- **Negative**: Steeper learning curve for developers. Debugging requires specialized distributed tracing (Micrometer Tracing + OpenTelemetry).
