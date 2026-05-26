package com.finpulse.backend.service;

import com.finpulse.backend.domain.event.TradeExecutedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OrderBookService {

    private static final Logger log = LoggerFactory.getLogger(OrderBookService.class);
    
    // We maintain a separate matching engine per symbol
    private final Map<String, MatchingEngine> matchingEngines = new ConcurrentHashMap<>();

    @KafkaListener(topics = "trade.events", groupId = "finpulse-matching-engine")
    public void consumeTradeEvent(TradeExecutedEvent event) {
        log.info("OrderBook received trade event for symbol: {}, side: {}, qty: {}, price: {}", 
                event.getSymbol(), event.getSide(), event.getQuantity(), event.getPrice());
        
        // Ensure we only match orders that are pending or newly executed
        if (event.getStatus() != null && !event.getStatus().equals("COMPLETED")) {
            MatchingEngine engine = matchingEngines.computeIfAbsent(event.getSymbol(), k -> new MatchingEngine());
            engine.addOrder(event);
        }
    }
    
    public MatchingEngine getEngineForSymbol(String symbol) {
        return matchingEngines.get(symbol);
    }
}
