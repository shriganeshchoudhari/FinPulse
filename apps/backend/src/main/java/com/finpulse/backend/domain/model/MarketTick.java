package com.finpulse.backend.domain.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("market_ticks")
public class MarketTick {
    @Id
    private Instant timestamp;
    private String symbol;
    private BigDecimal price;
    private BigDecimal volume;
}
