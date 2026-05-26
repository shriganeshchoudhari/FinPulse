# Technical Design Document (TDD) - FinPulse

## 1. High-Performance Concurrency & Thread Pool Architecture

To support high-concurrency trades, we leverage **Java 21 Virtual Threads** and configure a custom `ThreadPoolTaskExecutor` for non-blocking I/O operations and database transaction locks.

### Thread Configuration Spec
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
}
```

---

## 2. CQRS Command & Query Separation

We segregate commands and queries using different data stores. The Write DB utilizes classical PostgreSQL ACID transactions, whereas the Read DB leverages TimescaleDB hypertables with materialized views.

```
                  [POST /trades/buy]
                          |
                          v
               [TradeCommandController]
                          |
             (Invokes TradeCommandService)
                          |
              [PESSIMISTIC_WRITE Lock] -> Commit Wallet Balance
                          |
               (Emits TradeExecutedEvent)
                          |
                          +--> [Kafka topic: trade.events]
                                       |
                                       +---> Ingested by [ComplianceService] -> Write Audit Log
                                       +---> Ingested by [AnalyticsProjectionService] -> Refresh View
```

---

## 3. Reactive Programming Model (Spring WebFlux)

All user-facing controllers utilize `Mono` and `Flux` from Project Reactor to avoid thread blocking, maximizing server throughput.

### Trade API Reactive Example
```java
@RestController
@RequestMapping("/api/v1/trades")
public class TradeController {

    private final TradeCommandService tradeService;

    public TradeController(TradeCommandService tradeService) {
        this.tradeService = tradeService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Mono<TradeResponse> executeTrade(@RequestBody Mono<TradeRequest> requestMono) {
        return requestMono
                .flatMap(tradeService::processTradeCommand)
                .subscribeOn(Schedulers.boundedElastic());
    }
}
```
