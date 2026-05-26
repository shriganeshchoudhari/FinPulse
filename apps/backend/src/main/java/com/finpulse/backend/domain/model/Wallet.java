package com.finpulse.backend.domain.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
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

    private String currency;

    private BigDecimal balance;

    @Column("locked_balance")
    private BigDecimal lockedBalance;

    @Column("updated_at")
    private Instant updatedAt;
}
