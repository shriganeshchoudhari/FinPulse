package com.finpulse.backend.domain.event;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarketTickEvent {
    private String symbol;
    private BigDecimal price;
    private BigDecimal volume;
    private long timestamp;
}
