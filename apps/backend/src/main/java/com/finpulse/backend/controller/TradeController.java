package com.finpulse.backend.controller;

import com.finpulse.backend.domain.model.Trade;
import com.finpulse.backend.service.TradeService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/trades")
@RequiredArgsConstructor
public class TradeController {

    private final TradeService tradeService;

    @PostMapping
    public Mono<Trade> placeOrder(@RequestBody Trade trade) {
        return tradeService.executeTrade(trade);
    }

    @GetMapping("/user/{userId}")
    public Flux<Trade> getUserTrades(@PathVariable Long userId) {
        return tradeService.getUserTrades(userId);
    }
}
