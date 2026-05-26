variable "aws_region" {
  description = "AWS Region for FinPulse Cluster"
  type        = string
  default     = "us-east-1"
}

variable "gcp_project" {
  description = "GCP Project ID for dual-cloud redundancy"
  type        = string
  default     = "finpulse-prod-gcp"
}

variable "gcp_region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}
