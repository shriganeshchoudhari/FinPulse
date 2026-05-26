#!/bin/bash
set -e

echo "🚀 Installing ArgoCD on the Kubernetes cluster..."
kubectl create namespace argocd || true
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

echo "⏳ Waiting for ArgoCD server to be ready..."
kubectl wait --for=condition=Available deployment/argocd-server -n argocd --timeout=300s

echo "🚀 Applying FinPulse ArgoCD Application (GitOps)..."
# Ensure the finpulse-prod namespace exists
kubectl create namespace finpulse-prod || true

# Apply the application CRD
kubectl apply -f finpulse-application.yaml

echo "✅ ArgoCD setup complete! To access the UI locally, run:"
echo "kubectl port-forward svc/argocd-server -n argocd 8080:443"
echo "Your initial admin password is:"
echo "kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath=\"{.data.password}\" | base64 -d"
