package com.finpulse.ledger;

import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Repository
public interface PortfolioAssetRepository extends R2dbcRepository<PortfolioAsset, UUID> {

    Flux<PortfolioAsset> findByUserId(UUID userId);

    @Query("SELECT * FROM portfolio_assets WHERE user_id = :userId AND symbol = :symbol")
    Mono<PortfolioAsset> findByUserIdAndSymbol(UUID userId, String symbol);

    @Query("SELECT * FROM portfolio_assets WHERE user_id = :userId AND symbol = :symbol FOR UPDATE")
    Mono<PortfolioAsset> findByUserIdAndSymbolForUpdate(UUID userId, String symbol);
}
