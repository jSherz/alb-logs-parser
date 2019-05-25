data "aws_iam_policy_document" "parser_assume" {
  statement {
    sid     = "AllowLambdaToAssume"
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "parser" {
  name               = "alb-access-logs-parser"
  assume_role_policy = "${data.aws_iam_policy_document.parser_assume.json}"
}

data "aws_iam_policy_document" "parser" {
  statement {
    sid    = "AllowAccessToS3"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:DeleteObject",
    ]
    resources = ["${aws_s3_bucket.access_logs.arn}/*"]
  }

  statement {
    sid    = "AllowSendingLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "${aws_cloudwatch_log_group.access_logs.arn}",
      "${aws_cloudwatch_log_group.access_logs.arn}/*",
    ]
  }
}

resource "aws_iam_policy" "parser" {
  name   = "alb-access-logs-parser"
  policy = "${data.aws_iam_policy_document.parser.json}"
}

resource "aws_iam_role_policy_attachment" "parser" {
  role       = "${aws_iam_role.parser.id}"
  policy_arn = "${aws_iam_policy.parser.arn}"
}
