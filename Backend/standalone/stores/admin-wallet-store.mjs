import {
  addWalletEntry as addWalletEntryRecord,
  clearWalletEntriesForUser as clearWalletEntriesForUserRecord,
  completeWalletRequest as completeWalletRequestRecord,
  getBankAccountsForUser as getBankAccountsForUserRecord,
  getWalletRequestHistoryPage as getWalletRequestHistoryPageRecord,
  getUserBalance as getUserBalanceRecord,
  getWalletAdminRequestItems as getWalletAdminRequestItemsRecord,
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
export const getUserBalance = getUserBalanceRecord;
export const getWalletAdminRequestItems = getWalletAdminRequestItemsRecord;
export const getWalletEntriesForUser = getWalletEntriesForUserRecord;
export const getWalletRequestHistoryPage = getWalletRequestHistoryPageRecord;
export const getWalletRequestHistory = getWalletRequestHistoryRecord;
export const rejectWalletRequest = rejectWalletRequestRecord;
export const resolveWalletApprovalRequest = resolveWalletApprovalRequestRecord;
export const updateWalletEntryAdmin = updateWalletEntryAdminRecord;
