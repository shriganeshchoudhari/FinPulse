package com.finpulse.backend.service;

import com.finpulse.backend.domain.event.MarketTickEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MarketDataConsumer {
    private static final Logger logger = LoggerFactory.getLogger(MarketDataConsumer.class);

    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    @KafkaListener(topics = "market.ticks", groupId = "finpulse-group")
    public void consumeMarketTick(MarketTickEvent event) {
        logger.debug("Received market tick: {} at price {}", event.getSymbol(), event.getPrice());
        messagingTemplate.convertAndSend("/topic/ticks", event);
    }
}
