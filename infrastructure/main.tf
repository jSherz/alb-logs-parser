locals {
  function_name = "alb-access-logs-parser"
}

resource "aws_lambda_function" "access_logs" {
  function_name    = "${local.function_name}"
  handler          = "lib/index.handler"
  role             = "${aws_iam_role.parser.arn}"
  runtime          = "nodejs8.10"
  filename         = "../function.zip"
  source_code_hash = "${filebase64sha256("../function.zip")}"

  environment {
    variables = {
      NODE_ENV = "production"

      # You should use a Systems Manager Parameter Store parameter instead to
      # avoid storing the ES host in state (it may contain auth info).
      ELASTICSEARCH_HOST = "${var.elasticsearch_host}"
    }
  }
}

resource "aws_lambda_permission" "access_logs" {
  action        = "lambda:InvokeFunction"
  function_name = "${aws_lambda_function.access_logs.function_name}"
  principal     = "s3.amazonaws.com"
  source_arn    = "${aws_s3_bucket.access_logs.arn}"
}

resource "aws_cloudwatch_log_group" "access_logs" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = 14
}
