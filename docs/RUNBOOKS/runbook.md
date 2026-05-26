# Operations Runbook & Incident Response

This document outlines operations procedures, troubleshooting flows, and release plans for the FinPulse production platform.

---

## 1. Observability Alerts & Remediation

### Alert: `KafkaConsumerLagTooHigh`
- **Severity:** Critical
- **Trigger:** Ticker or trade queue consumer lag > 10,000 messages for 2 consecutive minutes.
- **Remediation Action:**
  1. Inspect HPA (Horizontal Pod Autoscaler) status. Run:
     ```bash
     kubectl get hpa -n finpulse
     ```
  2. If pod scaling is blocked by resource quotas, increase HPA max replicas manually or scale the deployment deployment replica count:
     ```bash
     kubectl scale deployment trade-engine-service --replicas=10 -n finpulse
     ```
  3. Validate database lock congestion using `pg_stat_activity`.

### Alert: `HighPessimisticLockContention`
- **Severity:** High
- **Trigger:** Database queries waiting for locks exceeding 1,000ms.
- **Remediation Action:**
  1. Terminate long-running query blocks:
     ```sql
     SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND age(clock_timestamp(), query_start) > interval '5 seconds';
     ```

---

## 2. Dual Cloud Kubernetes Deployment (GitOps)

Deployments are managed declaratively using ArgoCD.

### Trigger ArgoCD Sync Manually
```bash
argocd app sync finpulse-production --prune
```

### Rollback Strategy
If a deployment triggers high failure rates:
1. Revert the target commit on the master branch:
   ```bash
   git revert <commit-hash>
   git push origin master
   ```
2. ArgoCD will instantly notice the Git reversion and sync the cluster back to the previous stable state (under 30 seconds).
