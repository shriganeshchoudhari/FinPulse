package com.finpulse.notification;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.Map;

@SpringBootApplication
public class NotificationApplication {
    public static void main(String[] args) {
        SpringApplication.run(NotificationApplication.class, args);
    }
}

@Configuration
@EnableWebSocketMessageBroker
class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Broadcast prefix to clients
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Handshake endpoint, allowing connections from all origins for sim purposes
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}

@Slf4j
@Component
class KafkaEventConsumer {

    private final SimpMessagingTemplate messagingTemplate;

    public KafkaEventConsumer(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @KafkaListener(topics = "market.ticker", groupId = "finpulse-notification-group")
    public void consumeMarketTick(Map<String, Object> tick) {
        // Broadcast the live price tick to all connected websocket clients listening to /topic/ticks
        messagingTemplate.convertAndSend("/topic/ticks", tick);
    }

    @KafkaListener(topics = "trade.events", groupId = "finpulse-notification-group")
    public void consumeTradeEvent(Map<String, Object> tradeEvent) {
        log.info("Received trade event to notify: {}", tradeEvent);
        String userId = (String) tradeEvent.get("userId");
        if (userId != null) {
            // Push private notification to /topic/trades/{userId}
            messagingTemplate.convertAndSend("/topic/trades/" + userId, tradeEvent);
        }
    }
}
