import {
  addWalletEntry,
  clearWalletEntriesForUser,
  completeWalletRequest,
  findUserById,
  findUserByPhone,
  getBankAccountsForUser,
  getBidsForUser,
  getUserAdminSummaries,
  getUserBalance,
  getWalletAdminRequestItems,
  getWalletEntriesForUser,
  listAllBids,
  rejectWalletRequest,
  resolveWalletApprovalRequest,
  updateUserAccountStatus,
  updateUserApprovalStatus,
  updateWalletEntryAdmin
} from "../stores/admin-store.mjs";
import { sendUserNotification } from "./notification-events-service.mjs";

function roundAmount(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

async function sendWalletActionNotification(entry, action, settlementEntry = null) {
  const userId = String(entry?.userId ?? settlementEntry?.userId ?? "").trim();
  if (!userId) {
    return;
  }

  const type = String(entry?.type ?? settlementEntry?.type ?? "").toUpperCase();
  const amount = roundAmount(Number(entry?.amount ?? settlementEntry?.amount ?? 0));

  if (action === "approve" && type === "DEPOSIT") {
    await sendUserNotification({
      userId,
      title: "Deposit approved",
      body: `Rs ${amount.toFixed(2)} successfully added to your wallet.`,
      channel: "wallet",
      url: "/wallet/history"
    });
    const bonusAmount = roundAmount(Number(settlementEntry?.amount ?? 0));
    if (String(settlementEntry?.type || "").toUpperCase() === "FIRST_DEPOSIT_BONUS" && bonusAmount > 0) {
      await sendUserNotification({
        userId,
        title: "First deposit bonus added",
        body: `Rs ${bonusAmount.toFixed(2)} first deposit bonus added to your wallet.`,
        channel: "wallet",
        url: "/wallet/history"
      });
    }
    return;
  }

  if (action === "approve" && type === "WITHDRAW") {
    await sendUserNotification({
      userId,
      title: "Withdraw approved",
      body: `Your withdraw request of Rs ${amount.toFixed(2)} has been approved.`,
      channel: "wallet",
      url: "/wallet/history"
    });
    return;
  }

  if (action === "reject" && type === "DEPOSIT") {
    await sendUserNotification({
      userId,
      title: "Deposit rejected",
      body: `Your deposit request of Rs ${amount.toFixed(2)} was rejected.`,
      channel: "wallet",
      url: "/wallet/history"
    });
    return;
  }

  if (action === "reject" && type === "WITHDRAW") {
    await sendUserNotification({
      userId,
      title: "Withdraw rejected",
      body: `Your withdraw request of Rs ${amount.toFixed(2)} was rejected.`,
      channel: "wallet",
      url: "/wallet/history"
    });
  }
}

function buildUserLedgerSummary(walletEntries, bids, walletBalance) {
  const totals = {
    deposits: 0,
    withdraws: 0,
    bidPlaced: 0,
    bidWins: 0,
    adminCredits: 0,
    adminDebits: 0
  };

  for (const entry of walletEntries) {
    const amount = Number(entry.amount || 0);
    const type = String(entry.type || "").toUpperCase();
    if (type === "DEPOSIT" && entry.status === "SUCCESS") totals.deposits += amount;
    if (type === "WITHDRAW" && entry.status === "SUCCESS") totals.withdraws += amount;
    if (type === "BID_PLACED" && entry.status === "SUCCESS") totals.bidPlaced += amount;
    if (type === "BID_WIN" && entry.status === "SUCCESS") totals.bidWins += amount;
    if (type === "ADMIN_CREDIT" && entry.status === "SUCCESS") totals.adminCredits += amount;
    if (type === "ADMIN_DEBIT" && entry.status === "SUCCESS") totals.adminDebits += amount;
  }

  return {
    walletBalance: roundAmount(walletBalance),
    deposits: roundAmount(totals.deposits),
    withdraws: roundAmount(totals.withdraws),
    bidPlaced: roundAmount(totals.bidPlaced),
    bidWins: roundAmount(totals.bidWins),
    adminCredits: roundAmount(totals.adminCredits),
    adminDebits: roundAmount(totals.adminDebits),
    totalBids: bids.length,
    wonBids: bids.filter((bid) => bid.status === "Won").length,
    lostBids: bids.filter((bid) => bid.status === "Lost").length,
    pendingBids: bids.filter((bid) => bid.status === "Pending").length
  };
}

export async function listAdminUsers() {
  const usersList = await getUserAdminSummaries();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return usersList.map((user) => ({
    ...user,
    activityState: user.lastActivity && new Date(user.lastActivity).getTime() >= sevenDaysAgo ? "Active" : "Inactive"
  }));
}

export async function getAdminUserDetail(userId) {
  const user = await findUserById(userId);
  if (!user) {
    return null;
  }

  const [walletEntries, bids, bankAccounts, walletBalance] = await Promise.all([
    getWalletEntriesForUser(userId, 120),
    getBidsForUser(userId, 120),
    getBankAccountsForUser(userId),
    getUserBalance(userId)
  ]);

  return {
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      referralCode: user.referralCode,
      joinedAt: user.joinedAt,
      approvalStatus: user.approvalStatus,
      approvedAt: user.approvedAt,
      rejectedAt: user.rejectedAt,
      blockedAt: user.blockedAt,
      deactivatedAt: user.deactivatedAt,
      statusNote: user.statusNote,
      signupBonusGranted: user.signupBonusGranted,
      walletBalance,
      referredByUserId: user.referredByUserId
    },
    summary: buildUserLedgerSummary(walletEntries, bids, walletBalance),
    bids,
    walletEntries,
    bankAccounts
  };
}

export async function updateAdminUserApproval(userId, action) {
  const nextStatus = action === "approve" ? "Approved" : action === "reject" ? "Rejected" : null;
  if (!nextStatus) {
    return { ok: false, status: 400, error: "userId and valid action are required" };
  }

  const updatedUser = await updateUserApprovalStatus(userId, nextStatus);
  if (!updatedUser) {
    return { ok: false, status: 404, error: "User not found" };
  }

  return { ok: true, user: updatedUser, nextStatus };
}

export async function listWalletRequests(history) {
  return getWalletAdminRequestItems({ history });
}

export async function processWalletRequestAction({ requestId, action, note, referenceId, proofUrl }) {
  if (!requestId || !["approve", "reject", "complete", "annotate"].includes(action)) {
    return { ok: false, status: 400, error: "requestId and valid action are required" };
  }

  try {
    if (action === "complete" || action === "annotate") {
      const baseUpdated =
        action === "complete"
          ? await completeWalletRequest(requestId)
          : await updateWalletEntryAdmin(requestId, { note, referenceId, proofUrl });
      const updated = baseUpdated ? await updateWalletEntryAdmin(baseUpdated.id, { note, referenceId, proofUrl }) : null;
      if (!updated) {
        return { ok: false, status: 404, error: "Wallet request not found" };
      }
      return {
        ok: true,
        request: updated,
        settlementEntry: null,
        auditAction: action === "complete" ? "WALLET_REQUEST_COMPLETED" : "WALLET_REQUEST_ANNOTATED",
        auditDetails: {
          type: updated.type,
          amount: updated.amount,
          status: updated.status,
          referenceId: updated.referenceId || null,
          proofUrl: updated.proofUrl || null,
          note: updated.note || null
        }
      };
    }

    if (action === "reject") {
      const baseRejected = await rejectWalletRequest(requestId);
      const updated = baseRejected ? await updateWalletEntryAdmin(baseRejected.id, { note, referenceId, proofUrl }) : null;
      if (!updated) {
        return { ok: false, status: 404, error: "Wallet request not found" };
      }
      await sendWalletActionNotification(updated, "reject");
      return {
        ok: true,
        request: updated,
        settlementEntry: null,
        auditAction: "WALLET_REQUEST_REJECTED",
        auditDetails: {
          type: updated.type,
          amount: updated.amount,
          status: updated.status,
          referenceId: updated.referenceId || null,
          proofUrl: updated.proofUrl || null,
          note: updated.note || null
        }
      };
    }

    const resolved = await resolveWalletApprovalRequest(requestId, action);
    if (!resolved?.request) {
      return { ok: false, status: 404, error: "Wallet request not found" };
    }
    const patchedRequest = await updateWalletEntryAdmin(resolved.request.id, { note, referenceId, proofUrl });
    await sendWalletActionNotification(patchedRequest || resolved.request, action, resolved.settlementEntry);
    return {
      ok: true,
      request: patchedRequest || resolved.request,
      settlementEntry: resolved.settlementEntry,
      auditAction: action === "approve" ? "WALLET_REQUEST_APPROVED" : "WALLET_REQUEST_REJECTED",
      auditDetails: {
        type: resolved.request.type,
        amount: resolved.request.amount,
        settlementEntryId: resolved.settlementEntry?.id ?? null,
        referenceId: referenceId || null,
        proofUrl: proofUrl || null,
        note: note || null
      }
    };
  } catch (error) {
    return { ok: false, status: 400, error: error instanceof Error ? error.message : "Unable to process wallet request" };
  }
}

export async function updateAdminUserStatus(userId, action, note) {
  return updateUserAccountStatus(userId, action, note);
}

export async function createWalletAdjustment({ userId, mode, amount }) {
  const user = await findUserById(userId);
  if (!user) {
    return { ok: false, status: 404, error: "User not found" };
  }

  const beforeBalance = await getUserBalance(userId);
  if (mode === "debit" && amount > beforeBalance) {
    return { ok: false, status: 400, error: "Insufficient user balance for debit" };
  }

  const entry = await addWalletEntry({
    userId,
    type: mode === "credit" ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
    status: "SUCCESS",
    amount,
    beforeBalance,
    afterBalance: mode === "credit" ? beforeBalance + amount : beforeBalance - amount
  });

  await sendUserNotification({
    userId,
    title: mode === "credit" ? "Wallet credited" : "Wallet debited",
    body:
      mode === "credit"
        ? `Rs ${amount.toFixed(2)} added to your wallet by admin.`
        : `Rs ${amount.toFixed(2)} deducted from your wallet by admin.`,
    channel: "wallet",
    url: "/wallet/history"
  });

  return { ok: true, entry };
}

export async function cleanupWalletData({ userId, phone, types }) {
  const targetUser = userId ? await findUserById(userId) : phone ? await findUserByPhone(phone) : null;
  if (!targetUser) {
    return { ok: false, status: 404, error: "Target user not found" };
  }

  const result = await clearWalletEntriesForUser(targetUser.id, types);
  return { ok: true, targetUser, result };
}

export async function listAdminBids() {
  const bids = await listAllBids();
  return Promise.all(
    bids.map(async (bid) => {
      const user = await findUserById(bid.userId);
      return {
        ...bid,
        user: user ? { id: user.id, name: user.name, phone: user.phone } : null
      };
    })
  );
}
