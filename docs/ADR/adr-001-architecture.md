# ADR-001: Foundational System Architecture for FinPulse

## Context & Problem Statement
FinPulse requires high trade throughput (5,000 requests/sec), immediate client-side real-time price updates (sub-100ms latency), bulletproof transactional consistency to prevent double-spending, and an immutable, tamper-evident history of audit events.

## Decision Drivers
1. **High Concurrency & Throughput:** Must not block OS threads on network/database waits.
2. **ACID Financial Ledger:** Zero tolerance for balance inconsistency.
3. **Immutable Auditing:** Regulatory requirement (SOC2 / SEC-17a-4 compliance).
4. **Autonomous AI SDLC Support:** Structural consistency for automated agent deployments.

## Considered Options
1. **Traditional Monolith (Spring Boot MVC + JPA + Single PostgreSQL)**
2. **Distributed Microservices (WebFlux + Kafka + TimescaleDB + CQRS)** (Chosen)

## Decision Outcome
We choose **Option 2: Distributed Microservices with CQRS**.

### Rationale
* **Spring WebFlux:** Provides a fully reactive, event-loop-driven stack that handles high concurrency with minimal CPU overhead.
* **Kafka Event Bus:** Decouples trade execution from compliance logging, allowing parallel scaling.
* **TimescaleDB Partitioning:** Ensures that audit and market tick logs are partitioned automatically by day, avoiding lookup speed degradation over time.
* **CQRS Pattern:** Protects ACID transactional DBs from query heavy analytics, delegating aggregation to read-optimized continuous materialized aggregates.
* **Multi-Agent Orchestration:** Configured utilizing free-of-charge Python scripts utilizing the Gemini API to manage automated sprint validation, PR reviews, and self-healing deployments.

## Consequences
* **Positives:** Unlimited scaling capability, robust financial trace auditing, and decoupled services.
* **Negatives:** Increased operations complexity, requiring automated DevSecOps (ArgoCD + Helm).
