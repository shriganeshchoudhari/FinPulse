package com.finpulse.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finpulse.backend.domain.event.MarketTickEvent;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.socket.client.ReactorNettyWebSocketClient;
import org.springframework.web.reactive.socket.client.WebSocketClient;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.net.URI;

@Service
@RequiredArgsConstructor
public class BinanceDataIngestionService {

    private static final Logger log = LoggerFactory.getLogger(BinanceDataIngestionService.class);
    private static final String BINANCE_WS_URL = "wss://stream.binance.com:9443/ws/btcusdt@trade/ethusdt@trade";

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final WebSocketClient client = new ReactorNettyWebSocketClient();

    @PostConstruct
    public void startIngestion() {
        log.info("Starting Binance Live Market Data Ingestion...");
        client.execute(URI.create(BINANCE_WS_URL), session -> session.receive()
                .map(message -> message.getPayloadAsText())
                .flatMap(this::processTick)
                .then()).subscribe(
                        null,
                        err -> log.error("Binance WebSocket error", err),
                        () -> log.warn("Binance WebSocket closed"));
    }

    private Mono<Void> processTick(String payload) {
        try {
            JsonNode jsonNode = objectMapper.readTree(payload);

            // Binance trade stream JSON:
            // { "s": "BTCUSDT", "p": "40000.00", "q": "0.1", "T": 1629837498123 ... }
            String symbol = jsonNode.get("s").asText();
            if (symbol.equals("BTCUSDT"))
                symbol = "BTC/USD";
            else if (symbol.equals("ETHUSDT"))
                symbol = "ETH/USD";

            BigDecimal price = new BigDecimal(jsonNode.get("p").asText());
            BigDecimal volume = new BigDecimal(jsonNode.get("q").asText());
            long timestamp = jsonNode.get("T").asLong();

            MarketTickEvent event = new MarketTickEvent(symbol, price, volume, timestamp);

            // Publish raw live data into our internal Kafka market.ticks topic
            kafkaTemplate.send("market.ticks", symbol, event);

        } catch (Exception e) {
            log.error("Failed to parse Binance tick: {}", payload, e);
        }
        return Mono.empty();
    }
}
