package com.finpulse.trade;

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

    private final TradeCommandService tradeCommandService;
    private final TradeRepository tradeRepository;

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Mono<TradeCommandService.TradeResponse> executeTrade(@RequestBody TradeCommandService.TradeRequest request) {
        return tradeCommandService.processTradeCommand(request);
    }

    @GetMapping("/user/{userId}")
    public Flux<Trade> getUserTradeHistory(@PathVariable UUID userId) {
        return tradeRepository.findByUserId(userId);
    }
}
