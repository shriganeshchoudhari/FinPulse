package com.finpulse.backend.service;

import com.finpulse.backend.domain.event.MarketTickEvent;
import com.finpulse.backend.domain.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final TradeRepository tradeRepository;
    
    // Store latest prices in memory for fast PnL calculation
    private final Map<String, BigDecimal> latestPrices = new ConcurrentHashMap<>();

    @KafkaListener(topics = "market.ticks", groupId = "finpulse-analytics")
    public void consumeMarketTick(MarketTickEvent event) {
        latestPrices.put(event.getSymbol(), event.getPrice());
    }

    public Mono<PortfolioAnalytics> calculateUserPortfolio(UUID userId) {
        return tradeRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .collectList()
                .map(trades -> {
                    // Calculate net position per symbol
                    Map<String, BigDecimal> positions = trades.stream()
                            .filter(t -> "COMPLETED".equals(t.getStatus()))
                            .collect(Collectors.toMap(
                                    t -> t.getSymbol(),
                                    t -> "BUY".equals(t.getSide()) ? t.getQuantity() : t.getQuantity().negate(),
                                    BigDecimal::add
                            ));

                    // Calculate total unrealized PnL based on entry vs current price
                    BigDecimal totalValue = BigDecimal.ZERO;
                    for (Map.Entry<String, BigDecimal> entry : positions.entrySet()) {
                        BigDecimal currentPrice = latestPrices.getOrDefault(entry.getKey(), BigDecimal.ZERO);
                        totalValue = totalValue.add(entry.getValue().multiply(currentPrice));
                    }

                    return new PortfolioAnalytics(userId, positions, totalValue);
                });
    }

    public record PortfolioAnalytics(UUID userId, Map<String, BigDecimal> positions, BigDecimal totalEstimatedValue) {}
}
