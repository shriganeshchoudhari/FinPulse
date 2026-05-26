package com.finpulse.identity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("users")
public class User {
    @Id
    private UUID id;
    private String username;
    private String email;
    @Column("password_hash")
    private String passwordHash;
    @Column("kyc_status")
    private String kycStatus; // PENDING, APPROVED, REJECTED
    @Column("created_at")
    private Instant createdAt;
}
