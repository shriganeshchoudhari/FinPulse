package com.finpulse.backend.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("audit_logs")
public class AuditLog {
    private Instant timestamp;
    private UUID id;

    @Column("user_id")
    private UUID userId;

    private String action;

    private String details; // JSON string stored as JSONB
}
