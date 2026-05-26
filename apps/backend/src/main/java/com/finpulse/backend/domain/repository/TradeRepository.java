package com.finpulse.backend.domain.repository;

import com.finpulse.backend.domain.model.Trade;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Flux;

import java.util.UUID;

public interface TradeRepository extends R2dbcRepository<Trade, UUID> {
    Flux<Trade> findByUserIdOrderByCreatedAtDesc(UUID userId);
    Flux<Trade> findBySymbolAndStatus(String symbol, String status);
}
