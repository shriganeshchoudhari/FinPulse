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
@Table("trades")
public class Trade {
    @Id
    private Long id;
    private Long userId;
    private String symbol;
    private String type; // BUY, SELL
    private String orderType; // MARKET, LIMIT
    private BigDecimal amount;
    private BigDecimal price;
    private String status; // PENDING, COMPLETED, CANCELLED
    private LocalDateTime createdAt;
    private LocalDateTime executedAt;
}
