package com.finpulse.trade;

import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;

import java.util.UUID;

@Repository
public interface TradeRepository extends R2dbcRepository<Trade, UUID> {
    Flux<Trade> findByUserId(UUID userId);
}
