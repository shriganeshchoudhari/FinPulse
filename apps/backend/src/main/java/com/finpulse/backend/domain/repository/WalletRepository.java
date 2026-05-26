package com.finpulse.backend.domain.repository;

import com.finpulse.backend.domain.model.Wallet;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.data.r2dbc.repository.Query;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface WalletRepository extends R2dbcRepository<Wallet, Long> {
    Flux<Wallet> findByUserId(Long userId);
    
    @Query("SELECT * FROM wallets WHERE user_id = :userId AND currency = :currency FOR UPDATE")
    Mono<Wallet> findByUserIdAndCurrencyForUpdate(Long userId, String currency);

    Mono<Wallet> findByUserIdAndCurrency(Long userId, String currency);
}
