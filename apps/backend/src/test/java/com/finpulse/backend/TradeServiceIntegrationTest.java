package com.finpulse.backend;

import com.finpulse.backend.domain.model.Trade;
import com.finpulse.backend.domain.repository.TradeRepository;
import com.finpulse.backend.service.TradeService;
import com.finpulse.identity.User;
import com.finpulse.identity.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import reactor.test.StepVerifier;

import java.math.BigDecimal;
import java.time.Instant;

public class TradeServiceIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private TradeService tradeService;

    @Autowired
    private TradeRepository tradeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private org.springframework.r2dbc.core.DatabaseClient databaseClient;

    @Test
    void shouldExecuteTradeAndSaveToDatabase() {
        User user = User.builder()
                .username("test_trader")
                .email("test_trader@example.com")
                .passwordHash("hashed")
                .role("ROLE_USER")
                .kycStatus("PENDING")
                .createdAt(Instant.now())
                .build();
        user = userRepository.save(user);

        Trade trade = new Trade();
        trade.setUserId(user.getId());
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
