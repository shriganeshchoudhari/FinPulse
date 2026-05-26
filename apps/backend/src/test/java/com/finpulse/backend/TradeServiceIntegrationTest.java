package com.finpulse.backend;

import com.finpulse.backend.domain.model.Trade;
import com.finpulse.backend.domain.repository.TradeRepository;
import com.finpulse.backend.service.TradeService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import reactor.test.StepVerifier;

import java.math.BigDecimal;

@SpringBootTest
@Testcontainers
public class TradeServiceIntegrationTest {

    @Container
    @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:14-alpine")
            .withDatabaseName("finpulse_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.r2dbc.url", () -> "r2dbc:postgresql://" + postgres.getHost() + ":" + postgres.getFirstMappedPort() + "/" + postgres.getDatabaseName());
        registry.add("spring.r2dbc.username", postgres::getUsername);
        registry.add("spring.r2dbc.password", postgres::getPassword);
        // Disable Flyway in test or configure it to run against the container
    }

    @Autowired
    private TradeService tradeService;

    @Autowired
    private TradeRepository tradeRepository;

    @Test
    void shouldExecuteTradeAndSaveToDatabase() {
        Trade trade = new Trade();
        trade.setUserId(java.util.UUID.randomUUID());
        trade.setSymbol("BTC/USD");
        trade.setSide("BUY");
        trade.setQuantity(new BigDecimal("0.5"));
        trade.setPrice(new BigDecimal("45000.00"));

        StepVerifier.create(
            tradeService.executeTrade(trade)
                .flatMap(savedTrade -> tradeRepository.findById(savedTrade.getId()))
        )
        .expectNextMatches(savedTrade -> 
            savedTrade.getId() != null && 
            "COMPLETED".equals(savedTrade.getStatus())
        )
        .verifyComplete();
    }
}
