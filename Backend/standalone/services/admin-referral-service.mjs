import { getAdminReferralSummary } from "../db.mjs";

export async function getAdminReferralReport({ limit = 300 } = {}) {
  return getAdminReferralSummary(limit);
}
