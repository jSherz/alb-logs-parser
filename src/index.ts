import { S3Event, S3Handler } from "aws-lambda";
import * as AWS from "aws-sdk";
import * as ElasticSearch from "elasticsearch";
import { IndexerService } from "./IndexerService";
import { Parser } from "./Parser";

export const handler: S3Handler = async (event: S3Event) => {
  const elasticSearch = new ElasticSearch.Client({
    host: process.env.ELASTICSEARCH_HOST,
  });

  const indexerService = new IndexerService({
    elasticSearch,
    getCurrentDate: () => new Date(),
  });

  const s3 = new AWS.S3();

  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;

  try {
    const file = await s3
      .getObject({
        Bucket: bucket,
        Key: key,
      })
      .promise();

    console.log("Downloaded log file.");

    const records = await Parser.parseFile(file.Body as Buffer);

    console.log("Parsed log file.");

    await indexerService.store(records);

    console.log("Indexed log file.");

    await s3
      .deleteObject({
        Bucket: bucket,
        Key: key,
      })
      .promise();

    console.log("Deleted log file.");
  } catch (err) {
    /**
     * The Lambda function may get re-triggered for the same object and thus we
     * may have already processed and deleted it.
     */
    if (err.code === "NoSuchKey") {
      console.log("Ignoring NoSuchKey error. bucket=", bucket, "key=", key);
    } else {
      console.error(
        "Failed to upload ALB access logs. bucket=",
        bucket,
        "key=",
        key,
      );
      console.error(err);
      throw err;
    }
  }
};
