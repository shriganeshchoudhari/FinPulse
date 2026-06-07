# Security Policy — FinPulse
**Version:** 1.1.0 | **Last Updated:** 2026-06-03 | **Status:** Active

---

## 1. Overview

This document defines the security standards, controls, and practices for the FinPulse platform. All contributors, operators, and infrastructure engineers are expected to follow these guidelines. Security is treated as a first-class concern at every layer of the stack.

---

## 2. Authentication & Session Management

### 2.1 JWT Strategy

| Property | Value |
|----------|-------|
| Algorithm | RS256 (asymmetric — private key signs, public key verifies) |
| Access token TTL | 15 minutes |
| Refresh token TTL | 7 days (stored in PostgreSQL, HttpOnly cookie) |
| Claims | `sub` (userId), `roles`, `jti` (unique token ID), `iat`, `exp` |
| Key storage | Private key in Kubernetes Secret; mounted as env var `JWT_PRIVATE_KEY` |

### 2.2 Token Revocation

Every logout adds the token's `jti` to a Redis SET with TTL equal to the token's remaining validity:

```
SET blacklist:{jti} 1 EX {remainingSeconds}
```

The `JwtAuthenticationFilter` checks `EXISTS blacklist:{jti}` on **every** request before proceeding.

### 2.3 Refresh Token Rotation

On each refresh:
1. Old refresh token is immediately invalidated in PostgreSQL.
2. New refresh token issued and written to `HttpOnly; Secure; SameSite=Strict` cookie.
3. New access JWT returned in response body.

If a refresh token is used after invalidation (replay attack), all active sessions for that user are immediately revoked.

### 2.4 Password Policy

- Minimum 8 characters; must contain uppercase, lowercase, digit, and special character.
- Stored as BCrypt hash with cost factor 12.
- Password reset via time-limited (15-minute) signed token sent to registered email.
- Plaintext passwords never logged, cached, or stored.

---

## 3. Authorization (RBAC)

### 3.1 Role Definitions

| Role | Permitted Endpoints |
|------|---------------------|
| `ROLE_USER` | `/api/v1/auth/**`, `/api/v1/trades/**` (own), `/api/v1/wallets/**` (own), `/api/v1/market/**`, `/ws/**` |
| `ROLE_ANALYST` | `GET /api/v1/market/**`, `GET /api/v1/trades/**` (own), `/ws/market-data` |
| `ROLE_AUDITOR` | `GET /api/v1/audit/**`, all read endpoints |
| `ROLE_ADMIN` | All endpoints |

### 3.2 Method-Level Security

Spring Security `@PreAuthorize` annotations protect every service method in addition to URL-level rules:

```java
@PreAuthorize("hasRole('AUDITOR') or hasRole('ADMIN')")
public Flux<AuditLogEntry> getAuditLogs(UUID userId) { ... }

@PreAuthorize("#userId == authentication.principal.subject or hasRole('ADMIN')")
public Mono<WalletDto> getWallet(UUID userId) { ... }
```

### 3.3 Ownership Enforcement

User-scoped resources (wallets, trades, portfolio) enforce ownership at the service layer. A `ROLE_USER` can never access another user's data even if they guess a valid ID.

---

## 4. Transport Security

| Control | Configuration |
|---------|---------------|
| TLS version | 1.3 minimum; TLS 1.0/1.1/1.2 disabled at NGINX ingress |
| HSTS | `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` |
| Certificate | Let's Encrypt via `cert-manager` in Kubernetes; auto-renewed 30 days before expiry |
| Cipher suites | TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256 |
| WebSocket | WSS only (no WS over plain HTTP in any environment) |

---

## 5. Input Validation & Injection Prevention

### 5.1 API Input Validation

All request DTOs use Jakarta Validation annotations:

```java
public record TradeRequest(
    @NotBlank @Pattern(regexp = "^[A-Z]{2,10}/[A-Z]{2,10}$") String symbol,
    @NotNull @Positive BigDecimal quantity,
    @NotNull @Positive BigDecimal price,
    @NotNull TradeSide side
) {}
```

Global `@ControllerAdvice` catches `MethodArgumentNotValidException` and returns HTTP 400 with field-level error details.

### 5.2 SQL Injection Prevention

- All database access via Spring Data JPA / R2DBC with **parameterized queries only**.
- Native queries use `@Param` binding — no string concatenation.
- Flyway migration scripts reviewed in PR; no dynamic SQL in application code.

### 5.3 XSS & CSRF

- React 19 escapes all dynamic content by default.
- `Content-Security-Policy` header enforced at NGINX:
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'self' wss://; style-src 'self' 'unsafe-inline'
  ```
- CSRF protection: JWT in `Authorization` header (not cookie) for API calls; refresh token in `SameSite=Strict` cookie prevents cross-site use.

### 5.4 Security Headers

All responses from NGINX include:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 6. Secrets Management

| Secret | Storage | Access |
|--------|---------|--------|
| DB credentials | Kubernetes Secret | Injected as env vars into backend pod |
| JWT RS256 private key | Kubernetes Secret | Mounted as file, read once at startup |
| Kafka credentials | Kubernetes Secret | Injected as env vars |
| Redis password | Kubernetes Secret | Injected as env var |
| Production secrets | HashiCorp Vault (planned v1.2) | Vault Agent sidecar injection |

**Rules:**
- Secrets never committed to Git. `.gitignore` enforces `*.env`, `*.key`, `application-prod.yml`.
- `git-secrets` pre-commit hook scans for AWS/GCP/API key patterns.
- Kubernetes Secrets base64-encoded at rest; cluster uses encrypted etcd.

---

## 7. Dependency & Container Security

### 7.1 Dependency Scanning

- **Backend:** `OWASP Dependency-Check` runs in CI on every build; CVSS ≥ 7.0 fails the build.
- **Frontend:** `npm audit --audit-level=high` runs on every build.
- **Docker images:** `trivy image` scans every built image before push to registry; CRITICAL findings block release.

### 7.2 Container Hardening

```dockerfile
# Non-root user
RUN addgroup --system finpulse && adduser --system --ingroup finpulse finpulse
USER finpulse

# Read-only root filesystem (where possible)
# Minimal base image
FROM eclipse-temurin:21-jre-alpine
```

Kubernetes PodSecurityContext:
```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop: ["ALL"]
```

---

## 8. Audit & Logging

### 8.1 What Is Logged

| Event | Log Level | Destination |
|-------|-----------|------------|
| Login success / failure | INFO / WARN | Loki |
| Logout | INFO | Loki |
| Trade placed / rejected | INFO | Loki + `audit_logs` hypertable |
| Wallet debit / credit | INFO | Loki + `audit_logs` hypertable |
| Authorization failure (403) | WARN | Loki |
| JWT blacklist check failure | WARN | Loki |
| Unhandled exception | ERROR | Loki + PagerDuty alert |

### 8.2 What Is Never Logged

- Plaintext passwords
- Full JWT tokens
- Credit card / bank account numbers (not applicable in v1, enforced for future)
- Full request bodies on `/api/v1/auth/**` endpoints

### 8.3 Log Format

Structured JSON via Logback:
```json
{
  "timestamp": "2026-06-03T10:00:00.000Z",
  "level": "WARN",
  "traceId": "abc123",
  "userId": "uuid",
  "message": "Authorization failure: ROLE_USER attempted GET /api/v1/audit/...",
  "service": "finpulse-backend"
}
```

---

## 9. Incident Response

See `docs/INCIDENT_RESPONSE/incident-response-plan.md` for full procedures.

**Critical security incident contacts:**
- On-call engineer: PagerDuty rotation
- Security lead: security@finpulse.dev (monitored 24/7)

**Breach response SLA:**
- Confirmed breach → user notification within **72 hours** (GDPR Article 33)
- Token revocation of all active sessions within **15 minutes** of confirmed breach

---

## 10. Compliance & Privacy

- **GDPR:** User PII (email, username) deletable via `DELETE /api/v1/users/{id}` (soft-delete + anonymisation). Audit logs retain anonymised user reference only.
- **SOC 2 Type II (target):** Audit trail, access controls, encryption at rest and in transit, availability monitoring all in place.
- **Data retention:** Market tick data retained 90 days. Audit logs retained 7 years. User data retained until account deletion.

---

## 11. Vulnerability Disclosure

To report a security vulnerability, email `security@finpulse.dev` with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

Do **not** create public GitHub issues for security vulnerabilities. We aim to respond within 48 hours and patch within 14 days for HIGH/CRITICAL findings.

---

## 12. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-05-27 | FinPulse Team | Initial security policy |
| 1.1.0 | 2026-06-03 | FinPulse Team | Added RBAC table, CSP header, container hardening, secrets management, GDPR compliance, vulnerability disclosure |
