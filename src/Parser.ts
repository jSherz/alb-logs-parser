import bluebird from "bluebird";
import * as csv from "fast-csv";
import { gunzip } from "zlib";

const gunzipAsync = bluebird.promisify(gunzip);

export interface IALBRow {
  type: string;
  timestamp: string;
  elb: string;
  clientIp: string;
  clientPort: number;
  targetIp: string | null;
  targetPort: number | null;
  requestProcessingTime: number;
  targetProcessingTime: number;
  responseProcessingTime: number;
  elbStatusCode: number;
  targetStatusCode: number | null;
  receivedBytes: number;
  sentBytes: number;
  request: string;
  userAgent: string;
  sslCipher: string | null;
  sslProtocol: string | null;
  targetGroupArn: string;
  traceId: string;
  domainName: string | null;
  chosenCertArn: string | null;
  matchedRulePriority: number | null;
  requestCreationTime: string;
  actionsExecuted: string[];
  redirectUrl: string | null;
  errorReason: string | null;
}

export interface IRawRow {
  type: string;
  timestamp: string;
  elb: string;
  client: string;
  target: string;
  requestProcessingTime: string;
  targetProcessingTime: string;
  responseProcessingTime: string;
  elbStatusCode: string;
  targetStatusCode: string;
  receivedBytes: string;
  sentBytes: string;
  request: string;
  userAgent: string;
  sslCipher: string;
  sslProtocol: string;
  targetGroupArn: string;
  traceId: string;
  domainName: string;
  chosenCertArn: string;
  matchedRulePriority: string;
  requestCreationTime: string;
  actionsExecuted: string;
  redirectUrl: string;
  errorReason: string;
}

export class Parser {
  public static async parseFile(file: Buffer): Promise<IALBRow[]> {
    const lines = ((await gunzipAsync(file)) as Buffer).toString("utf-8");

    return Parser.parseCsv(lines);
  }

  private static nullIfDash(input: string): string | null {
    if (input === "-") {
      return null;
    } else {
      return input;
    }
  }

  private static nullNumIfDash(input: string): number | null {
    if (input === "-") {
      return null;
    } else {
      return parseInt(input, 10);
    }
  }

  private static actionsExecuted(input: string): string[] {
    if (input === "-") {
      return [];
    } else {
      return input.split(",");
    }
  }

  private static parseIpPort(input: string): [string, number] {
    const lastColon = input.lastIndexOf(":");

    return [
      input.substr(0, lastColon),
      parseInt(input.substr(lastColon + 1), 10),
    ];
  }

  private static parseCsv(input: string): Promise<IALBRow[]> {
    return new Promise((resolve, reject) => {
      const rows: IALBRow[] = [];

      csv
        .fromString(input, {
          objectMode: true,
          headers: [
            "type",
            "timestamp",
            "elb",
            "client",
            "target",
            "requestProcessingTime",
            "targetProcessingTime",
            "responseProcessingTime",
            "elbStatusCode",
            "targetStatusCode",
            "receivedBytes",
            "sentBytes",
            "request",
            "userAgent",
            "sslCipher",
            "sslProtocol",
            "targetGroupArn",
            "traceId",
            "domainName",
            "chosenCertArn",
            "matchedRulePriority",
            "requestCreationTime",
            "actionsExecuted",
            "redirectUrl",
            "errorReason",
          ],
          ignoreEmpty: true,
          discardUnmappedColumns: true,
          strictColumnHandling: true,
          delimiter: " ",
        })
        .on("data", (rawRow: IRawRow) => {
          const [clientIp, clientPort] = Parser.parseIpPort(rawRow.client);

          const target = Parser.nullIfDash(rawRow.target);
          const [targetIp, targetPort] = target
            ? Parser.parseIpPort(rawRow.target)
            : [null, null];

          rows.push({
            type: rawRow.type,
            timestamp: rawRow.timestamp,
            elb: rawRow.elb,
            clientIp,
            clientPort,
            targetIp,
            targetPort,
            requestProcessingTime: parseInt(rawRow.requestProcessingTime, 10),
            targetProcessingTime: parseInt(rawRow.targetProcessingTime, 10),
            responseProcessingTime: parseInt(rawRow.responseProcessingTime, 10),
            elbStatusCode: parseInt(rawRow.elbStatusCode, 10),
            targetStatusCode: Parser.nullNumIfDash(rawRow.targetStatusCode),
            receivedBytes: parseInt(rawRow.receivedBytes, 10),
            sentBytes: parseInt(rawRow.sentBytes, 10),
            request: rawRow.request,
            userAgent: rawRow.userAgent,
            sslCipher: Parser.nullIfDash(rawRow.sslCipher),
            sslProtocol: Parser.nullIfDash(rawRow.sslProtocol),
            targetGroupArn: rawRow.targetGroupArn,
            traceId: rawRow.traceId,
            domainName: Parser.nullIfDash(rawRow.domainName),
            chosenCertArn: Parser.nullIfDash(rawRow.chosenCertArn),
            matchedRulePriority: Parser.nullNumIfDash(
              rawRow.matchedRulePriority,
            ),
            requestCreationTime: rawRow.requestCreationTime,
            actionsExecuted: Parser.actionsExecuted(rawRow.actionsExecuted),
            redirectUrl: Parser.nullIfDash(rawRow.redirectUrl),
            errorReason: Parser.nullIfDash(rawRow.errorReason),
          });
        })
        .on("error", reject)
        .on("end", () => resolve(rows));
    });
  }
}
