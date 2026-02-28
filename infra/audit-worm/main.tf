/**
 * DFIR-1: S3 WORM Audit Log Bucket
 *
 * What this creates:
 * - S3 bucket with Object Lock enabled (immutable storage)
 * - GOVERNANCE mode, 90-day retention (adjustable)
 * - Server-side encryption (AES-256)
 * - IAM user with write-only access (no read, no delete)
 * - Block all public access
 *
 * Deploy:
 *   terraform init
 *   terraform apply
 *   terraform output -json > /tmp/audit-s3-creds.json
 *   # Add outputs to Vercel env vars
 *
 * INTERN EXPLAINER — Why GOVERNANCE mode and not COMPLIANCE mode?
 * COMPLIANCE mode: NO ONE can delete objects, not even AWS root, not even you.
 * GOVERNANCE mode: Objects are protected BUT authorized IAM users with
 *   s3:BypassGovernanceRetention can override it (emergency situations only).
 * For AbiaEats at MVP stage, GOVERNANCE is appropriate. Switch to COMPLIANCE
 * when you have a legal/regulatory obligation (e.g., CBN audit requirements).
 */

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  default = "eu-west-1"
  description = "AWS region for the audit log bucket"
}

variable "bucket_name" {
  default = "abiaeats-audit-logs"
  description = "S3 bucket name for WORM audit logs"
}

variable "retention_days" {
  default = 90
  description = "Object Lock retention period in days (90 = 3 months, minimum for forensic value)"
}

# ── S3 Bucket with Object Lock ─────────────────────────────────────────────────
resource "aws_s3_bucket" "audit_logs" {
  bucket = var.bucket_name

  # Object Lock must be enabled at bucket creation — cannot be added later
  object_lock_enabled = true

  tags = {
    Project     = "AbiaEats"
    Purpose     = "DFIR-1 Audit Log WORM Storage"
    ManagedBy   = "Terraform"
    Environment = "production"
  }
}

# Block all public access — this bucket should NEVER be public
resource "aws_s3_bucket_public_access_block" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Server-side encryption with AES-256
resource "aws_s3_bucket_server_side_encryption_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true # reduces KMS request costs if you later upgrade to KMS
  }
}

# Object Lock default retention — GOVERNANCE mode, N days
resource "aws_s3_bucket_object_lock_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    default_retention {
      mode = "GOVERNANCE"
      days = var.retention_days
    }
  }
}

# Versioning required for Object Lock
resource "aws_s3_bucket_versioning" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle: delete versions older than 180 days (keeps costs controlled)
resource "aws_s3_bucket_lifecycle_configuration" "audit_logs" {
  bucket = aws_s3_bucket.audit_logs.id

  rule {
    id     = "expire-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 180
    }
  }
}

# ── IAM: Write-only user for the cron job ──────────────────────────────────────
resource "aws_iam_user" "audit_exporter" {
  name = "abiaeats-audit-exporter"
  path = "/service/"

  tags = {
    Project   = "AbiaEats"
    Purpose   = "Write-only audit log exporter (DFIR-1)"
    ManagedBy = "Terraform"
  }
}

resource "aws_iam_access_key" "audit_exporter" {
  user = aws_iam_user.audit_exporter.name
}

# Principle of least privilege: PutObject ONLY — no read, no delete, no list
resource "aws_iam_user_policy" "audit_exporter" {
  name = "audit-log-put-only"
  user = aws_iam_user.audit_exporter.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "PutAuditLogs"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
        ]
        Resource = "${aws_s3_bucket.audit_logs.arn}/abiaeats-audit/*"
        Condition = {
          # Require Object Lock metadata on every PUT
          # Prevents accidental writes that bypass WORM
          StringEquals = {
            "s3:object-lock-mode" = "GOVERNANCE"
          }
        }
      }
    ]
  })
}

# ── Outputs — copy these into Vercel environment variables ────────────────────
output "bucket_name" {
  value       = aws_s3_bucket.audit_logs.bucket
  description = "Set as AUDIT_EXPORT_S3_BUCKET in Vercel"
}

output "bucket_region" {
  value       = var.aws_region
  description = "Set as AUDIT_EXPORT_S3_REGION in Vercel"
}

output "aws_access_key_id" {
  value       = aws_iam_access_key.audit_exporter.id
  description = "Set as AWS_ACCESS_KEY_ID in Vercel"
  sensitive   = true
}

output "aws_secret_access_key" {
  value       = aws_iam_access_key.audit_exporter.secret
  description = "Set as AWS_SECRET_ACCESS_KEY in Vercel"
  sensitive   = true
}
