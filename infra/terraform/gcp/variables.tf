variable "gcp_project" {
  description = "GCP Project ID"
  type        = string
}

variable "gcp_region" {
  description = "GCP Region for resources"
  type        = string
  default     = "us-central1"
}

variable "authorized_cidr" {
  description = "CIDR block authorized to access the GKE master"
  type        = string
  default     = "0.0.0.0/0" # Restrict in production
}
