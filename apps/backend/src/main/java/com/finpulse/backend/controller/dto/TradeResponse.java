package com.finpulse.backend.controller.dto;

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
public class TradeResponse {
    private UUID id;
    private UUID userId;
    private String symbol;
    private String side;
    private BigDecimal quantity;
    private BigDecimal price;
    private String status;
    private Instant createdAt;
}
