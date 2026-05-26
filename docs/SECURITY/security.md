# Security & Compliance Architecture

FinPulse implements a multi-layered security framework designed to achieve financial compliance standards (SOC2 Type II, PCI-DSS, GDPR, SEC Rule 17a-4).

---

## 1. Authentication & API Security
- **OAuth2 + JWT with Redis Invalidation:** Active session tokens are verified on the Spring Cloud Gateway. Whenever a user logs out or rotates their password, the active JTI (JWT ID) is blacklisted in Redis with an expiration matching the remaining lifespan of the token.
- **Rate Limiting:** Enforced via Redis Token Bucket algorithm at the API gateway layer (maximum 50 requests/minute per IP address for standard trading APIs).

---

## 2. Cryptographic Controls
- **Data in Transit:** Enforced minimum TLS 1.3 for all external traffic. Internal service-to-service communication is secured via mutual TLS (mTLS) managed by Linkerd/Istio Service Mesh.
- **Data at Rest:** Database partitions are encrypted using AES-256 with AWS Key Management Service (KMS) or Google Cloud KMS keys. Secrets are stored in HashiCorp Vault or Kubernetes Secrets sealed with SOPS.

---

## 3. Compliance Frameworks

### 3.1 Immutable Auditing (SEC 17a-4)
All transaction audit logs are written to TimescaleDB hypertables. Once a row is written:
- Row-level database triggers block `UPDATE` and `DELETE` requests on the `audit_logs` table.
- Continuous backups are stored in AWS S3 Glacier with Object Lock enabled in WORM (Write Once, Read Many) mode.

### 3.2 GDPR Compliance
- **Right to Be Forgotten:** User anonymization scripts are provided to wipe user columns from the active `users` table, replacing sensitive items (name, email) with random hash values. Audit trails remain unchanged due to security regulations but contain no direct PII.
