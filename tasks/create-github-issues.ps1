#!/usr/bin/env pwsh
# create-github-issues.ps1
# This script creates GitHub issues for the FinPulse Advanced Enterprise Roadmap

$Repository = "shriganeshchoudhari/FinPulse"

# Ensure gh cli is installed and authenticated
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "GitHub CLI (gh) is not installed. Please install it and authenticate."
    exit 1
}

$Issues = @(
    @{ Title="[Security] Implement OAuth2/JWT Refresh Tokens"; Body="**Tasks:**`n- Add Refresh Token entity and repository.`n- Create `/auth/refresh` endpoint.`n- Update frontend to intercept 401s and refresh automatically." },
    @{ Title="[Security] Redis-Based Token Revocation"; Body="**Tasks:**`n- Integrate Spring Data Redis.`n- Store token signatures/jti in Redis on logout/revocation.`n- Add JWT filter check against Redis blacklist." },
    @{ Title="[Security] API Rate Limiting with Bucket4j"; Body="**Tasks:**`n- Integrate Bucket4j.`n- Create RateLimitFilter or Interceptor.`n- Define rate limit tiers based on user roles or IP." },

    @{ Title="[Market Data] Virtual Threads Market Data Simulator"; Body="**Tasks:**`n- Enable Java 21 Virtual Threads.`n- Create a Simulator Service generating stock price ticks.`n- Utilize Virtual Threads for concurrent ticker generation." },
    @{ Title="[Market Data] Kafka Integration for Market Data Streaming"; Body="**Tasks:**`n- Add spring-kafka dependencies.`n- Publish simulated ticks to a `market-data` Kafka topic.`n- Create a Kafka listener in the WebSocket service." },
    @{ Title="[Market Data] STOMP WebSockets for Real-Time Price Updates"; Body="**Tasks:**`n- Configure Spring WebSocket with STOMP.`n- Broadcast Kafka market data to WebSocket topics.`n- Implement connection security (token auth on connect)." },
    @{ Title="[Market Data] React Virtualized Dashboard"; Body="**Tasks:**`n- Integrate `react-virtualized` or `react-window`.`n- Create a real-time data grid component.`n- Connect frontend WebSocket client to the data grid." },

    @{ Title="[Portfolio] Double-Entry Ledger System"; Body="**Tasks:**`n- Create `LedgerTransaction` and `LedgerEntry` entities.`n- Refactor Wallet deposit/withdrawal to generate paired ledger entries.`n- Ensure sum of entries is always zero." },
    @{ Title="[Portfolio] Pessimistic Locking for Transactions"; Body="**Tasks:**`n- Add `@Lock(LockModeType.PESSIMISTIC_WRITE)` to Wallet repository queries.`n- Handle lock timeout exceptions gracefully." },
    @{ Title="[Portfolio] Smart Portfolio Rebalancing"; Body="**Tasks:**`n- Create Allocation Target schema.`n- Implement a Rebalance Service to calculate required buy/sell orders.`n- Expose `/portfolio/rebalance` endpoint." },
    @{ Title="[Portfolio] Historical Charts for Portfolio"; Body="**Tasks:**`n- Create a scheduled task to snapshot portfolio value daily.`n- Expose API to fetch historical snapshots.`n- Integrate Chart.js or Recharts on the frontend." },

    @{ Title="[Trade] Limit Orders"; Body="**Tasks:**`n- Update `Order` entity with order type (MARKET, LIMIT) and target price.`n- Create an Order Matching engine that listens to market data.`n- Execute limit orders when conditions are met." },
    @{ Title="[Trade] Async Workers for Trade Execution"; Body="**Tasks:**`n- Configure `@EnableAsync` with a custom ThreadPoolTaskExecutor.`n- Move trade execution logic to `@Async` methods." },
    @{ Title="[Trade] Strict @Transactional Boundaries"; Body="**Tasks:**`n- Review and refine `@Transactional` annotations on trade services.`n- Write integration tests verifying rollback on failure." },

    @{ Title="[Compliance] Hibernate Envers Integration"; Body="**Tasks:**`n- Add Hibernate Envers dependency.`n- Annotate `User`, `Wallet`, `Order`, and `Portfolio` with `@Audited`.`n- Verify audit tables are generated." },
    @{ Title="[Compliance] Postgres Triggers for Critical Tables"; Body="**Tasks:**`n- Write Flyway migration scripts for audit trigger functions.`n- Apply triggers to `ledger_entry` and `users` tables." },
    @{ Title="[Compliance] Compliance Portal"; Body="**Tasks:**`n- Create API endpoints to query Envers revisions.`n- Build a React Compliance Dashboard restricted to ADMIN/COMPLIANCE roles." },

    @{ Title="[Infra] Docker Compose Setup"; Body="**Tasks:**`n- Create `docker-compose.yml` including Postgres, Redis, Kafka, Zookeeper, and the Spring Boot app.`n- Configure application properties for Docker environments." },
    @{ Title="[Infra] Prometheus Metrics"; Body="**Tasks:**`n- Add Spring Boot Actuator and Micrometer Prometheus registry.`n- Expose `/actuator/prometheus` endpoint.`n- Add custom metrics for trade execution latency and volume." },
    @{ Title="[Infra] Grafana Dashboards"; Body="**Tasks:**`n- Add Grafana to `docker-compose.yml`.`n- Provision a default dashboard JSON file for JVM, API, and Trade metrics." }
)

Write-Host "Creating $($Issues.Count) issues in repository $Repository..."

foreach ($Issue in $Issues) {
    Write-Host "Creating issue: $($Issue.Title)"
    gh issue create --repo $Repository --title $Issue.Title --body $Issue.Body
}

Write-Host "All issues created successfully!"
