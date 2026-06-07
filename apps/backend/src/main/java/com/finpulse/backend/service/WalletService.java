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
    private final com.finpulse.backend.domain.repository.LedgerRepository ledgerRepository;

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private WalletService self;

    @Transactional("transactionManager")
    public Wallet doDebit(UUID userId, String currency, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }
        Wallet wallet = walletRepository.findByUserIdAndCurrencyForUpdate(userId, currency)
                .orElseThrow(() -> new RuntimeException("Wallet not found for user " + userId));
        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new RuntimeException("Insufficient balance");
        }
        wallet.setBalance(wallet.getBalance().subtract(amount));
        wallet.setUpdatedAt(Instant.now());
        log.info("Debiting {} {} from wallet {} for user {}", amount, currency, wallet.getId(), userId);
        walletRepository.save(wallet);
        ledgerRepository.save(com.finpulse.backend.domain.model.LedgerEntry.builder()
                .userId(userId)
                .currency(currency)
                .amount(amount)
                .transactionType("DEBIT")
                .createdAt(Instant.now())
                .build());
        return wallet;
    }

    @Transactional("transactionManager")
    public Wallet doCredit(UUID userId, String currency, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }
        Wallet wallet = walletRepository.findByUserIdAndCurrencyForUpdate(userId, currency)
                .orElseThrow(() -> new RuntimeException("Wallet not found for user " + userId));
        wallet.setBalance(wallet.getBalance().add(amount));
        wallet.setUpdatedAt(Instant.now());
        log.info("Crediting {} {} to wallet {} for user {}", amount, currency, wallet.getId(), userId);
        walletRepository.save(wallet);
        ledgerRepository.save(com.finpulse.backend.domain.model.LedgerEntry.builder()
                .userId(userId)
                .currency(currency)
                .amount(amount)
                .transactionType("CREDIT")
                .createdAt(Instant.now())
                .build());
        return wallet;
    }

    public Mono<Wallet> debitWallet(UUID userId, String currency, BigDecimal amount) {
        return Mono.fromCallable(() -> self.doDebit(userId, currency, amount))
                .subscribeOn(reactor.core.scheduler.Schedulers.boundedElastic());
    }

    public Mono<Wallet> creditWallet(UUID userId, String currency, BigDecimal amount) {
        return Mono.fromCallable(() -> self.doCredit(userId, currency, amount))
                .subscribeOn(reactor.core.scheduler.Schedulers.boundedElastic());
    }

    public Mono<Wallet> getWallet(UUID userId, String currency) {
        return Mono.fromCallable(() -> walletRepository.findByUserIdAndCurrency(userId, currency))
                .subscribeOn(reactor.core.scheduler.Schedulers.boundedElastic())
                .flatMap(optWallet -> optWallet.map(Mono::just).orElseGet(Mono::empty));
    }
}
