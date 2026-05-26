package com.finpulse.backend.domain.repository;

import com.finpulse.backend.domain.model.AuditLog;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface AuditLogRepository extends R2dbcRepository<AuditLog, UUID> {
    Flux<AuditLog> findByUserIdOrderByTimestampDesc(UUID userId);

    @Query("INSERT INTO audit_logs (timestamp, id, user_id, action, details) VALUES (NOW(), :id, :userId, :action, CAST(:details AS jsonb))")
    Mono<Void> insertAuditLog(UUID id, UUID userId, String action, String details);
}
