package com.finpulse.ledger;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("wallets")
public class Wallet {
    @Id
    private UUID id;
    @Column("user_id")
    private UUID userId;
    private BigDecimal balance;
    private String currency;
    @Column("updated_at")
    private Instant updatedAt;
}
