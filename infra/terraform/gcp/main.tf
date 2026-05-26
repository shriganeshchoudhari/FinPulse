# FinPulse - Google Cloud Platform (GKE) Infrastructure
# Uses GKE Autopilot for cost-effective, managed Kubernetes

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}

# --- VPC Network ---
resource "google_compute_network" "vpc" {
  name                    = "finpulse-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "finpulse-subnet"
  ip_cidr_range = "10.10.0.0/20"
  region        = var.gcp_region
  network       = google_compute_network.vpc.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.20.0.0/14"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.24.0.0/20"
  }

  private_ip_google_access = true
}

# --- GKE Autopilot Cluster ---
resource "google_container_cluster" "primary" {
  name     = "finpulse-gke"
  location = var.gcp_region

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name

  # Autopilot mode — Google manages node pools, scaling, security
  enable_autopilot = true

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Private cluster for security
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = var.authorized_cidr
      display_name = "Authorized Network"
    }
  }

  release_channel {
    channel = "REGULAR"
  }

  deletion_protection = false
}

# --- Outputs ---
output "cluster_name" {
  value = google_container_cluster.primary.name
}

output "cluster_endpoint" {
  value     = google_container_cluster.primary.endpoint
  sensitive = true
}

output "cluster_ca_certificate" {
  value     = google_container_cluster.primary.master_auth[0].cluster_ca_certificate
  sensitive = true
}
