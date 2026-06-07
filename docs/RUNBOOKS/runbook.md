# Runbook — FinPulse Operations
**Version:** 1.1.0 | **Last Updated:** 2026-06-03 | **Audience:** On-call Engineers & DevOps

---

## 1. Platform Overview

| Component | Technology | Port | Health Check |
|-----------|-----------|------|-------------|
| Backend API | Spring Boot 3 / WebFlux | 8080 | `GET /actuator/health` |
| Frontend | React 19 / NGINX | 3000 | HTTP 200 on `/` |
| Market Simulator | Spring Boot @Scheduled | Internal | `GET /actuator/health` |
| PostgreSQL + TimescaleDB | PostgreSQL 16 | 5432 | `pg_isready` |
| Apache Kafka | Kafka 3.x | 9092 | `kafka-broker-api-versions.sh` |
| Redis | Redis 7 | 6379 | `redis-cli ping` |
| Ingress | NGINX Ingress Controller | 443 / 80 | Kubernetes probe |

---

## 2. Common Operational Tasks

### 2.1 Check Pod Status

```bash
# All pods in finpulse-prod namespace
kubectl get pods -n finpulse-prod

# Detailed status with restart counts
kubectl get pods -n finpulse-prod -o wide

# Watch pods in real-time
kubectl get pods -n finpulse-prod --watch
```

### 2.2 View Application Logs

```bash
# Backend logs (live tail)
kubectl logs -n finpulse-prod -l app=finpulse-backend -f --tail=200

# Previous crashed container logs
kubectl logs -n finpulse-prod <pod-name> --previous

# Market simulator logs
kubectl logs -n finpulse-prod -l app=finpulse-market-simulator -f

# Filter for ERROR level (via grep)
kubectl logs -n finpulse-prod -l app=finpulse-backend -f | grep '"level":"ERROR"'
```

### 2.3 Restart a Deployment

```bash
# Rolling restart (zero-downtime)
kubectl rollout restart deployment/finpulse-backend -n finpulse-prod

# Watch rollout progress
kubectl rollout status deployment/finpulse-backend -n finpulse-prod

# Rollback to previous version
kubectl rollout undo deployment/finpulse-backend -n finpulse-prod
```

### 2.4 Scale a Deployment Manually

```bash
# Scale backend to 5 replicas
kubectl scale deployment finpulse-backend --replicas=5 -n finpulse-prod

# Check HPA current state
kubectl get hpa -n finpulse-prod
kubectl describe hpa finpulse-backend-hpa -n finpulse-prod
```

### 2.5 Open a Shell in a Running Pod

```bash
# Interactive shell in backend pod
kubectl exec -it -n finpulse-prod \
  $(kubectl get pod -n finpulse-prod -l app=finpulse-backend -o jsonpath='{.items[0].metadata.name}') \
  -- /bin/sh

# Run a one-off database query via psql in the DB pod
kubectl exec -it -n finpulse-prod \
  $(kubectl get pod -n finpulse-prod -l app=postgresql -o jsonpath='{.items[0].metadata.name}') \
  -- psql -U finpulse -d finpulsedb
```

---

## 3. Database Operations

### 3.1 Connect to PostgreSQL

```bash
# Via kubectl port-forward (local dev / emergency access)
kubectl port-forward -n finpulse-prod svc/postgresql 5432:5432

# Then connect locally
psql -h localhost -U finpulse -d finpulsedb
```

### 3.2 Check Active Connections & Locks

```sql
-- Active connections by application
SELECT application_name, state, count(*)
FROM pg_stat_activity
WHERE datname = 'finpulsedb'
GROUP BY application_name, state;

-- Long-running queries (> 30 seconds)
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > INTERVAL '30 seconds'
  AND datname = 'finpulsedb';

-- Active locks (check for deadlocks)
SELECT pid, relation::regclass, mode, granted
FROM pg_locks
WHERE NOT granted;

-- Kill a long-running query
SELECT pg_terminate_backend(<pid>);
```

### 3.3 TimescaleDB Chunk Management

```sql
-- View hypertable chunk info
SELECT * FROM timescaledb_information.chunks
WHERE hypertable_name IN ('market_ticks', 'audit_logs')
ORDER BY range_start DESC
LIMIT 20;

-- Manual compression run (if policy is delayed)
SELECT compress_chunk(chunk) 
FROM show_chunks('market_ticks', older_than => INTERVAL '7 days') AS chunk;

-- Check compression stats
SELECT * FROM chunk_compression_stats('market_ticks');
```

### 3.4 Run Flyway Migrations Manually

```bash
# Via Spring Boot (auto-runs on startup)
kubectl rollout restart deployment/finpulse-backend -n finpulse-prod

# Or via Maven locally (with DB port-forwarded)
cd apps/backend
./mvnw flyway:migrate -Dflyway.url=jdbc:postgresql://localhost:5432/finpulsedb \
  -Dflyway.user=finpulse -Dflyway.password=<password>

# Check migration status
./mvnw flyway:info
```

### 3.5 Backup & Restore

```bash
# Manual backup (pg_dump into S3)
kubectl exec -n finpulse-prod <postgresql-pod> -- \
  pg_dump -U finpulse finpulsedb | \
  aws s3 cp - s3://finpulse-backups/manual/finpulsedb-$(date +%Y%m%d-%H%M%S).sql

# Restore from backup
aws s3 cp s3://finpulse-backups/manual/finpulsedb-<timestamp>.sql - | \
  kubectl exec -i -n finpulse-prod <postgresql-pod> -- \
  psql -U finpulse finpulsedb
```

---

## 4. Kafka Operations

### 4.1 Check Consumer Group Lag

```bash
# Port-forward Kafka
kubectl port-forward -n finpulse-prod svc/kafka 9092:9092

# List consumer groups
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --list

# Check lag for trade processing group
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group compliance-service

# Check all groups
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --all-groups
```

**Action required if lag > 10,000 messages:** Scale the consumer group's pod count (see section 2.4).

### 4.2 View Topic Details

```bash
# List all topics
kafka-topics.sh --bootstrap-server localhost:9092 --list

# Describe a specific topic
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --topic trade.events

# Consume messages from beginning (debug only)
kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic trade.events --from-beginning --max-messages 10
```

### 4.3 Reset Consumer Group Offset (Last Resort)

```bash
# ⚠️ ONLY use during incident recovery — causes message reprocessing
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --group compliance-service \
  --topic trade.events \
  --reset-offsets --to-latest \
  --execute
```

---

## 5. Redis Operations

### 5.1 Connect to Redis

```bash
# Port-forward
kubectl port-forward -n finpulse-prod svc/redis 6379:6379

# Connect via redis-cli
redis-cli -h localhost -a <password>
```

### 5.2 Inspect JWT Blacklist

```bash
# Count blacklisted tokens
redis-cli -h localhost -a <password> KEYS "blacklist:*" | wc -l

# Check if specific JTI is blacklisted
redis-cli -h localhost -a <password> EXISTS "blacklist:<jti>"

# View TTL on a blacklist entry
redis-cli -h localhost -a <password> TTL "blacklist:<jti>"
```

### 5.3 Emergency: Revoke All Sessions for a User

```bash
# Delete all session keys for userId
redis-cli -h localhost -a <password> DEL "session:<userId>"

# Force re-authentication by deleting refresh token in DB
kubectl exec -n finpulse-prod <postgresql-pod> -- \
  psql -U finpulse -d finpulsedb \
  -c "DELETE FROM refresh_tokens WHERE user_id = '<userId>';"
```

### 5.4 Check Memory Usage

```bash
redis-cli -h localhost -a <password> INFO memory | grep used_memory_human
redis-cli -h localhost -a <password> DBSIZE
```

---

## 6. Health & Metrics

### 6.1 Spring Boot Actuator Endpoints

```bash
# Port-forward backend
kubectl port-forward -n finpulse-prod svc/finpulse-backend 8080:8080

# Health (overall)
curl http://localhost:8080/actuator/health

# Health breakdown (requires ROLE_ADMIN token)
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:8080/actuator/health/db
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:8080/actuator/health/kafka
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:8080/actuator/health/redis

# Prometheus metrics
curl http://localhost:8080/actuator/prometheus | grep trade_

# JVM thread info
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:8080/actuator/metrics/jvm.threads.live
```

### 6.2 Grafana Dashboards

| Dashboard | URL | Key Panels |
|-----------|-----|-----------|
| JVM & Backend | `http://grafana/d/finpulse-jvm` | Heap, GC pause, thread count, HTTP latency p99 |
| Kafka Lag | `http://grafana/d/finpulse-kafka` | Consumer lag per group and topic |
| Database | `http://grafana/d/finpulse-db` | Active connections, query latency, lock wait time |
| Trade Throughput | `http://grafana/d/finpulse-trades` | TPS, order acceptance rate, error rate |

---

## 7. Deployment & Release

### 7.1 Standard Release (ArgoCD GitOps)

```bash
# 1. Tag the release in Git
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0

# 2. GitHub Actions builds Docker image, pushes to registry

# 3. ArgoCD detects new image tag, syncs deployment
# Monitor sync in ArgoCD UI or via CLI:
argocd app sync finpulse-prod
argocd app wait finpulse-prod --health

# 4. Verify rollout
kubectl rollout status deployment/finpulse-backend -n finpulse-prod
```

### 7.2 Emergency Hotfix Deployment

```bash
# Build and push image directly (bypass full CI — use sparingly)
docker build -t registry.finpulse.dev/finpulse-backend:hotfix-<timestamp> ./apps/backend
docker push registry.finpulse.dev/finpulse-backend:hotfix-<timestamp>

# Update image in cluster
kubectl set image deployment/finpulse-backend \
  finpulse-backend=registry.finpulse.dev/finpulse-backend:hotfix-<timestamp> \
  -n finpulse-prod

kubectl rollout status deployment/finpulse-backend -n finpulse-prod
```

---

## 8. Alert Response Quick Reference

| Alert | Likely Cause | First Action |
|-------|-------------|-------------|
| `BackendPodCrashLooping` | OOM or unhandled exception at startup | `kubectl logs --previous`; check DB connectivity |
| `KafkaConsumerLagHigh` (> 10k) | Consumer pod down or too slow | Scale consumer deployment; check logs |
| `DBConnectionsHigh` (> 80%) | Connection pool leak or surge | Check HikariCP metrics; restart backend pod |
| `HTTP5xxRateHigh` (> 1%) | Backend exception spike | Check ERROR logs in Grafana Loki |
| `TradeAPILatencyHigh` (p99 > 200ms) | DB lock contention or cold cache | Check pg_locks; inspect slow query log |
| `RedisPingFailed` | Redis pod down | `kubectl describe pod` for Redis; check PVC |
| `CertificateExpiringSoon` | cert-manager renewal failed | `kubectl describe certificate`; manual renew |

---

## 9. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-05-27 | FinPulse Team | Initial runbook |
| 1.1.0 | 2026-06-03 | FinPulse Team | Added Kafka ops, Redis ops, TimescaleDB management, Grafana dashboards, alert reference table |
