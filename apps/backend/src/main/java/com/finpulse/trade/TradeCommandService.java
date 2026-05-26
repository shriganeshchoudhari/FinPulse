package com.finpulse.trade;

import com.finpulse.ledger.LedgerService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TradeCommandService {

    private final TradeRepository tradeRepository;
    private final LedgerService ledgerService;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public Mono<TradeResponse> processTradeCommand(TradeRequest request) {
        log.info("Ingesting trade command: user={}, symbol={}, side={}", request.getUserId(), request.getSymbol(), request.getSide());

        // Create initial pending trade record
        Trade pendingTrade = Trade.builder()
                .userId(request.getUserId())
                .symbol(request.getSymbol())
                .side(request.getSide())
                .quantity(request.getQuantity())
                .price(request.getPrice())
                .status("PENDING")
                .createdAt(Instant.now())
                .build();

        return tradeRepository.save(pendingTrade)
                .flatMap(savedTrade -> {
                    Mono<Void> ledgerOperation;
                    if ("BUY".equalsIgnoreCase(request.getSide())) {
                        ledgerOperation = ledgerService.executeAssetPurchase(
                                request.getUserId(), request.getSymbol(), request.getQuantity(), request.getPrice()
                        );
                    } else {
                        ledgerOperation = ledgerService.executeAssetSale(
                                request.getUserId(), request.getSymbol(), request.getQuantity(), request.getPrice()
                        );
                    }

                    return ledgerOperation
                            .then(Mono.defer(() -> {
                                savedTrade.setStatus("COMPLETED");
                                return tradeRepository.save(savedTrade);
                            }))
                            .onErrorResume(error -> {
                                log.error("Ledger execution failed for trade {}: {}", savedTrade.getId(), error.getMessage());
                                savedTrade.setStatus("FAILED");
                                return tradeRepository.save(savedTrade);
                            })
                            .flatMap(finalTrade -> {
                                // Emit trade outcome into Kafka event bus asynchronously
                                return Mono.fromRunnable(() -> {
                                    TradeExecutedEvent event = new TradeExecutedEvent(
                                            finalTrade.getId(),
                                            finalTrade.getUserId(),
                                            finalTrade.getSymbol(),
                                            finalTrade.getSide(),
                                            finalTrade.getQuantity(),
                                            finalTrade.getPrice(),
                                            finalTrade.getStatus(),
                                            finalTrade.getCreatedAt().toString()
                                    );
                                    kafkaTemplate.send("trade.events", finalTrade.getUserId().toString(), event);
                                    log.info("Dispatched TradeExecutedEvent to Kafka for trade: {}", finalTrade.getId());
                                }).thenReturn(new TradeResponse(finalTrade.getId(), finalTrade.getStatus(), "Trade processed successfully."));
                            });
                })
                .subscribeOn(Schedulers.boundedElastic());
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TradeRequest {
        private UUID userId;
        private String symbol;
        private String side; // BUY, SELL
        private BigDecimal quantity;
        private BigDecimal price;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TradeResponse {
        private UUID tradeId;
        private String status;
        private String message;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TradeExecutedEvent {
        private UUID tradeId;
        private UUID userId;
        private String symbol;
        private String side;
        private BigDecimal quantity;
        private BigDecimal price;
        private String status;
        private String timestamp;
    }
}
