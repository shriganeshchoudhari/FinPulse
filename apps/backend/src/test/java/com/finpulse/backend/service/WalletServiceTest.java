package com.finpulse.backend.service;

import com.finpulse.backend.domain.model.LedgerEntry;
import com.finpulse.backend.domain.model.Wallet;
import com.finpulse.backend.domain.repository.LedgerRepository;
import com.finpulse.backend.domain.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class WalletServiceTest {

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private LedgerRepository ledgerRepository;

    @InjectMocks
    private WalletService walletService;

    @Captor
    private ArgumentCaptor<LedgerEntry> ledgerEntryCaptor;

    private UUID userId;
    private String currency;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        currency = "USD";
    }

    @Test
    void testDoDebit_Success() {
        // Arrange
        BigDecimal initialBalance = new BigDecimal("100.00");
        BigDecimal debitAmount = new BigDecimal("40.00");
        Wallet wallet = Wallet.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .currency(currency)
                .balance(initialBalance)
                .updatedAt(Instant.now())
                .build();

        when(walletRepository.findByUserIdAndCurrencyForUpdate(userId, currency))
                .thenReturn(Optional.of(wallet));

        // Act
        Wallet updatedWallet = walletService.doDebit(userId, currency, debitAmount);

        // Assert
        assertNotNull(updatedWallet);
        assertEquals(new BigDecimal("60.00"), updatedWallet.getBalance());

        verify(walletRepository).save(wallet);
        verify(ledgerRepository).save(ledgerEntryCaptor.capture());

        LedgerEntry savedEntry = ledgerEntryCaptor.getValue();
        assertEquals(userId, savedEntry.getUserId());
        assertEquals(currency, savedEntry.getCurrency());
        assertEquals(debitAmount, savedEntry.getAmount());
        assertEquals("DEBIT", savedEntry.getTransactionType());
        assertNotNull(savedEntry.getCreatedAt());
    }

    @Test
    void testDoDebit_InsufficientBalance() {
        // Arrange
        BigDecimal initialBalance = new BigDecimal("10.00");
        BigDecimal debitAmount = new BigDecimal("40.00");
        Wallet wallet = Wallet.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .currency(currency)
                .balance(initialBalance)
                .updatedAt(Instant.now())
                .build();

        when(walletRepository.findByUserIdAndCurrencyForUpdate(userId, currency))
                .thenReturn(Optional.of(wallet));

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            walletService.doDebit(userId, currency, debitAmount);
        });
        
        assertEquals("Insufficient balance", exception.getMessage());

        verify(walletRepository, never()).save(any());
        verify(ledgerRepository, never()).save(any());
    }

    @Test
    void testDoCredit_Success() {
        // Arrange
        BigDecimal initialBalance = new BigDecimal("100.00");
        BigDecimal creditAmount = new BigDecimal("40.00");
        Wallet wallet = Wallet.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .currency(currency)
                .balance(initialBalance)
                .updatedAt(Instant.now())
                .build();

        when(walletRepository.findByUserIdAndCurrencyForUpdate(userId, currency))
                .thenReturn(Optional.of(wallet));

        // Act
        Wallet updatedWallet = walletService.doCredit(userId, currency, creditAmount);

        // Assert
        assertNotNull(updatedWallet);
        assertEquals(new BigDecimal("140.00"), updatedWallet.getBalance());

        verify(walletRepository).save(wallet);
        verify(ledgerRepository).save(ledgerEntryCaptor.capture());

        LedgerEntry savedEntry = ledgerEntryCaptor.getValue();
        assertEquals(userId, savedEntry.getUserId());
        assertEquals(currency, savedEntry.getCurrency());
        assertEquals(creditAmount, savedEntry.getAmount());
        assertEquals("CREDIT", savedEntry.getTransactionType());
        assertNotNull(savedEntry.getCreatedAt());
    }
}
