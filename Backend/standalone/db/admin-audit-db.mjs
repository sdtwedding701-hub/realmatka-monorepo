import {
  __internalGetReadyPgPool,
  __internalGetSqlite,
  __internalMapAuditLogRow
} from "../db.mjs";

export async function getAuditLogs(limit = 100) {
  try {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT id, actor_user_id, action, entity_type, entity_id, details, created_at
       FROM audit_logs
       ORDER BY created_at DESC, id DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map((row) => __internalMapAuditLogRow(row));
  } catch {
    return __internalGetSqlite()
      .prepare(
        `SELECT id, actor_user_id, action, entity_type, entity_id, details, created_at
         FROM audit_logs
         ORDER BY created_at DESC, id DESC
         LIMIT ?`
      )
      .all(limit)
      .map((row) => __internalMapAuditLogRow(row));
  }
}

export async function getAuditLogsPage({ limit = 500, offset = 0 } = {}) {
  const normalizedLimit = Math.max(1, Math.min(5000, Number(limit) || 500));
  const normalizedOffset = Math.max(0, Number(offset) || 0);
  try {
    const pool = await __internalGetReadyPgPool();
    const [countResult, rowsResult] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM audit_logs`),
      pool.query(
        `SELECT id, actor_user_id, action, entity_type, entity_id, details, created_at
         FROM audit_logs
         ORDER BY created_at DESC, id DESC
         LIMIT $1 OFFSET $2`,
        [normalizedLimit, normalizedOffset]
      )
    ]);
    const total = Number(countResult.rows[0]?.total ?? 0);
    return {
      items: rowsResult.rows.map((row) => __internalMapAuditLogRow(row)),
      pagination: {
        limit: normalizedLimit,
        offset: normalizedOffset,
        total,
        hasMore: normalizedOffset + rowsResult.rows.length < total
      }
    };
  } catch {
    const sqlite = __internalGetSqlite();
    const total = Number(sqlite.prepare(`SELECT COUNT(*) AS total FROM audit_logs`).get()?.total ?? 0);
    const items = sqlite
      .prepare(
        `SELECT id, actor_user_id, action, entity_type, entity_id, details, created_at
         FROM audit_logs
         ORDER BY created_at DESC, id DESC
         LIMIT ? OFFSET ?`
      )
      .all(normalizedLimit, normalizedOffset)
      .map((row) => __internalMapAuditLogRow(row));
    return {
      items,
      pagination: {
        limit: normalizedLimit,
        offset: normalizedOffset,
        total,
        hasMore: normalizedOffset + items.length < total
      }
    };
  }
}
