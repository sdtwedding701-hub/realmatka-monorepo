import {
  addBid as addBidRecord,
  getBidsForMarket as getBidsForMarketRecord,
  getBidsForUser as getBidsForUserRecord,
  listAllBids as listAllBidsRecord,
  updateBidSettlement as updateBidSettlementRecord
} from "../db/bids-db.mjs";

export const addBid = addBidRecord;
export const getBidsForMarket = getBidsForMarketRecord;
export const getBidsForUser = getBidsForUserRecord;
export const listAllBids = listAllBidsRecord;
export const updateBidSettlement = updateBidSettlementRecord;
