package com.finpulse.trade;

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
@Table("trades")
public class Trade {
    @Id
    private UUID id;
    @Column("user_id")
    private UUID userId;
    private String symbol;
    private String side; // BUY, SELL
    private BigDecimal quantity;
    private BigDecimal price;
    private String status; // PENDING, COMPLETED, FAILED
    @Column("created_at")
    private Instant createdAt;
}
