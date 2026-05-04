import {
  completePaymentLinkOrder as completePaymentLinkOrderRecord,
  completePaymentOrder as completePaymentOrderRecord,
  createPaymentOrder as createPaymentOrderRecord,
  findPaymentOrderByReferenceForUser as findPaymentOrderByReferenceForUserRecord,
  findPaymentOrderForCheckout as findPaymentOrderForCheckoutRecord,
  handlePaymentWebhook as handlePaymentWebhookRecord
} from "../db/payment-db.mjs";
import { findUserById as findUserByIdRecord } from "../db.mjs";
import {
  addWalletEntry as addWalletEntryRecord,
  findWalletEntryByReferenceId as findWalletEntryByReferenceIdRecord,
  getUserBalance as getUserBalanceRecord,
  rebalanceWalletEntriesForUser as rebalanceWalletEntriesForUserRecord,
  updateWalletEntryAdmin as updateWalletEntryAdminRecord
} from "../db/wallet-db.mjs";

export const addWalletEntry = addWalletEntryRecord;
export const completePaymentLinkOrder = completePaymentLinkOrderRecord;
export const completePaymentOrder = completePaymentOrderRecord;
export const createPaymentOrder = createPaymentOrderRecord;
export const findPaymentOrderByReferenceForUser = findPaymentOrderByReferenceForUserRecord;
export const findPaymentOrderForCheckout = findPaymentOrderForCheckoutRecord;
export const findUserById = findUserByIdRecord;
export const findWalletEntryByReferenceId = findWalletEntryByReferenceIdRecord;
export const getUserBalance = getUserBalanceRecord;
export const rebalanceWalletEntriesForUser = rebalanceWalletEntriesForUserRecord;
export const handlePaymentWebhook = handlePaymentWebhookRecord;
export const updateWalletEntryAdmin = updateWalletEntryAdminRecord;
