package com.finpulse.backend.controller;

import com.finpulse.backend.controller.dto.TradeRequest;
import com.finpulse.backend.controller.dto.TradeResponse;
import com.finpulse.backend.domain.model.Trade;
import com.finpulse.backend.service.TradeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/trades")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService tradeService;

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Mono<TradeResponse> placeOrder(@Valid @RequestBody TradeRequest request) {
        Trade trade = Trade.builder()
                .userId(request.getUserId())
                .symbol(request.getSymbol())
                .side(request.getSide())
                .quantity(request.getQuantity())
                .price(request.getPrice())
                .build();
        return tradeService.executeTrade(trade)
                .map(this::toResponse);
    }

    @GetMapping("/user/{userId}")
    public Flux<TradeResponse> getUserTrades(@PathVariable UUID userId) {
        return tradeService.getUserTrades(userId)
                .map(this::toResponse);
    }

    private TradeResponse toResponse(Trade trade) {
        return TradeResponse.builder()
                .id(trade.getId())
                .userId(trade.getUserId())
                .symbol(trade.getSymbol())
                .side(trade.getSide())
                .quantity(trade.getQuantity())
                .price(trade.getPrice())
                .status(trade.getStatus())
                .createdAt(trade.getCreatedAt())
                .build();
    }
}
