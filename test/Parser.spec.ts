import bluebird from "bluebird";
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import { InputType } from "zlib";
import { Parser } from "../src/Parser";

const readFileAsync = bluebird.promisify(fs.readFile);

const gzipAsync = bluebird.promisify(zlib.gzip as ((
  buf: InputType,
  callback: (error: Error | null, result: Buffer) => void,
) => void));

/* tslint:disable max-line-length */

describe("Parser", () => {
  describe("parseFile", () => {
    const compressLine = (line: string): bluebird<Buffer> => gzipAsync(line);

    it("produces documents for each request", async () => {
      const file = await readFileAsync(
        path.join(
          process.cwd(),
          "test",
          "123456789012_elasticloadbalancing_eu-west-2_app.jsj-test-lb.cb8" +
            "2e1b11d63594a_20190519T1900Z_3.9.40.91_3p9141h0.log.gz",
        ),
      );

      const parsed = await Parser.parseFile(file);

      expect(parsed).toMatchSnapshot();
    });

    it("handles requests with no target", async () => {
      const file = await compressLine(
        'h2 2019-05-19T18:57:32.116232Z app/jsj-test-lb/cb82e1b11d63594a 1.2.3.4:56716 - 0.000 0.001 0.000 304 304 12 103 "GET https://example-lb.jsherz.com:443/ HTTP/2.0" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.157 Safari/537.36" ECDHE-RSA-AES128-GCM-SHA256 TLSv1.2 arn:aws:elasticloadbalancing:eu-west-2:123456789012:targetgroup/my-example/dc5cd405ccb3bda2 "Root=1-5ce1a71c-3e822c707b640bb0e3f00c20" "example-lb.jsherz.com" "arn:aws:acm:eu-west-2:123456789012:certificate/887fba39-8ccc-4274-8b3f-10da0f1a5540" 0 2019-05-19T18:57:32.115000Z "forward" "-" "-"\n',
      );

      const parsed = await Parser.parseFile(file);

      expect(parsed[0].targetIp).toBeNull();
      expect(parsed[0].targetPort).toBeNull();
    });

    it("handles requests with no request, target and response times", async () => {
      const file = await compressLine(
        'h2 2019-05-19T18:57:32.116232Z app/jsj-test-lb/cb82e1b11d63594a 1.2.3.4:56716 5.5.5.5:3000 -1 -1 -1 304 304 12 103 "GET https://example-lb.jsherz.com:443/ HTTP/2.0" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.157 Safari/537.36" ECDHE-RSA-AES128-GCM-SHA256 TLSv1.2 arn:aws:elasticloadbalancing:eu-west-2:123456789012:targetgroup/my-example/dc5cd405ccb3bda2 "Root=1-5ce1a71c-3e822c707b640bb0e3f00c20" "example-lb.jsherz.com" "arn:aws:acm:eu-west-2:123456789012:certificate/887fba39-8ccc-4274-8b3f-10da0f1a5540" 0 2019-05-19T18:57:32.115000Z "forward" "-" "-"\n',
      );

      const parsed = await Parser.parseFile(file);

      expect(parsed[0].requestProcessingTime).toEqual(-1);
      expect(parsed[0].targetProcessingTime).toEqual(-1);
      expect(parsed[0].responseProcessingTime).toEqual(-1);
    });

    it("handles requests with no target status code", async () => {
      const file = await compressLine(
        'h2 2019-05-19T18:57:32.116232Z app/jsj-test-lb/cb82e1b11d63594a 1.2.3.4:56716 10.0.0.4:5000 0.000 0.001 0.000 304 - 12 103 "GET https://example-lb.jsherz.com:443/ HTTP/2.0" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.157 Safari/537.36" ECDHE-RSA-AES128-GCM-SHA256 TLSv1.2 arn:aws:elasticloadbalancing:eu-west-2:123456789012:targetgroup/my-example/dc5cd405ccb3bda2 "Root=1-5ce1a71c-3e822c707b640bb0e3f00c20" "example-lb.jsherz.com" "arn:aws:acm:eu-west-2:123456789012:certificate/887fba39-8ccc-4274-8b3f-10da0f1a5540" 0 2019-05-19T18:57:32.115000Z "forward" "-" "-"\n',
      );

      const parsed = await Parser.parseFile(file);

      expect(parsed[0].targetStatusCode).toBeNull();
    });

    // it("handles requests with a request containing speech marks");

    it("handles requests with a user agent containing speech marks", async () => {
      const file = await compressLine(
        'h2 2019-05-27T16:21:31.236250Z app/alb/eee8660a11f63321 52.49.149.228:36256 10.0.5.18:80 0.001 0.001 0.000 200 200 39 3680 "GET https://example-lb.jsherz.com:443/ HTTP/2.0" "\\x22SweetAgent/\\x22" ECDHE-RSA-AES128-GCM-SHA256 TLSv1.2 arn:aws:elasticloadbalancing:eu-west-1:247940857651:targetgroup/one/4a093249cafdea53 "Root=1-5cec0e8b-3049d358629e1d1d3e067404" "example-lb.jsherz.com" "arn:aws:acm:eu-west-1:247940857651:certificate/7df02eb2-668d-4e32-919c-c50fe7d5d304" 0 2019-05-27T16:21:31.234000Z "forward" "-" "-"\n',
      );

      const parsed = await Parser.parseFile(file);

      expect(parsed[0].userAgent).toEqual("\\x22SweetAgent/\\x22");
    });

    it("handles requests with no SNI domain name", async () => {
      const file = await compressLine(
        'https 2019-05-27T16:55:20.198772Z app/alb/eee8660a11f63321 90.249.24.86:33578 10.0.5.18:80 -1 0.001 0.000 404 404 28 3665 "GET https://alb-836247562.eu-west-1.elb.amazonaws.com:443/no-server-name-openssl -" "-" ECDHE-RSA-AES128-GCM-SHA256 TLSv1.2 arn:aws:elasticloadbalancing:eu-west-1:247940857651:targetgroup/one/4a093249cafdea53 "Root=1-5cec1678-06d7e8365e4ceb66da49515a" "-" "arn:aws:acm:eu-west-1:247940857651:certificate/7df02eb2-668d-4e32-919c-c50fe7d5d304" 0 2019-05-27T16:55:20.197000Z "forward" "-" "-"\n',
      );

      const parsed = await Parser.parseFile(file);

      expect(parsed[0].domainName).toBeNull();
    });

    // it("handles requests with a matched rule priority error");

    it("handles requests with no actions executed", async () => {
      const file = await compressLine(
        'http 2019-05-27T16:42:59.315299Z app/alb/eee8660a11f63321 209.17.96.66:60068 10.0.5.18:80 0.001 0.001 0.000 200 200 126 3754 "GET http://alb-836247562.eu-west-1.elb.amazonaws.com:80/ HTTP/1.0" "Mozilla/5.0 (compatible; Nimbostratus-Bot/v1.3.2; http://cloudsystemnetworks.com)" - - arn:aws:elasticloadbalancing:eu-west-1:247940857651:targetgroup/one/4a093249cafdea53 "Root=1-5cec1392-0d118bdb0c9a13085a0bf420" "-" "-" 0 2019-05-27T16:42:58.508000Z "-" "-" "-"\n',
      );

      const parsed = await Parser.parseFile(file);

      expect(parsed[0].actionsExecuted).toEqual([]);
    });

    it("handles requests with no redirect URL", async () => {
      const file = await compressLine(
        'http 2019-05-27T16:42:59.315299Z app/alb/eee8660a11f63321 209.17.96.66:60068 10.0.5.18:80 0.001 0.001 0.000 200 200 126 3754 "GET http://alb-836247562.eu-west-1.elb.amazonaws.com:80/ HTTP/1.0" "Mozilla/5.0 (compatible; Nimbostratus-Bot/v1.3.2; http://cloudsystemnetworks.com)" - - arn:aws:elasticloadbalancing:eu-west-1:247940857651:targetgroup/one/4a093249cafdea53 "Root=1-5cec1392-0d118bdb0c9a13085a0bf420" "-" "-" 0 2019-05-27T16:42:58.508000Z "-" "-" "-"\n',
      );

      const parsed = await Parser.parseFile(file);

      expect(parsed[0].redirectUrl).toBeNull();
    });

    it("handles requests with no error reason", async () => {
      const file = await compressLine(
        'http 2019-05-27T16:42:59.315299Z app/alb/eee8660a11f63321 209.17.96.66:60068 10.0.5.18:80 0.001 0.001 0.000 200 200 126 3754 "GET http://alb-836247562.eu-west-1.elb.amazonaws.com:80/ HTTP/1.0" "Mozilla/5.0 (compatible; Nimbostratus-Bot/v1.3.2; http://cloudsystemnetworks.com)" - - arn:aws:elasticloadbalancing:eu-west-1:247940857651:targetgroup/one/4a093249cafdea53 "Root=1-5cec1392-0d118bdb0c9a13085a0bf420" "-" "-" 0 2019-05-27T16:42:58.508000Z "-" "-" "-"\n',
      );

      const parsed = await Parser.parseFile(file);

      expect(parsed[0].errorReason).toBeNull();
    });

    it("handles IPv6 addresses", async () => {
      const file = await compressLine(
        'https 2019-05-27T20:02:51.108564Z app/alb/440f5d0d96de415d 2001:41d0:701:1100::29c8:57314 2001:41d0:701:1100::29c8:80 0.001 0.001 0.000 200 200 128 3754 "GET https://example-lb.jsherz.com:443/ HTTP/1.0" "ipv6-test.com validator" ECDHE-RSA-AES128-GCM-SHA256 TLSv1.2 arn:aws:elasticloadbalancing:eu-west-1:247940857651:targetgroup/alb/fe1499ac86c7fe07 "Root=1-5cec426b-02d34182065d64926aaa8fcc" "example-lb.jsherz.com" "arn:aws:acm:eu-west-1:247940857651:certificate/7df02eb2-668d-4e32-919c-c50fe7d5d304" 0 2019-05-27T20:02:51.106000Z "forward" "-" "-"',
      );

      const parsed = await Parser.parseFile(file);

      expect(parsed[0].clientIp).toEqual("2001:41d0:701:1100::29c8");
      expect(parsed[0].clientPort).toEqual(57314);

      expect(parsed[0].targetIp).toEqual("2001:41d0:701:1100::29c8");
      expect(parsed[0].targetPort).toEqual(80);
    });
  });
});
