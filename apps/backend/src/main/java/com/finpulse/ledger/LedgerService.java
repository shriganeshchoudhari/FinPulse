package com.finpulse.ledger;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class LedgerService {

    private final WalletRepository walletRepository;
    private final PortfolioAssetRepository assetRepository;

    @Transactional
    public Mono<Void> executeAssetPurchase(UUID userId, String symbol, BigDecimal quantity, BigDecimal price) {
        BigDecimal totalCost = price.multiply(quantity);
        log.info("Processing asset purchase for user: {}, symbol: {}, totalCost: {}", userId, symbol, totalCost);

        // Step 1: Pessimistic Write Lock on user's wallet
        return walletRepository.findByUserIdForUpdate(userId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("User wallet not found")))
                .flatMap(wallet -> {
                    if (wallet.getBalance().compareTo(totalCost) < 0) {
                        return Mono.error(new IllegalStateException("Insufficient funds for purchase"));
                    }

                    // Deduct balance and update wallet
                    wallet.setBalance(wallet.getBalance().subtract(totalCost));
                    wallet.setUpdatedAt(Instant.now());
                    return walletRepository.save(wallet);
                })
                // Step 2: Pessimistic Write Lock on the specific asset portfolio
                .then(assetRepository.findByUserIdAndSymbolForUpdate(userId, symbol)
                        .flatMap(asset -> {
                            // Update existing asset
                            BigDecimal currentQty = asset.getQuantity();
                            BigDecimal newQty = currentQty.add(quantity);
                            
                            // Average price recalculation
                            BigDecimal totalValue = currentQty.multiply(asset.getAvgPrice()).add(totalCost);
                            BigDecimal newAvgPrice = totalValue.divide(newQty, 4, RoundingMode.HALF_UP);
                            
                            asset.setQuantity(newQty);
                            asset.setAvgPrice(newAvgPrice);
                            asset.setUpdatedAt(Instant.now());
                            return assetRepository.save(asset);
                        })
                        .switchIfEmpty(
                                // Create new portfolio asset record if it does not exist
                                assetRepository.save(PortfolioAsset.builder()
                                        .userId(userId)
                                        .symbol(symbol)
                                        .quantity(quantity)
                                        .avgPrice(price)
                                        .updatedAt(Instant.now())
                                        .build())
                        )
                )
                .then();
    }

    @Transactional
    public Mono<Void> executeAssetSale(UUID userId, String symbol, BigDecimal quantity, BigDecimal price) {
        BigDecimal totalEarnings = price.multiply(quantity);
        log.info("Processing asset sale for user: {}, symbol: {}, totalEarnings: {}", userId, symbol, totalEarnings);

        // Step 1: Pessimistic Lock on Asset portfolio first
        return assetRepository.findByUserIdAndSymbolForUpdate(userId, symbol)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("User does not hold this asset")))
                .flatMap(asset -> {
                    if (asset.getQuantity().compareTo(quantity) < 0) {
                        return Mono.error(new IllegalStateException("Insufficient asset quantity to complete sale"));
                    }

                    // Deduct asset
                    BigDecimal newQty = asset.getQuantity().subtract(quantity);
                    if (newQty.compareTo(BigDecimal.ZERO) == 0) {
                        return assetRepository.delete(asset).then(Mono.empty());
                    } else {
                        asset.setQuantity(newQty);
                        asset.setUpdatedAt(Instant.now());
                        return assetRepository.save(asset);
                    }
                })
                // Step 2: Lock wallet and deposit cash earnings
                .then(walletRepository.findByUserIdForUpdate(userId)
                        .switchIfEmpty(Mono.error(new IllegalArgumentException("User wallet not found")))
                        .flatMap(wallet -> {
                            wallet.setBalance(wallet.getBalance().add(totalEarnings));
                            wallet.setUpdatedAt(Instant.now());
                            return walletRepository.save(wallet);
                        })
                )
                .then();
    }
}
