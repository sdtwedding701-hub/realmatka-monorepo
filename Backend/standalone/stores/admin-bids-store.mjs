import {
  getBidsForUser as getBidsForUserRecord,
  listBidsPage as listBidsPageRecord,
  listAllBids as listAllBidsRecord
} from "../db/bids-db.mjs";

export const getBidsForUser = getBidsForUserRecord;
export const listBidsPage = listBidsPageRecord;
export const listAllBids = listAllBidsRecord;
