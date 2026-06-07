package com.finpulse.backend.controller;

import com.finpulse.backend.domain.model.Candle;
import com.finpulse.backend.domain.repository.MarketTickRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/v1/market")
@RequiredArgsConstructor
public class MarketController {

    private final MarketTickRepository marketTickRepository;

    @GetMapping("/symbols")
    public Flux<String> getSymbols() {
        return marketTickRepository.findDistinctSymbols()
                // Default fallback if simulator hasn't started or table is empty
                .switchIfEmpty(Flux.just("BTC/USD", "ETH/USD", "AAPL", "MSFT", "TSLA"));
    }

    @GetMapping("/{symbol}/history")
    public Flux<Candle> getHistory(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "1D") String range) {
        
        int limit = 100;
        if ("1H".equalsIgnoreCase(range)) {
            limit = 60;
        } else if ("1D".equalsIgnoreCase(range)) {
            limit = 1440;
        } else if ("1W".equalsIgnoreCase(range)) {
            limit = 2000;
        } else if ("1M".equalsIgnoreCase(range)) {
            limit = 5000;
        }
        
        return marketTickRepository.findHistory(symbol, limit);
    }
}
