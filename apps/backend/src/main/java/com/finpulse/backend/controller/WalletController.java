package com.finpulse.backend.controller;

import com.finpulse.backend.controller.dto.WalletTransactionRequest;
import com.finpulse.backend.domain.model.Wallet;
import com.finpulse.backend.service.WalletService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/wallets")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @GetMapping("/user/{userId}/{currency}")
    public Mono<Wallet> getWallet(@PathVariable UUID userId, @PathVariable String currency) {
        return walletService.getWallet(userId, currency);
    }

    @PostMapping("/deposit")
    public Mono<Wallet> deposit(@Valid @RequestBody WalletTransactionRequest request) {
        return walletService.creditWallet(request.getUserId(), request.getCurrency(), request.getAmount());
    }

    @PostMapping("/withdraw")
    public Mono<Wallet> withdraw(@Valid @RequestBody WalletTransactionRequest request) {
        return walletService.debitWallet(request.getUserId(), request.getCurrency(), request.getAmount());
    }
}
