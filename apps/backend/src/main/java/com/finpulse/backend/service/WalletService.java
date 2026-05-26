package com.finpulse.backend.service;

import com.finpulse.backend.domain.model.Wallet;
import com.finpulse.backend.domain.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WalletService {

    private static final Logger log = LoggerFactory.getLogger(WalletService.class);
    private final WalletRepository walletRepository;

    @Transactional
    public Mono<Wallet> debitWallet(UUID userId, String currency, BigDecimal amount) {
        return walletRepository.findByUserIdAndCurrencyForUpdate(userId, currency)
                .switchIfEmpty(Mono.error(new RuntimeException("Wallet not found for user " + userId)))
                .flatMap(wallet -> {
                    if (wallet.getBalance().compareTo(amount) < 0) {
                        return Mono.error(new RuntimeException("Insufficient balance"));
                    }
                    wallet.setBalance(wallet.getBalance().subtract(amount));
                    wallet.setUpdatedAt(Instant.now());
                    log.info("Debiting {} {} from wallet {} for user {}", amount, currency, wallet.getId(), userId);
                    return walletRepository.save(wallet);
                });
    }

    @Transactional
    public Mono<Wallet> creditWallet(UUID userId, String currency, BigDecimal amount) {
        return walletRepository.findByUserIdAndCurrencyForUpdate(userId, currency)
                .switchIfEmpty(Mono.error(new RuntimeException("Wallet not found for user " + userId)))
                .flatMap(wallet -> {
                    wallet.setBalance(wallet.getBalance().add(amount));
                    wallet.setUpdatedAt(Instant.now());
                    log.info("Crediting {} {} to wallet {} for user {}", amount, currency, wallet.getId(), userId);
                    return walletRepository.save(wallet);
                });
    }

    public Mono<Wallet> getWallet(UUID userId, String currency) {
        return walletRepository.findByUserIdAndCurrency(userId, currency);
    }
}
