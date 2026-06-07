# Kafka Scaling & Recovery Runbook

## Scenario 1: Consumer Lag Spiking
**Symptom:** Trade execution is fast, but wallet balances and audit logs are lagging behind (visible in Grafana).
**Action:**
1. Verify how many consumer instances are currently running.
2. If consumers < Kafka partitions, scale the `TradeCommandService` deployment:
   ```bash
   kubectl scale deployment finpulse-backend --replicas=8
   ```
3. If consumers = Kafka partitions, we must increase partitions on the `trade.events` topic and then scale consumers.

## Scenario 2: Broker Disk Full
**Symptom:** Kafka broker pods are crashing, `NoSpaceLeftOnDevice`.
**Action:**
1. Decrease retention period for high-volume topics like `market.ticks`.
   ```bash
   kafka-configs.sh --bootstrap-server kafka:9092 --alter --entity-type topics --entity-name market.ticks --add-config retention.ms=3600000
   ```
2. Provision larger Persistent Volumes (PVs) via the Helm values file and re-apply.
