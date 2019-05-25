locals {
  # See: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html#access-logging-bucket-permissions
  aws_account_ids = {
    us-east-1      = 127311923021
    us-east-2      = 033677994240
    us-west-1      = 027434742980
    us-west-2      = 797873946194
    ca-central-1   = 985666609251
    eu-central-1   = 054676820928
    eu-west-1      = 156460612806
    eu-west-2      = 652711504416
    eu-west-3      = 009996457667
    eu-north-1     = 897822967062
    ap-east-1      = 754344448648
    ap-northeast-1 = 582318560864
    ap-northeast-2 = 600734575887
    ap-northeast-3 = 383597477331
    ap-southeast-1 = 114774131450
    ap-southeast-2 = 783225319266
    ap-south-1     = 718504428378
    sa-east-1      = 507241528517
    us-gov-west-1  = 048591011584
    us-gov-east-1  = 190560391635
    cn-north-1     = 638102146993
    cn-northwest-1 = 037604701340
  }
}

data "aws_region" "current" {}

data "aws_iam_policy_document" "access_logs" {
  statement {
    sid     = "AllowAWSToPutLogs"
    effect  = "Allow"
    actions = ["s3:PutObject"]

    principals {
      type        = "AWS"
      identifiers = ["${local.aws_account_ids[data.aws_region.current.name]}"]
    }

    resources = ["arn:aws:s3:::${var.access_logs_bucket}/*"]
  }
}

resource "aws_s3_bucket" "access_logs" {
  bucket = "${var.access_logs_bucket}"
  policy = "${data.aws_iam_policy_document.access_logs.json}"

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "aws:kms"
      }
    }
  }
}

resource "aws_s3_bucket_notification" "access_logs" {
  bucket = "${var.access_logs_bucket}"

  lambda_function {
    lambda_function_arn = "${aws_lambda_function.access_logs.arn}"
    events              = ["s3:ObjectCreated:*"]
  }
}

resource "aws_s3_bucket_public_access_block" "access_logs" {
  bucket = "${aws_s3_bucket.access_logs.bucket}"

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
