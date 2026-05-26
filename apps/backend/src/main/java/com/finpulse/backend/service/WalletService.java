package com.finpulse.backend.service;

import com.finpulse.backend.domain.model.Wallet;
import com.finpulse.backend.domain.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;

    @Transactional
    public Mono<Wallet> debitWallet(Long userId, String currency, BigDecimal amount) {
        return walletRepository.findByUserIdAndCurrency(userId, currency)
                .flatMap(wallet -> {
                    if (wallet.getBalance().compareTo(amount) < 0) {
                        return Mono.error(new RuntimeException("Insufficient balance"));
                    }
                    wallet.setBalance(wallet.getBalance().subtract(amount));
                    return walletRepository.save(wallet);
                });
    }

    @Transactional
    public Mono<Wallet> creditWallet(Long userId, String currency, BigDecimal amount) {
        return walletRepository.findByUserIdAndCurrency(userId, currency)
                .flatMap(wallet -> {
                    wallet.setBalance(wallet.getBalance().add(amount));
                    return walletRepository.save(wallet);
                });
    }

    public Mono<Wallet> getWallet(Long userId, String currency) {
        return walletRepository.findByUserIdAndCurrency(userId, currency);
    }
}
