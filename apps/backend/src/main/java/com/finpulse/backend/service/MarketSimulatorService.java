package com.finpulse.backend.service;

import com.finpulse.backend.domain.event.MarketTickEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class MarketSimulatorService {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final Random random = new Random();

    private final List<String> symbols = List.of("BTC/USD", "ETH/USD", "SOL/USD");

    // Start a virtual thread for each tick generation or use @Scheduled if virtual threads are enabled globally
    @Scheduled(fixedRate = 500)
    public void generateMarketData() {
        Thread.startVirtualThread(() -> {
            for (String symbol : symbols) {
                BigDecimal price = BigDecimal.valueOf(random.nextDouble() * 1000 + 100);
                BigDecimal volume = BigDecimal.valueOf(random.nextDouble() * 10);
                
                MarketTickEvent event = MarketTickEvent.builder()
                        .symbol(symbol)
                        .price(price)
                        .volume(volume)
                        .timestamp(Instant.now().toEpochMilli())
                        .build();

                kafkaTemplate.send("market.ticks", symbol, event);
                log.debug("Simulated tick published for {}: {}", symbol, price);
            }
        });
    }
}
