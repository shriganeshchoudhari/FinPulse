package com.finpulse.backend.controller.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class TradeRequest {
    @NotNull
    private UUID userId;

    @NotBlank
    private String symbol;

    @NotBlank
    @Pattern(regexp = "BUY|SELL", message = "Side must be BUY or SELL")
    private String side;

    @NotNull
    @DecimalMin(value = "0.00000001", message = "Quantity must be positive")
    private BigDecimal quantity;

    @NotNull
    @DecimalMin(value = "0.0001", message = "Price must be positive")
    private BigDecimal price;
}
