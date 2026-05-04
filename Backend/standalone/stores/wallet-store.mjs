import {
  addWalletEntry as addWalletEntryRecord,
  clearWalletEntriesForUser as clearWalletEntriesForUserRecord,
  completeWalletRequest as completeWalletRequestRecord,
  getBankAccountsForUser as getBankAccountsForUserRecord,
  rebalanceWalletEntriesForUser as rebalanceWalletEntriesForUserRecord,
  getUserBalance as getUserBalanceRecord,
  getWalletAdminRequestItems as getWalletAdminRequestItemsRecord,
  getWalletApprovalRequests as getWalletApprovalRequestsRecord,
  getWalletEntriesForUser as getWalletEntriesForUserRecord,
  getWalletRequestHistory as getWalletRequestHistoryRecord,
  rejectWalletRequest as rejectWalletRequestRecord,
  resolveWalletApprovalRequest as resolveWalletApprovalRequestRecord,
  updateWalletEntryAdmin as updateWalletEntryAdminRecord
} from "../db/wallet-db.mjs";

export const addWalletEntry = addWalletEntryRecord;
export const clearWalletEntriesForUser = clearWalletEntriesForUserRecord;
export const completeWalletRequest = completeWalletRequestRecord;
export const getBankAccountsForUser = getBankAccountsForUserRecord;
export const rebalanceWalletEntriesForUser = rebalanceWalletEntriesForUserRecord;
export const getUserBalance = getUserBalanceRecord;
export const getWalletAdminRequestItems = getWalletAdminRequestItemsRecord;
export const getWalletApprovalRequests = getWalletApprovalRequestsRecord;
export const getWalletEntriesForUser = getWalletEntriesForUserRecord;
export const getWalletRequestHistory = getWalletRequestHistoryRecord;
export const rejectWalletRequest = rejectWalletRequestRecord;
export const resolveWalletApprovalRequest = resolveWalletApprovalRequestRecord;
export const updateWalletEntryAdmin = updateWalletEntryAdminRecord;
