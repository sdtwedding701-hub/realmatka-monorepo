import {
  findMarketBySlug as findMarketBySlugRecord,
  getChartRecord as getChartRecordRecord,
  getChartRecordsForMarkets as getChartRecordsForMarketsRecord,
  listMarkets as listMarketsRecord,
  updateMarketRecord as updateMarketRecordRecord,
  upsertChartRecord as upsertChartRecordRecord
} from "../db/market-db.mjs";

export const findMarketBySlug = findMarketBySlugRecord;
export const getChartRecord = getChartRecordRecord;
export const getChartRecordsForMarkets = getChartRecordsForMarketsRecord;
export const listMarkets = listMarketsRecord;
export const updateMarketRecord = updateMarketRecordRecord;
export const upsertChartRecord = upsertChartRecordRecord;
