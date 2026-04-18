import { __internalGetReadyPgPool, __internalGetSqlite } from "../db.mjs";
import { getSupportConversationSummary } from "./chat-db.mjs";
import { getAuditLogs } from "./admin-audit-db.mjs";

export async function getMonitoringSummaryData() {
  const [supportSummary, auditLogs] = await Promise.all([getSupportConversationSummary(), getAuditLogs(50)]);
  try {
    const pool = await __internalGetReadyPgPool();
    const [usersResult, walletResult, marketsResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) FILTER (WHERE blocked_at IS NOT NULL)::int AS blocked_users, COUNT(*) FILTER (WHERE deactivated_at IS NOT NULL)::int AS deactivated_users FROM users WHERE role = 'user'`),
      pool.query(`SELECT COUNT(*) FILTER (WHERE type = 'WITHDRAW' AND status = 'INITIATED')::int AS pending_withdraws, COUNT(*) FILTER (WHERE type = 'DEPOSIT' AND status = 'INITIATED')::int AS pending_deposits FROM wallet_entries`),
      pool.query(`SELECT COUNT(*) FILTER (WHERE result = '***-**-***')::int AS placeholder_results FROM markets`)
    ]);
    return {
      blockedUsers: Number(usersResult.rows[0]?.blocked_users ?? 0),
      deactivatedUsers: Number(usersResult.rows[0]?.deactivated_users ?? 0),
      pendingWithdraws: Number(walletResult.rows[0]?.pending_withdraws ?? 0),
      pendingDeposits: Number(walletResult.rows[0]?.pending_deposits ?? 0),
      placeholderResults: Number(marketsResult.rows[0]?.placeholder_results ?? 0),
      supportUnread: Number(supportSummary.unreadForAdmin ?? 0),
      supportConversations: Number(supportSummary.conversationsCount ?? 0),
      auditEvents: auditLogs.length,
      recentAuditFlags: auditLogs.filter((item) => item.action.includes("REJECTED") || item.action.includes("RESET")).slice(0, 12)
    };
  } catch {
    const sqlite = __internalGetSqlite();
    const users = sqlite.prepare(`SELECT SUM(CASE WHEN blocked_at IS NOT NULL THEN 1 ELSE 0 END) AS blocked_users, SUM(CASE WHEN deactivated_at IS NOT NULL THEN 1 ELSE 0 END) AS deactivated_users FROM users WHERE role = 'user'`).get();
    const wallet = sqlite.prepare(`SELECT SUM(CASE WHEN type = 'WITHDRAW' AND status = 'INITIATED' THEN 1 ELSE 0 END) AS pending_withdraws, SUM(CASE WHEN type = 'DEPOSIT' AND status = 'INITIATED' THEN 1 ELSE 0 END) AS pending_deposits FROM wallet_entries`).get();
    const markets = sqlite.prepare(`SELECT SUM(CASE WHEN result = '***-**-***' THEN 1 ELSE 0 END) AS placeholder_results FROM markets`).get();
    return {
      blockedUsers: Number(users?.blocked_users ?? 0),
      deactivatedUsers: Number(users?.deactivated_users ?? 0),
      pendingWithdraws: Number(wallet?.pending_withdraws ?? 0),
      pendingDeposits: Number(wallet?.pending_deposits ?? 0),
      placeholderResults: Number(markets?.placeholder_results ?? 0),
      supportUnread: Number(supportSummary.unreadForAdmin ?? 0),
      supportConversations: Number(supportSummary.conversationsCount ?? 0),
      auditEvents: auditLogs.length,
      recentAuditFlags: auditLogs.filter((item) => item.action.includes("REJECTED") || item.action.includes("RESET")).slice(0, 12)
    };
  }
}
