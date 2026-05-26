package com.finpulse.backend.service;

import com.finpulse.backend.domain.event.MarketTickEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class MarketSimulatorService {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final Random random = new Random();
    private BigDecimal currentPrice = new BigDecimal("45000.00");

    @Scheduled(fixedRate = 1000)
    public void simulateMarketTick() {
        // Random walk for price
        double fluctuation = (random.nextDouble() - 0.5) * 50;
        currentPrice = currentPrice.add(BigDecimal.valueOf(fluctuation)).setScale(2, RoundingMode.HALF_UP);
        
        BigDecimal volume = BigDecimal.valueOf(random.nextDouble() * 2).setScale(4, RoundingMode.HALF_UP);
        
        MarketTickEvent tick = new MarketTickEvent("BTC/USD", currentPrice, volume, System.currentTimeMillis());
        
        kafkaTemplate.send("market.ticks", "BTC/USD", tick);
    }
}
