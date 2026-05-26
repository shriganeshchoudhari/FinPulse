package com.finpulse.backend.domain.repository;

import com.finpulse.backend.domain.model.Trade;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Flux;

public interface TradeRepository extends R2dbcRepository<Trade, Long> {
    Flux<Trade> findByUserIdOrderByCreatedAtDesc(Long userId);
    Flux<Trade> findBySymbolAndStatus(String symbol, String status);
}
