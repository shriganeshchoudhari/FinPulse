package com.finpulse.backend.controller;

import com.finpulse.backend.domain.model.AuditLog;
import com.finpulse.backend.domain.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping("/user/{userId}")
    public Flux<AuditLog> getUserAuditLogs(@PathVariable UUID userId) {
        return auditLogRepository.findByUserIdOrderByTimestampDesc(userId);
    }

    @GetMapping("/export")
    public Mono<ResponseEntity<Flux<String>>> exportAuditLogs(@RequestParam UUID userId) {
        Flux<String> csvHeader = Flux.just("Timestamp,ID,UserID,Action,Details\n");
        Flux<String> csvRows = auditLogRepository.findByUserIdOrderByTimestampDesc(userId)
                .map(log -> {
                    String detailsEscaped = log.getDetails() != null ? log.getDetails().replace("\"", "\"\"") : "";
                    return String.format("%s,%s,%s,%s,\"%s\"\n",
                            log.getTimestamp() != null ? log.getTimestamp().toString() : "",
                            log.getId() != null ? log.getId().toString() : "",
                            log.getUserId() != null ? log.getUserId().toString() : "",
                            log.getAction() != null ? log.getAction() : "",
                            detailsEscaped);
                });
        
        Flux<String> csvContent = Flux.concat(csvHeader, csvRows);

        return Mono.just(ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=audit_log_" + userId + ".csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvContent));
    }
}
