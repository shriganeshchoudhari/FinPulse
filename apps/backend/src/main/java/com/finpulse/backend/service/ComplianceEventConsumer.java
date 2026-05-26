package com.finpulse.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.finpulse.backend.domain.event.TradeExecutedEvent;
import com.finpulse.backend.domain.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class ComplianceEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(ComplianceEventConsumer.class);
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ComplianceEventConsumer(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @KafkaListener(topics = "trade.events", groupId = "finpulse-compliance")
    public void consumeTradeEvent(TradeExecutedEvent event) {
        log.info("Compliance audit: Processing trade event for trade {} by user {}",
                event.getTradeId(), event.getUserId());

        String details;
        try {
            details = objectMapper.writeValueAsString(event);
        } catch (JsonProcessingException e) {
            details = "{\"error\": \"serialization failed\", \"tradeId\": \"" + event.getTradeId() + "\"}";
        }

        auditLogRepository.insertAuditLog(
                UUID.randomUUID(),
                event.getUserId(),
                "TRADE_EXECUTED",
                details
        ).subscribe(
                unused -> log.info("Audit log persisted for trade {}", event.getTradeId()),
                error -> log.error("Failed to persist audit log for trade {}", event.getTradeId(), error)
        );
    }
}
