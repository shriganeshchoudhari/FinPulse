package com.finpulse.identity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.envers.Audited;
import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
@Audited
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
    
    private String username;
    private String email;
    
    @Column(name = "password_hash")
    private String passwordHash;
    
    @Column(name = "kyc_status")
    private String kycStatus; // PENDING, APPROVED, REJECTED
    
    private String role; // ROLE_USER, ROLE_ANALYST, ROLE_AUDITOR, ROLE_ADMIN
    
    @Column(name = "created_at")
    private Instant createdAt;
}
