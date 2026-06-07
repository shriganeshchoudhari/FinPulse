package com.finpulse.backend.service;

import com.finpulse.backend.domain.event.MarketTickEvent;
import com.finpulse.backend.domain.repository.MarketTickRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Sinks;

import java.math.BigDecimal;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class MarketDataConsumer {
    private static final Logger logger = LoggerFactory.getLogger(MarketDataConsumer.class);

    private final Sinks.Many<MarketTickEvent> marketTickSink;
    private final MarketTickRepository marketTickRepository;

    @KafkaListener(topics = "market.ticks", groupId = "finpulse-group")
    public void consumeMarketTick(MarketTickEvent event) {
        logger.debug("Received market tick: {} at price {}", event.getSymbol(), event.getPrice());
        
        // Save to TimescaleDB / PostgreSQL
        BigDecimal volume = event.getVolume() != null ? event.getVolume() : BigDecimal.ZERO;
        marketTickRepository.insertTick(
                Instant.ofEpochMilli(event.getTimestamp()),
                event.getSymbol(),
                event.getPrice(),
                volume
        ).subscribe(
                null,
                error -> logger.error("Failed to save market tick to database for {}", event.getSymbol(), error)
        );

        marketTickSink.tryEmitNext(event);
    }
}
