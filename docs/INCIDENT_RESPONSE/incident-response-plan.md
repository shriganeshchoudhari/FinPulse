# Incident Response Plan — FinPulse
**Version:** 1.1.0 | **Last Updated:** 2026-06-03 | **Status:** Active

---

## 1. Purpose & Scope

This document defines the structured process for detecting, triaging, resolving, and learning from incidents on the FinPulse platform. It applies to all production environments and all engineers on the on-call rotation.

An **incident** is any unplanned event that disrupts or degrades the platform's services, security posture, or data integrity.

---

## 2. Severity Levels

| Severity | Definition | Response SLA | Examples |
|----------|-----------|-------------|---------|
| **SEV-1 (Critical)** | Total service outage or confirmed data breach / data loss | Acknowledge: 5 min; Mitigate: 30 min | Backend down; DB unreachable; security breach |
| **SEV-2 (High)** | Core functionality severely degraded; significant user impact | Acknowledge: 15 min; Mitigate: 2 hours | Trade API returning 500s; Kafka consumer lag > 50k; auth failure |
| **SEV-3 (Medium)** | Non-critical feature broken; partial degradation | Acknowledge: 1 hour; Mitigate: 1 business day | Market chart not updating; report export failing |
| **SEV-4 (Low)** | Cosmetic issue; minor degradation; no user impact | Acknowledge: next business day | UI styling broken; slow admin report |

---

## 3. On-Call Contacts

| Role | Contact | Channel |
|------|---------|---------|
| Primary On-Call Engineer | PagerDuty rotation | PagerDuty alert + SMS |
| Secondary On-Call Engineer | PagerDuty escalation (15 min) | PagerDuty escalation |
| Engineering Lead | Slack `#incidents` + direct | Slack / phone |
| Security Lead | `security@finpulse.dev` | Email + Slack `#security` |
| Status Page Admin | `status@finpulse.dev` | Manual update at `status.finpulse.dev` |

---

## 4. Incident Lifecycle

### 4.1 Phase 1 — Detection

Incidents are detected via:
- **Automated alerts:** Grafana / PagerDuty fires on threshold breach (see Runbook §8)
- **User reports:** Via support channel `#support` in Slack
- **Synthetic monitoring:** Uptime checks from Grafana Synthetic Monitoring every 30 seconds
- **Engineer observation:** Manual discovery during on-call checks

**On detection, the first responder immediately:**
1. Posts in Slack `#incidents`: `🔴 INCIDENT DECLARED — [brief description] — [suspected severity]`
2. Creates an incident record (GitHub Issue with label `incident`)
3. Assigns themselves as **Incident Commander (IC)**

### 4.2 Phase 2 — Triage

Within the first 10 minutes, the IC must determine:

```
□ What is the blast radius? (which users / features affected?)
□ Is this a security incident? (data breach, unauthorized access, token compromise?)
□ What severity level applies?
□ Is there an obvious immediate mitigation? (rollback, scale-up, feature flag)
□ Who else needs to be paged?
```

**Severity determination flow:**
```
Is data being lost or is there a security breach?    → SEV-1
Is the trade API or auth completely down?            → SEV-1
Are core features severely degraded (>5% error)?     → SEV-2
Is a non-critical feature broken?                    → SEV-3
Is it cosmetic / low-impact?                         → SEV-4
```

### 4.3 Phase 3 — Communication

**Internal (Slack #incidents):**
Post a structured update every **15 minutes** for SEV-1/2, every **30 minutes** for SEV-3:

```
🔴 INCIDENT UPDATE [HH:MM UTC]
Status: Investigating / Identified / Mitigating / Resolved
Impact: [who and what is affected]
Current action: [what we are doing right now]
Next update: HH:MM UTC
IC: @engineer-name
```

**External (Status Page):**
- SEV-1 / SEV-2: Update `status.finpulse.dev` within 15 minutes of declaration
- Use plain language: *"We are experiencing issues with trade execution and are actively investigating."*
- Never speculate on root cause in public updates

### 4.4 Phase 4 — Mitigation

Common mitigation playbooks (see Runbook for commands):

| Scenario | Mitigation |
|----------|-----------|
| Backend pods crashing | `kubectl rollout undo` to previous image |
| DB connection pool exhausted | Restart backend pods; reduce pool size via config |
| Kafka consumer lag spiralling | Scale consumer deployment horizontally |
| Redis down / JWT auth broken | Failover Redis; temporarily extend JWT TTL if needed |
| Bad deployment causing 500s | Immediate rollback via ArgoCD: `argocd app rollback finpulse-prod` |
| Security breach / token compromise | Execute Emergency Token Revocation (§5) |

### 4.5 Phase 5 — Resolution

The incident is resolved when:
- The primary impact is eliminated
- Error rates return to baseline (< 0.1%)
- All affected users can use the platform normally

**On resolution:**
1. Post in `#incidents`: `✅ INCIDENT RESOLVED — [HH:MM UTC] — [one-line summary]`
2. Update status page to "All Systems Operational"
3. Mark GitHub Issue as closed
4. Schedule postmortem within 48 hours (SEV-1/2) or 1 week (SEV-3)

---

## 5. Security Incident Procedures

### 5.1 Suspected Data Breach

```
IMMEDIATE (within 15 minutes):
□ Page Security Lead + Engineering Lead
□ DO NOT delete any logs or evidence
□ Isolate affected services if possible (network policy, scale to 0)
□ Snapshot DB and Redis state for forensics
□ Preserve all Kubernetes events and pod logs

WITHIN 1 HOUR:
□ Identify the attack vector (injection, stolen token, insider threat?)
□ Determine data exposure scope (which users, what data, what time window?)
□ Rotate all secrets: DB credentials, JWT keys, Kafka credentials
□ Revoke all active JWT tokens (see §5.2)
□ Notify Engineering Lead and legal/compliance team

WITHIN 72 HOURS (GDPR Article 33):
□ Notify affected users if personal data was breached
□ File GDPR Data Breach Notification if EU user data involved
□ Document timeline and evidence for regulatory reporting
```

### 5.2 Emergency: Revoke All Active Sessions

```bash
# 1. Rotate JWT signing key (all existing tokens instantly invalid)
kubectl create secret generic jwt-secret \
  --from-literal=private-key="$(openssl genrsa 2048)" \
  -n finpulse-prod --dry-run=client -o yaml | kubectl apply -f -

# 2. Rolling restart backend to pick up new key
kubectl rollout restart deployment/finpulse-backend -n finpulse-prod

# 3. Flush Redis blacklist and sessions
redis-cli -h <redis-host> -a <password> FLUSHDB

# 4. Invalidate all refresh tokens in PostgreSQL
kubectl exec -n finpulse-prod <postgresql-pod> -- \
  psql -U finpulse -d finpulsedb \
  -c "UPDATE refresh_tokens SET revoked = true, revoked_at = NOW();"
```

### 5.3 Suspected DDoS / Rate Limit Abuse

```bash
# Check NGINX ingress request rate by IP
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx | \
  awk '{print $1}' | sort | uniq -c | sort -rn | head -20

# Block a specific IP at NGINX ingress level
kubectl annotate ingress finpulse-ingress -n finpulse-prod \
  nginx.ingress.kubernetes.io/configuration-snippet='deny <attacker-ip>;'

# Or scale up ingress + backend pods immediately
kubectl scale deployment finpulse-backend --replicas=10 -n finpulse-prod
```

---

## 6. Postmortem Process

All SEV-1 and SEV-2 incidents require a blameless postmortem within **48 hours** of resolution. SEV-3 incidents within **1 week**.

### 6.1 Postmortem Template

```markdown
## Incident Postmortem — [Incident Title]
**Date:** YYYY-MM-DD
**Severity:** SEV-X
**Duration:** HH:MM (from detection to resolution)
**IC:** @engineer-name
**Attendees:** @name1, @name2

### Impact
[What was affected, how many users, estimated business impact]

### Timeline
| Time (UTC) | Event |
|------------|-------|
| HH:MM | Alert fired / incident detected |
| HH:MM | IC assigned |
| HH:MM | Root cause identified |
| HH:MM | Mitigation applied |
| HH:MM | Incident resolved |

### Root Cause Analysis
[5 Whys or fishbone analysis — describe the technical root cause]

### What Went Well
- [item]

### What Went Poorly
- [item]

### Action Items
| Action | Owner | Due Date | Priority |
|--------|-------|----------|---------|
| [specific fix] | @engineer | YYYY-MM-DD | P1 |
```

### 6.2 Postmortem Distribution

- Postmortem document committed to `docs/INCIDENT_RESPONSE/postmortems/`
- Summary shared in Slack `#incidents` and `#engineering`
- Action items tracked as GitHub Issues with label `postmortem-action`

---

## 7. Runbook Cross-Reference

| Scenario | Runbook Section |
|----------|----------------|
| Pod crash / restart | Runbook §2.3 |
| Database lock / slow query | Runbook §3.2 |
| Kafka lag | Runbook §4.1 |
| Redis operations | Runbook §5 |
| Emergency rollback | Runbook §7.2 |
| Alert descriptions | Runbook §8 |

---

## 8. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-05-27 | FinPulse Team | Initial incident response plan |
| 1.1.0 | 2026-06-03 | FinPulse Team | Added DDoS procedure, security incident detail, full postmortem template, severity SLAs |
