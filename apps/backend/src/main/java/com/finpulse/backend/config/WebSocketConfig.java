package com.finpulse.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.finpulse.backend.domain.event.MarketTickEvent;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.HandlerMapping;
import org.springframework.web.reactive.handler.SimpleUrlHandlerMapping;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.server.support.WebSocketHandlerAdapter;
import reactor.core.publisher.Sinks;

import java.util.Map;

@Configuration
public class WebSocketConfig {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Bean
    public Sinks.Many<MarketTickEvent> marketTickSink() {
        return Sinks.many().multicast().onBackpressureBuffer();
    }

    @Bean
    public WebSocketHandler marketDataHandler(Sinks.Many<MarketTickEvent> sink) {
        return session -> {
            var flux = sink.asFlux()
                    .map(event -> {
                        try {
                            return session.textMessage(objectMapper.writeValueAsString(event));
                        } catch (Exception e) {
                            return session.textMessage("{\"error\": \"serialization failed\"}");
                        }
                    });
            return session.send(flux);
        };
    }

    @Bean
    public HandlerMapping webSocketHandlerMapping(WebSocketHandler marketDataHandler) {
        return new SimpleUrlHandlerMapping(Map.of("/ws/market-data", marketDataHandler), -1);
    }

    @Bean
    public WebSocketHandlerAdapter webSocketHandlerAdapter() {
        return new WebSocketHandlerAdapter();
    }
}
