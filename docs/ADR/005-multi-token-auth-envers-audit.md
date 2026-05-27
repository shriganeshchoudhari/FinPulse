# ADR 005: Multi-Token Authentication and Envers Auditing

## Status
Accepted

## Context
As FinPulse targets enterprise clients, security and compliance are top priorities. We need a secure, scalable authentication mechanism that protects against token theft while providing a seamless user experience. Furthermore, we must maintain an immutable compliance trail for all critical data changes to satisfy regulatory and enterprise auditing requirements.

## Decision
1. **Multi-Token Authentication:** We will adopt a stateless multi-token authentication architecture.
   - **Access Token:** A short-lived JWT (e.g., 15 minutes) used for API authorization. Sent via the `Authorization` header.
   - **Refresh Token:** A long-lived, opaque token stored in an `HttpOnly`, `Secure` cookie to mitigate XSS attacks.
   - **Revocation & Redis:** A Redis store will be used to track revoked refresh tokens and support instantaneous session termination across distributed services.
2. **Hibernate Envers for Auditing:** We will use Hibernate Envers to automatically generate and manage `_AUD` (audit) tables for all critical business entities. Envers will hook into the JPA lifecycle to record every insert, update, and delete operation, storing the previous state and the timestamp/user responsible for the change.

## Consequences

### Positive
- **Security:** Short-lived access tokens reduce the window of vulnerability. `HttpOnly` refresh cookies protect against XSS.
- **Scalability:** Stateless JWTs reduce database lookups for API calls.
- **Compliance:** Envers provides a guaranteed, immutable audit trail with minimal custom code.
- **Session Management:** Redis enables robust token revocation and active session management.

### Negative
- **Infrastructure Complexity:** Requires managing a Redis instance and configuring JWT infrastructure.
- **Database Storage:** Envers creates a shadow table for every audited entity, significantly increasing database storage requirements over time.
- **Performance:** Writing to audit tables adds overhead to every data modification operation.

## Implementation Notes
- The frontend must handle the refresh token flow seamlessly when the access token expires.
- Redis will store tokens with a TTL matching their expiration to ensure automatic cleanup.
- Envers will be configured to capture the authenticated user ID (via a custom `RevisionEntity`) to associate changes with specific users.
