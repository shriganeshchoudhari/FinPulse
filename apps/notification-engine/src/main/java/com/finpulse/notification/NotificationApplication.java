package com.finpulse.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@SpringBootApplication
public class NotificationApplication {
    public static void main(String[] args) {
        SpringApplication.run(NotificationApplication.class, args);
    }
}

@Slf4j
@Component
class NotificationHandler extends TextWebSocketHandler {

    // All active sessions
    private final CopyOnWriteArrayList<WebSocketSession> sessions = new CopyOnWriteArrayList<>();
    
    // Sessions mapped by userId for direct notifications
    private final ConcurrentHashMap<String, CopyOnWriteArrayList<WebSocketSession>> userSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.add(session);
        String userId = getUserIdFromSession(session);
        if (userId != null) {
            userSessions.computeIfAbsent(userId, k -> new CopyOnWriteArrayList<>()).add(session);
            log.info("WebSocket session established for user: {}", userId);
        } else {
            log.info("WebSocket session established (anonymous)");
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session);
        String userId = getUserIdFromSession(session);
        if (userId != null) {
            CopyOnWriteArrayList<WebSocketSession> userList = userSessions.get(userId);
            if (userList != null) {
                userList.remove(session);
                if (userList.isEmpty()) {
                    userSessions.remove(userId);
                }
            }
            log.info("WebSocket session closed for user: {}", userId);
        }
    }

    public void broadcast(String message) {
        TextMessage textMessage = new TextMessage(message);
        for (WebSocketSession session : sessions) {
            try {
                if (session.isOpen()) {
                    session.sendMessage(textMessage);
                }
            } catch (IOException e) {
                log.error("Failed to send broadcast message to session: {}", session.getId(), e);
            }
        }
    }

    public void sendToUser(String userId, String message) {
        CopyOnWriteArrayList<WebSocketSession> list = userSessions.get(userId);
        if (list != null) {
            TextMessage textMessage = new TextMessage(message);
            for (WebSocketSession session : list) {
                try {
                    if (session.isOpen()) {
                        session.sendMessage(textMessage);
                    }
                } catch (IOException e) {
                    log.error("Failed to send user message to session: {}", session.getId(), e);
                }
            }
        }
    }

    private String getUserIdFromSession(WebSocketSession session) {
        URI uri = session.getUri();
        if (uri != null && uri.getQuery() != null) {
            String query = uri.getQuery();
            for (String param : query.split("&")) {
                String[] pair = param.split("=");
                if (pair.length > 1 && "userId".equals(pair[0])) {
                    return pair[1];
                }
            }
        }
        return null;
    }
}

@Configuration
@EnableWebSocket
class WebSocketConfig implements WebSocketConfigurer {

    private final NotificationHandler notificationHandler;

    public WebSocketConfig(NotificationHandler notificationHandler) {
        this.notificationHandler = notificationHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(notificationHandler, "/ws/notifications")
                .setAllowedOrigins("*");
    }
}

@Slf4j
@Component
class KafkaEventConsumer {

    private final NotificationHandler notificationHandler;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public KafkaEventConsumer(NotificationHandler notificationHandler) {
        this.notificationHandler = notificationHandler;
    }

    @KafkaListener(topics = "market.ticks", groupId = "finpulse-notification-group")
    public void consumeMarketTick(Map<String, Object> tick) {
        try {
            String json = objectMapper.writeValueAsString(Map.of("type", "TICK", "data", tick));
            notificationHandler.broadcast(json);
        } catch (Exception e) {
            log.error("Failed to serialize market tick", e);
        }
    }

    @KafkaListener(topics = "trade.events", groupId = "finpulse-notification-group")
    public void consumeTradeEvent(Map<String, Object> tradeEvent) {
        log.info("Received trade event to notify: {}", tradeEvent);
        String userId = (String) tradeEvent.get("userId");
        if (userId != null) {
            try {
                String json = objectMapper.writeValueAsString(Map.of("type", "TRADE", "data", tradeEvent));
                notificationHandler.sendToUser(userId, json);
            } catch (Exception e) {
                log.error("Failed to serialize trade event", e);
            }
        }
    }
}
