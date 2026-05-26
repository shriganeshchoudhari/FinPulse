package com.finpulse.backend.service;

import com.finpulse.backend.domain.event.TradeExecutedEvent;
import com.finpulse.backend.domain.model.Trade;
import com.finpulse.backend.domain.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TradeService {

    private static final Logger log = LoggerFactory.getLogger(TradeService.class);
    private final TradeRepository tradeRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional
    public Mono<Trade> executeTrade(Trade trade) {
        trade.setCreatedAt(Instant.now());
        trade.setStatus("PENDING");
        
        return tradeRepository.save(trade)
                .doOnSuccess(savedTrade -> {
                    // CQRS: Publish trade event to Kafka for downstream consumers
                    savedTrade.setStatus("COMPLETED");
                    TradeExecutedEvent event = TradeExecutedEvent.builder()
                            .tradeId(savedTrade.getId())
                            .userId(savedTrade.getUserId())
                            .symbol(savedTrade.getSymbol())
                            .side(savedTrade.getSide())
                            .quantity(savedTrade.getQuantity())
                            .price(savedTrade.getPrice())
                            .status("COMPLETED")
                            .executedAt(Instant.now())
                            .build();
                    
                    kafkaTemplate.send("trade.events", savedTrade.getSymbol(), event)
                            .whenComplete((result, ex) -> {
                                if (ex != null) {
                                    log.error("Failed to publish trade event for trade {}", savedTrade.getId(), ex);
                                } else {
                                    log.info("Published trade event for trade {} to partition {}",
                                            savedTrade.getId(), result.getRecordMetadata().partition());
                                }
                            });
                })
                .flatMap(savedTrade -> {
                    savedTrade.setStatus("COMPLETED");
                    return tradeRepository.save(savedTrade);
                });
    }

    public Flux<Trade> getUserTrades(UUID userId) {
        return tradeRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}
