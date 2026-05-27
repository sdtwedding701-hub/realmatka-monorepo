import { isStandalonePostgresEnabled } from "../config.mjs";
import {
  __internalGetReadyPgPool,
  __internalGetSqlite
} from "../db.mjs";

const DEFAULT_HISTORY_RETENTION_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getRetentionDays() {
  const configured = Number(process.env.HISTORY_RETENTION_DAYS || DEFAULT_HISTORY_RETENTION_DAYS);
  if (!Number.isFinite(configured) || configured < 1) return DEFAULT_HISTORY_RETENTION_DAYS;
  return Math.floor(configured);
}

function getCutoffIso(retentionDays = getRetentionDays()) {
  return new Date(Date.now() - retentionDays * MS_PER_DAY).toISOString();
}

export function getHistoryRetentionCutoffIso(retentionDays = getRetentionDays()) {
  return getCutoffIso(retentionDays);
}

export async function cleanupOldHistory({ retentionDays = getRetentionDays() } = {}) {
  const cutoffIso = getCutoffIso(retentionDays);

  if (isStandalonePostgresEnabled()) {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(`DELETE FROM bids WHERE created_at < $1`, [cutoffIso]);
    return {
      retentionDays,
      cutoffIso,
      bids: Number(result.rowCount || 0),
      walletEntries: 0,
      paymentOrders: 0
    };
  }

  const result = __internalGetSqlite().prepare(`DELETE FROM bids WHERE created_at < ?`).run(cutoffIso);
  return {
    retentionDays,
    cutoffIso,
    bids: Number(result.changes || 0),
    walletEntries: 0,
    paymentOrders: 0
  };
}
