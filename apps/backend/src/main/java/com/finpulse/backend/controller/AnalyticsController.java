package com.finpulse.backend.controller;

import com.finpulse.backend.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/portfolio/{userId}")
    public Mono<AnalyticsService.PortfolioAnalytics> getPortfolioAnalytics(@PathVariable UUID userId) {
        return analyticsService.calculateUserPortfolio(userId);
    }
}
