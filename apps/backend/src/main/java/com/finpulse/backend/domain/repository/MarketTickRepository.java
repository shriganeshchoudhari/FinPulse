package com.finpulse.backend.domain.repository;

import com.finpulse.backend.domain.model.Candle;
import com.finpulse.backend.domain.model.MarketTick;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Instant;

public interface MarketTickRepository extends R2dbcRepository<MarketTick, Instant> {

    @Query("INSERT INTO market_ticks (timestamp, symbol, price, volume) VALUES (:timestamp, :symbol, :price, :volume)")
    Mono<Void> insertTick(Instant timestamp, String symbol, BigDecimal price, BigDecimal volume);

    @Query("SELECT DISTINCT symbol FROM market_ticks")
    Flux<String> findDistinctSymbols();

    @Query("SELECT bucket, symbol, open, high, low, close, volume FROM market_ticks_1m WHERE symbol = :symbol ORDER BY bucket DESC LIMIT :limit")
    Flux<Candle> findHistory(String symbol, int limit);
}
