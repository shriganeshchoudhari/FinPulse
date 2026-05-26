package com.finpulse.backend.domain.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Table("wallets")
public class Wallet {
    @Id
    private Long id;
    private Long userId;
    private String currency;
    private BigDecimal balance;
    private BigDecimal lockedBalance;
    private LocalDateTime updatedAt;
}
