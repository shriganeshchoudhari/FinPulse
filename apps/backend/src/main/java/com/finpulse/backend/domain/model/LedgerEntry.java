package com.finpulse.backend.domain.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "ledger_entries")
public class LedgerEntry {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    private String currency;

    private BigDecimal amount;

    @Column(name = "transaction_type")
    private String transactionType; // CREDIT, DEBIT

    @Column(name = "reference_id")
    private UUID referenceId; // e.g., trade_id

    @Column(name = "created_at")
    private Instant createdAt;
}
