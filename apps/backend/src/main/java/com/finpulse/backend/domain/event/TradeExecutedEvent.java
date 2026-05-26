package com.finpulse.backend.domain.event;

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
public class TradeExecutedEvent {
    private UUID tradeId;
    private UUID userId;
    private String symbol;
    private String side;
    private BigDecimal quantity;
    private BigDecimal price;
    private String status;
    private Instant executedAt;
}
