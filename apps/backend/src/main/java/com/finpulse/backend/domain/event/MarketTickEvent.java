package com.finpulse.backend.domain.event;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.math.BigDecimal;

import lombok.Builder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MarketTickEvent {
    private String symbol;
    private BigDecimal price;
    private BigDecimal volume;
    private long timestamp;
}
