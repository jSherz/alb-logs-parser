import bluebird from "bluebird";
import * as ElasticSearch from "elasticsearch";
import * as _ from "lodash";
import { IALBRow } from "./Parser";

export interface IIndexerServiceProps {
  elasticSearch: ElasticSearch.Client;
  getCurrentDate: () => Date;
  indexPrefix?: string;
}

/**
 * Splits up the access log documents into batches and sends them to ES.
 */
export class IndexerService {
  private elasticSearch: ElasticSearch.Client;

  /**
   * Allows testing dates other than today without manipulating JS Date.
   */
  private getCurrentDate: () => Date;

  /**
   * Index pattern prefix, without a trailing dash.
   */
  private indexPrefix: string;

  constructor({
    elasticSearch,
    getCurrentDate,
    indexPrefix = "alb-access-logs",
  }: IIndexerServiceProps) {
    this.elasticSearch = elasticSearch;
    this.getCurrentDate = getCurrentDate;
    this.indexPrefix = indexPrefix;
  }

  public async store(docs: IALBRow[]): Promise<void> {
    const now = this.getCurrentDate();
    const index = `${this.indexPrefix}-${now.getFullYear()}.${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

    const batches: IALBRow[][] = _.chunk(docs, 500);

    await bluebird.mapSeries(batches, batch => {
      const bulk: any[] = [];

      batch.forEach(doc => {
        bulk.push({
          index: {
            _index: index,
            _type: "_doc",
            _id: doc.traceId.replace("Root=", ""),
          },
        });
        bulk.push(doc);
      });

      return this.elasticSearch.bulk({
        body: bulk,
        pipeline: "aws-alb-logs",
      });
    });
  }
}
