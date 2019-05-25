# alb-logs-parser

Parses the access logs produced by an Application Load Balancer and sends them
to Elasticsearch.

## Setting up the parser

The Terraform configuration in `infrastructure` is a good starting point for
setting up the bucket and Lambda function to process the logs. You'll need to
first build the Lambda function and package it up into a zip, and then run
Terraform.

```bash
yarn
yarn package

cd infrastructure
terraform plan -out myplan.tf
terraform apply myplan.tf
```

With the bucket and Lambda function created, set the access logs of your
Application Load Balancer to go to the new bucket. If you already had an
existing bucket, you'll need to adapt the Terraform configuration to fit your
use case or use it as the basis of a CloudFormation template or manual setup.

See:
https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html

## Elasticsearch mapping

Setting up the mapping template is important to make sure the data is indexed
correctly and the GeoIP data can be visualised.

```
PUT /_template/alb-access-logs
{
  "index_patterns": "alb-access-logs-*",
  "mappings": {
    "_doc": {
      "properties": {
        "actionsExecuted": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "chosenCertArn": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "clientIp": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "clientPort": {
          "type": "long"
        },
        "domainName": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "elb": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "elbStatusCode": {
          "type": "long"
        },
        "geoip": {
          "properties": {
            "city_name": {
              "type": "text",
              "fields": {
                "keyword": {
                  "type": "keyword",
                  "ignore_above": 256
                }
              }
            },
            "continent_name": {
              "type": "text",
              "fields": {
                "keyword": {
                  "type": "keyword",
                  "ignore_above": 256
                }
              }
            },
            "country_iso_code": {
              "type": "text",
              "fields": {
                "keyword": {
                  "type": "keyword",
                  "ignore_above": 256
                }
              }
            },
            "location": {
              "type": "geo_point"
            },
            "region_name": {
              "type": "text",
              "fields": {
                "keyword": {
                  "type": "keyword",
                  "ignore_above": 256
                }
              }
            }
          }
        },
        "matchedRulePriority": {
          "type": "long"
        },
        "receivedBytes": {
          "type": "long"
        },
        "request": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "requestCreationTime": {
          "type": "date"
        },
        "requestProcessingTime": {
          "type": "long"
        },
        "responseProcessingTime": {
          "type": "long"
        },
        "sentBytes": {
          "type": "long"
        },
        "sslCipher": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "sslProtocol": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "targetGroupArn": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "targetIp": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "targetPort": {
          "type": "long"
        },
        "targetProcessingTime": {
          "type": "long"
        },
        "targetStatusCode": {
          "type": "long"
        },
        "timestamp": {
          "type": "date"
        },
        "traceId": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "type": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "userAgent": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        }
      }
    }
  }
}
```

## GeoIP support

To have Elasticsearch ingest the client IP addresses and turn them into geo
data, you must setup a new pipeline. The Lambda function relies on this pipeline
being configured:

```
PUT _ingest/pipeline/aws-alb-logs
{
  "description" : "Add geoip info",
  "processors" : [
    {
      "geoip" : {
        "field" : "clientIp"
      }
    }
  ]
}
```

See: https://www.elastic.co/guide/en/elasticsearch/reference/7.x/geoip-processor.html

## Kibana dashboard

You can find an importable Kibana dashboard in `dashboard.json` in the root
directory of the project. This can be imported to visualise the logs if you keep
the default index prefix in the parser.

See: https://www.elastic.co/guide/en/kibana/current/dashboard-import-api-import.html

## Improvements

If you're thinking about using this Lambda function, there are a few things that
you might also want to consider:

* The log index pattern is the date of indexing, not the timestamp that's
  present in the log file. You may want to change the function to find the index
  name based on the timestamp of request.
