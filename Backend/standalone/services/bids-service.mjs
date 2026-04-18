import { getBidsForUser } from "../stores/bids-store.mjs";

export async function getBidHistory(userId) {
  return getBidsForUser(userId);
}
