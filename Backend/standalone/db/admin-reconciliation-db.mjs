import { __internalGetReadyPgPool, __internalGetSqlite, __internalToIso } from "../db.mjs";

export async function getReconciliationSummaryData(options = {}) {
  const recentLimit = Math.max(1, Math.min(100, Number(options.recentLimit ?? 30) || 30));
  const page = Math.max(1, Number(options.page ?? 1) || 1);
  const offset = (page - 1) * recentLimit;
  const staleHours = Math.max(1, Math.min(168, Number(options.staleHours ?? 24) || 24));
  const staleCutoffIso = new Date(Date.now() - staleHours * 60 * 60 * 1000).toISOString();
  const normalizedType = ["DEPOSIT", "WITHDRAW"].includes(String(options.type ?? "").toUpperCase())
    ? String(options.type).toUpperCase()
    : "";
  const normalizedStatus = String(options.status ?? "").trim().toUpperCase();
  const allowedStatuses = new Set(["INITIATED", "REJECTED", "BACKOFFICE", "SUCCESS"]);
  const statusFilter = allowedStatuses.has(normalizedStatus) ? normalizedStatus : "";

  try {
    const pool = await __internalGetReadyPgPool();
    const [summaryResult, recentResult] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'INITIATED')::int AS pending_count,
           COUNT(*) FILTER (WHERE status = 'INITIATED' AND created_at < $1)::int AS stale_pending_count,
           COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected_count,
           COUNT(*) FILTER (WHERE status = 'BACKOFFICE')::int AS backoffice_count,
           COUNT(*) FILTER (WHERE status = 'SUCCESS')::int AS successful_count,
           COALESCE(SUM(CASE WHEN type = 'DEPOSIT' AND status = 'SUCCESS' THEN amount ELSE 0 END), 0) AS deposit_success_amount,
          COALESCE(SUM(CASE WHEN type = 'WITHDRAW' AND status = 'SUCCESS' THEN amount ELSE 0 END), 0) AS withdraw_success_amount
         FROM wallet_entries
         WHERE type = ANY($2::text[])
           AND ($3 = '' OR type = $3)
           AND ($4 = '' OR status = $4)`,
        [staleCutoffIso, ["DEPOSIT", "WITHDRAW"], normalizedType, statusFilter]
      ),
      pool.query(
        `SELECT
           we.id,
           we.type,
           we.status,
           we.amount,
           we.created_at,
           u.name AS user_name,
           u.phone AS user_phone
         FROM wallet_entries we
         LEFT JOIN users u ON u.id = we.user_id
         WHERE we.type = ANY($1::text[])
           AND ($2 = '' OR we.type = $2)
           AND ($3 = '' OR we.status = $3)
         ORDER BY we.created_at DESC, we.id DESC
         LIMIT $4 OFFSET $5`,
        [["DEPOSIT", "WITHDRAW"], normalizedType, statusFilter, recentLimit, offset]
      )
    ]);

    const summary = summaryResult.rows[0] ?? {};
    const filteredTotal =
      Number(summary.pending_count ?? 0) +
      Number(summary.rejected_count ?? 0) +
      Number(summary.backoffice_count ?? 0) +
      Number(summary.successful_count ?? 0);
    return {
      summary: {
        pendingCount: Number(summary.pending_count ?? 0),
        stalePendingCount: Number(summary.stale_pending_count ?? 0),
        rejectedCount: Number(summary.rejected_count ?? 0),
        backofficeCount: Number(summary.backoffice_count ?? 0),
        successfulCount: Number(summary.successful_count ?? 0),
        depositSuccessAmount: Number(summary.deposit_success_amount ?? 0),
        withdrawSuccessAmount: Number(summary.withdraw_success_amount ?? 0)
      },
      filters: {
        type: normalizedType || null,
        status: statusFilter || null,
        staleHours
      },
      pagination: {
        page,
        limit: recentLimit,
        total: filteredTotal,
        hasMore: offset + recentResult.rows.length < filteredTotal
      },
      recent: recentResult.rows.map((row) => ({
        id: row.id,
        type: row.type,
        status: row.status,
        amount: Number(row.amount ?? 0),
        createdAt: __internalToIso(row.created_at),
        userName: row.user_name ?? "Unknown",
        phone: row.user_phone ?? ""
      }))
    };
  } catch {
    const sqlite = __internalGetSqlite();
    const summary = sqlite
      .prepare(
        `SELECT
           SUM(CASE WHEN status = 'INITIATED' THEN 1 ELSE 0 END) AS pending_count,
           SUM(CASE WHEN status = 'INITIATED' AND created_at < ? THEN 1 ELSE 0 END) AS stale_pending_count,
           SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected_count,
           SUM(CASE WHEN status = 'BACKOFFICE' THEN 1 ELSE 0 END) AS backoffice_count,
           SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) AS successful_count,
           COALESCE(SUM(CASE WHEN type = 'DEPOSIT' AND status = 'SUCCESS' THEN amount ELSE 0 END), 0) AS deposit_success_amount,
          COALESCE(SUM(CASE WHEN type = 'WITHDRAW' AND status = 'SUCCESS' THEN amount ELSE 0 END), 0) AS withdraw_success_amount
         FROM wallet_entries
         WHERE type IN (?, ?)
           AND (? = '' OR type = ?)
           AND (? = '' OR status = ?)`
      )
      .get(staleCutoffIso, "DEPOSIT", "WITHDRAW", normalizedType, normalizedType, statusFilter, statusFilter);
    const recent = sqlite
      .prepare(
        `SELECT
           we.id,
           we.type,
           we.status,
           we.amount,
           we.created_at,
           u.name AS user_name,
           u.phone AS user_phone
         FROM wallet_entries we
         LEFT JOIN users u ON u.id = we.user_id
         WHERE we.type IN (?, ?)
           AND (? = '' OR we.type = ?)
           AND (? = '' OR we.status = ?)
         ORDER BY we.created_at DESC, we.id DESC
         LIMIT ? OFFSET ?`
      )
      .all("DEPOSIT", "WITHDRAW", normalizedType, normalizedType, statusFilter, statusFilter, recentLimit, offset);
    const filteredTotal =
      Number(summary?.pending_count ?? 0) +
      Number(summary?.rejected_count ?? 0) +
      Number(summary?.backoffice_count ?? 0) +
      Number(summary?.successful_count ?? 0);

    return {
      summary: {
        pendingCount: Number(summary?.pending_count ?? 0),
        stalePendingCount: Number(summary?.stale_pending_count ?? 0),
        rejectedCount: Number(summary?.rejected_count ?? 0),
        backofficeCount: Number(summary?.backoffice_count ?? 0),
        successfulCount: Number(summary?.successful_count ?? 0),
        depositSuccessAmount: Number(summary?.deposit_success_amount ?? 0),
        withdrawSuccessAmount: Number(summary?.withdraw_success_amount ?? 0)
      },
      filters: {
        type: normalizedType || null,
        status: statusFilter || null,
        staleHours
      },
      pagination: {
        page,
        limit: recentLimit,
        total: filteredTotal,
        hasMore: offset + recent.length < filteredTotal
      },
      recent: recent.map((row) => ({
        id: row.id,
        type: row.type,
        status: row.status,
        amount: Number(row.amount ?? 0),
        createdAt: __internalToIso(row.created_at),
        userName: row.user_name ?? "Unknown",
        phone: row.user_phone ?? ""
      }))
    };
  }
}
