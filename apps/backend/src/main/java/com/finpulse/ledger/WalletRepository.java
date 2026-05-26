package com.finpulse.ledger;

import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Repository
public interface WalletRepository extends R2dbcRepository<Wallet, UUID> {

    @Query("SELECT * FROM wallets WHERE user_id = :userId")
    Mono<Wallet> findByUserId(UUID userId);

    @Query("SELECT * FROM wallets WHERE user_id = :userId FOR UPDATE")
    Mono<Wallet> findByUserIdForUpdate(UUID userId);
}
