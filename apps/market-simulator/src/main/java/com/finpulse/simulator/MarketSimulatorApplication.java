package com.finpulse.simulator;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@SpringBootApplication
@EnableScheduling
public class MarketSimulatorApplication {
    public static void main(String[] args) {
        SpringApplication.run(MarketSimulatorApplication.class, args);
    }
}

@Slf4j
@Component
@AllArgsConstructor
class TickPublisher implements CommandLineRunner {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    
    @Value("${simulator.delay-ms:100}")
    private final long delayMs;

    @Override
    public void run(String... args) throws Exception {
        log.info("Starting high-frequency market simulator...");
        
        Random random = new Random();
        Map<String, Double> prices = new HashMap<>();
        prices.put("AAPL", 175.0);
        prices.put("GOOG", 150.0);
        prices.put("BTC", 65000.0);
        prices.put("ETH", 3500.0);

        while (true) {
            for (String symbol : prices.keySet()) {
                double currentPrice = prices.get(symbol);
                // Simulate volatility: -0.5% to +0.5%
                double pctChange = (random.nextDouble() - 0.5) * 0.01;
                double newPrice = currentPrice * (1 + pctChange);
                prices.put(symbol, newPrice);

                BigDecimal formattedPrice = BigDecimal.valueOf(newPrice).setScale(4, RoundingMode.HALF_UP);
                BigDecimal volume = BigDecimal.valueOf(10 + random.nextDouble() * 90).setScale(2, RoundingMode.HALF_UP);

                MarketTick tick = new MarketTick(
                        Instant.now().toString(),
                        symbol,
                        formattedPrice,
                        volume
                );

                kafkaTemplate.send("market.ticker", symbol, tick);
            }
            Thread.sleep(delayMs);
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MarketTick {
        private String timestamp;
        private String symbol;
        private BigDecimal price;
        private BigDecimal volume;
    }
}
