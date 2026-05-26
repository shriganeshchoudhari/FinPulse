package com.finpulse.backend.service;

import com.finpulse.backend.domain.model.Trade;
import com.finpulse.backend.domain.repository.TradeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class TradeService {

    private final TradeRepository tradeRepository;

    public Mono<Trade> executeTrade(Trade trade) {
        trade.setCreatedAt(LocalDateTime.now());
        trade.setStatus("PENDING");
        // In a real system, we would publish to Kafka, wait for matching engine, etc.
        // For now, we simulate execution
        trade.setStatus("COMPLETED");
        trade.setExecutedAt(LocalDateTime.now());
        return tradeRepository.save(trade);
    }

    public Flux<Trade> getUserTrades(Long userId) {
        return tradeRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}
