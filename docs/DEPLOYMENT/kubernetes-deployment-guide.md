# Kubernetes Deployment Guide — FinPulse
**Version:** 1.1.0 | **Last Updated:** 2026-06-03 | **Status:** Active

---

## 1. Overview

FinPulse is deployed on Kubernetes using a **GitOps workflow via ArgoCD**. All manifests live in `infra/k8s/`. Deployments are triggered automatically when a new image tag is pushed and detected by ArgoCD.

### Cluster Layout

```
finpulse-prod namespace:
├── Deployments
│   ├── finpulse-backend          (Spring Boot API)
│   ├── finpulse-frontend         (React + NGINX)
│   └── finpulse-market-simulator (Price Feed)
├── StatefulSets
│   ├── postgresql
│   ├── kafka
│   └── redis
├── Services
│   ├── finpulse-backend-svc      (ClusterIP)
│   ├── finpulse-frontend-svc     (ClusterIP)
│   └── postgresql-svc            (ClusterIP)
├── Ingress
│   └── finpulse-ingress          (NGINX + TLS)
├── HPAs
│   ├── finpulse-backend-hpa
│   └── finpulse-frontend-hpa
├── Secrets
│   ├── db-credentials
│   ├── jwt-secret
│   ├── kafka-credentials
│   └── redis-credentials
└── ConfigMaps
    ├── app-config
    └── logging-config
```

---

## 2. Prerequisites

```bash
# Tools required
kubectl >= 1.28
helm >= 3.12
argocd CLI >= 2.8
docker >= 24.0

# Verify cluster access
kubectl cluster-info
kubectl get nodes

# Set namespace context
kubectl config set-context --current --namespace=finpulse-prod
```

---

## 3. Namespace & RBAC Setup

```yaml
# infra/k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: finpulse-prod
  labels:
    app.kubernetes.io/managed-by: argocd
    environment: production
---
# Service account for backend pods
apiVersion: v1
kind: ServiceAccount
metadata:
  name: finpulse-backend-sa
  namespace: finpulse-prod
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: finpulse-backend-role
  namespace: finpulse-prod
rules:
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: finpulse-backend-rb
  namespace: finpulse-prod
subjects:
  - kind: ServiceAccount
    name: finpulse-backend-sa
roleRef:
  kind: Role
  name: finpulse-backend-role
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f infra/k8s/namespace.yaml
```

---

## 4. Secrets

```bash
# Create DB credentials secret
kubectl create secret generic db-credentials \
  --from-literal=POSTGRES_USER=finpulse \
  --from-literal=POSTGRES_PASSWORD=<strong-password> \
  --from-literal=POSTGRES_DB=finpulsedb \
  -n finpulse-prod

# Create JWT signing key secret
kubectl create secret generic jwt-secret \
  --from-file=JWT_PRIVATE_KEY=./secrets/jwt-private.pem \
  --from-file=JWT_PUBLIC_KEY=./secrets/jwt-public.pem \
  -n finpulse-prod

# Redis password
kubectl create secret generic redis-credentials \
  --from-literal=REDIS_PASSWORD=<redis-password> \
  -n finpulse-prod

# Kafka credentials
kubectl create secret generic kafka-credentials \
  --from-literal=KAFKA_SASL_USERNAME=finpulse \
  --from-literal=KAFKA_SASL_PASSWORD=<kafka-password> \
  -n finpulse-prod
```

---

## 5. ConfigMap

```yaml
# infra/k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: finpulse-prod
data:
  SPRING_PROFILES_ACTIVE: "prod"
  SERVER_PORT: "8080"
  POSTGRES_HOST: "postgresql-svc"
  POSTGRES_PORT: "5432"
  KAFKA_BOOTSTRAP_SERVERS: "kafka-svc:9092"
  REDIS_HOST: "redis-svc"
  REDIS_PORT: "6379"
  MARKET_TICK_INTERVAL_MS: "500"
  JWT_EXPIRY_SECONDS: "900"
  JWT_REFRESH_EXPIRY_DAYS: "7"
  CORS_ALLOWED_ORIGINS: "https://app.finpulse.dev"
```

---

## 6. Backend Deployment

```yaml
# infra/k8s/deployments/backend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: finpulse-backend
  namespace: finpulse-prod
  labels:
    app: finpulse-backend
    version: "1.0.0"
spec:
  replicas: 2
  selector:
    matchLabels:
      app: finpulse-backend
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0       # Zero-downtime rolling update
  template:
    metadata:
      labels:
        app: finpulse-backend
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/actuator/prometheus"
    spec:
      serviceAccountName: finpulse-backend-sa
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
      containers:
        - name: finpulse-backend
          image: registry.finpulse.dev/finpulse-backend:1.0.0
          imagePullPolicy: Always
          ports:
            - containerPort: 8080
              name: http
          envFrom:
            - configMapRef:
                name: app-config
          env:
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: POSTGRES_USER
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: POSTGRES_PASSWORD
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: redis-credentials
                  key: REDIS_PASSWORD
          volumeMounts:
            - name: jwt-keys
              mountPath: /app/secrets/jwt
              readOnly: true
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "2000m"
              memory: "2Gi"
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 15
            failureThreshold: 3
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
      volumes:
        - name: jwt-keys
          secret:
            secretName: jwt-secret
---
apiVersion: v1
kind: Service
metadata:
  name: finpulse-backend-svc
  namespace: finpulse-prod
spec:
  selector:
    app: finpulse-backend
  ports:
    - port: 80
      targetPort: 8080
      name: http
  type: ClusterIP
```

---

## 7. Frontend Deployment

```yaml
# infra/k8s/deployments/frontend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: finpulse-frontend
  namespace: finpulse-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: finpulse-frontend
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: finpulse-frontend
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 101        # NGINX non-root user
      containers:
        - name: finpulse-frontend
          image: registry.finpulse.dev/finpulse-frontend:1.0.0
          imagePullPolicy: Always
          ports:
            - containerPort: 3000
          env:
            - name: VITE_API_BASE_URL
              value: "https://api.finpulse.dev"
            - name: VITE_WS_URL
              value: "wss://api.finpulse.dev"
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          readinessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: finpulse-frontend-svc
  namespace: finpulse-prod
spec:
  selector:
    app: finpulse-frontend
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

---

## 8. Horizontal Pod Autoscaling

```yaml
# infra/k8s/hpa/backend-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: finpulse-backend-hpa
  namespace: finpulse-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: finpulse-backend
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: External
      external:
        metric:
          name: kafka_consumer_lag_sum
          selector:
            matchLabels:
              consumer_group: "trade-processor"
        target:
          type: AverageValue
          averageValue: "5000"    # Scale up if lag > 5,000 messages
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 120
```

---

## 9. Ingress with TLS

```yaml
# infra/k8s/ingress/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: finpulse-ingress
  namespace: finpulse-prod
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload";
      more_set_headers "X-Content-Type-Options: nosniff";
      more_set_headers "X-Frame-Options: DENY";
spec:
  tls:
    - hosts:
        - app.finpulse.dev
        - api.finpulse.dev
      secretName: finpulse-tls
  rules:
    - host: app.finpulse.dev
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: finpulse-frontend-svc
                port:
                  number: 80
    - host: api.finpulse.dev
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: finpulse-backend-svc
                port:
                  number: 80
          - path: /ws
            pathType: Prefix
            backend:
              service:
                name: finpulse-backend-svc
                port:
                  number: 80
          - path: /actuator/health
            pathType: Exact
            backend:
              service:
                name: finpulse-backend-svc
                port:
                  number: 80
```

---

## 10. ArgoCD Application Definition

```yaml
# infra/argocd/finpulse-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: finpulse-prod
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/finpulse/finpulse.git
    targetRevision: main
    path: infra/k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: finpulse-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
    retry:
      limit: 3
      backoff:
        duration: 10s
        factor: 2
        maxDuration: 3m
```

---

## 11. Full Deployment Sequence (First Time)

```bash
# 1. Create namespace and RBAC
kubectl apply -f infra/k8s/namespace.yaml

# 2. Create secrets (see §4)
# ...

# 3. Apply ConfigMap
kubectl apply -f infra/k8s/configmap.yaml

# 4. Install cert-manager (if not already present)
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set installCRDs=true

# 5. Apply ClusterIssuer for Let's Encrypt
kubectl apply -f infra/k8s/cert-manager/cluster-issuer.yaml

# 6. Install NGINX Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# 7. Deploy stateful infrastructure (PostgreSQL, Kafka, Redis)
kubectl apply -f infra/k8s/statefulsets/

# 8. Wait for DB to be ready
kubectl wait --for=condition=ready pod \
  -l app=postgresql -n finpulse-prod --timeout=120s

# 9. Register ArgoCD application (GitOps takes over from here)
kubectl apply -f infra/argocd/finpulse-app.yaml

# 10. Verify all pods running
kubectl get pods -n finpulse-prod

# 11. Verify ingress & TLS
curl -I https://app.finpulse.dev
curl -I https://api.finpulse.dev/actuator/health
```

---

## 12. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-05-27 | FinPulse Team | Initial Kubernetes deployment guide |
| 1.1.0 | 2026-06-03 | FinPulse Team | Added HPA Kafka lag metric, security contexts, ArgoCD manifest, TLS ingress annotations, full deployment sequence |
