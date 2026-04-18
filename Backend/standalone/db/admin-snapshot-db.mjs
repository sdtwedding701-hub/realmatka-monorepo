import {
  __internalGetReadyPgPool,
  __internalGetSqlite,
  __internalMapBidRow,
  __internalMapMarketRow,
  __internalMapNotificationDeviceRow,
  __internalMapUserRow,
  __internalMapWalletEntryRow,
  __internalToIso
} from "../db.mjs";

const SNAPSHOT_SECTION_CONFIG = {
  users: {
    orderBy: "joined_at DESC, id DESC",
    pgSelect: `SELECT id, phone, password_hash, mpin_hash, mpin_configured, name, joined_at, referral_code, role, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id FROM users`,
    sqliteSelect: `SELECT id, phone, password_hash, mpin_hash, mpin_configured, name, joined_at, referral_code, role, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id FROM users`,
    mapRow: (row) => __internalMapUserRow(row)
  },
  sessions: {
    orderBy: "created_at DESC, token_hash DESC",
    pgSelect: `SELECT token_hash, user_id, created_at FROM sessions`,
    sqliteSelect: `SELECT token_hash, user_id, created_at FROM sessions`,
    mapRow: (row) => ({ tokenHash: row.token_hash, userId: row.user_id, createdAt: __internalToIso(row.created_at) })
  },
  walletEntries: {
    orderBy: "created_at DESC, id DESC",
    pgSelect: `SELECT id, user_id, type, status, amount, before_balance, after_balance, reference_id, proof_url, note, created_at FROM wallet_entries`,
    sqliteSelect: `SELECT id, user_id, type, status, amount, before_balance, after_balance, reference_id, proof_url, note, created_at FROM wallet_entries`,
    mapRow: (row) => __internalMapWalletEntryRow(row)
  },
  bids: {
    orderBy: "created_at DESC, id DESC",
    pgSelect: `SELECT id, user_id, market, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at FROM bids`,
    sqliteSelect: `SELECT id, user_id, market, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at FROM bids`,
    mapRow: (row) => __internalMapBidRow(row)
  },
  markets: {
    orderBy: "id ASC",
    pgSelect: `SELECT id, slug, name, result, status, action, open_time, close_time, category FROM markets`,
    sqliteSelect: `SELECT id, slug, name, result, status, action, open_time, close_time, category FROM markets`,
    mapRow: (row) => __internalMapMarketRow(row)
  },
  notificationDevices: {
    orderBy: "created_at DESC, id DESC",
    pgSelect: `SELECT id, user_id, platform, token, enabled, created_at, updated_at FROM notification_devices`,
    sqliteSelect: `SELECT id, user_id, platform, token, enabled, created_at, updated_at FROM notification_devices`,
    mapRow: (row) => __internalMapNotificationDeviceRow(row)
  }
};

export async function getAdminSnapshot() {
  try {
    const pool = await __internalGetReadyPgPool();
    const [usersResult, sessionsResult, walletResult, bidsResult, marketsResult, devicesResult] = await Promise.all([
      pool.query(`SELECT id, phone, password_hash, mpin_hash, mpin_configured, name, joined_at, referral_code, role, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id FROM users ORDER BY joined_at DESC, id DESC`),
      pool.query(`SELECT token_hash, user_id, created_at FROM sessions ORDER BY created_at DESC, token_hash DESC`),
      pool.query(`SELECT id, user_id, type, status, amount, before_balance, after_balance, created_at FROM wallet_entries ORDER BY created_at DESC, id DESC`),
      pool.query(`SELECT id, user_id, market, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at FROM bids ORDER BY created_at DESC, id DESC`),
      pool.query(`SELECT id, slug, name, result, status, action, open_time, close_time, category FROM markets ORDER BY id ASC`),
      pool.query(`SELECT id, user_id, platform, token, enabled, created_at, updated_at FROM notification_devices ORDER BY created_at DESC, id DESC`)
    ]);

    return {
      users: usersResult.rows.map((row) => __internalMapUserRow(row)),
      sessions: sessionsResult.rows.map((row) => ({ tokenHash: row.token_hash, userId: row.user_id, createdAt: __internalToIso(row.created_at) })),
      walletEntries: walletResult.rows.map((row) => __internalMapWalletEntryRow(row)),
      bids: bidsResult.rows.map((row) => __internalMapBidRow(row)),
      markets: marketsResult.rows.map((row) => __internalMapMarketRow(row)),
      notificationDevices: devicesResult.rows.map((row) => __internalMapNotificationDeviceRow(row))
    };
  } catch {
    const db = __internalGetSqlite();
    return {
      users: db
        .prepare(`SELECT id, phone, password_hash, mpin_hash, mpin_configured, name, joined_at, referral_code, role, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id FROM users ORDER BY joined_at DESC, id DESC`)
        .all()
        .map((row) => __internalMapUserRow(row)),
      sessions: db
        .prepare(`SELECT token_hash, user_id, created_at FROM sessions ORDER BY created_at DESC, token_hash DESC`)
        .all()
        .map((row) => ({ tokenHash: row.token_hash, userId: row.user_id, createdAt: __internalToIso(row.created_at) })),
      walletEntries: db
        .prepare(`SELECT id, user_id, type, status, amount, before_balance, after_balance, created_at FROM wallet_entries ORDER BY created_at DESC, id DESC`)
        .all()
        .map((row) => __internalMapWalletEntryRow(row)),
      bids: db
        .prepare(`SELECT id, user_id, market, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at FROM bids ORDER BY created_at DESC, id DESC`)
        .all()
        .map((row) => __internalMapBidRow(row)),
      markets: db
        .prepare(`SELECT id, slug, name, result, status, action, open_time, close_time, category FROM markets ORDER BY id ASC`)
        .all()
        .map((row) => __internalMapMarketRow(row)),
      notificationDevices: db
        .prepare(`SELECT id, user_id, platform, token, enabled, created_at, updated_at FROM notification_devices ORDER BY created_at DESC, id DESC`)
        .all()
        .map((row) => __internalMapNotificationDeviceRow(row))
    };
  }
}

export async function getAdminSnapshotSection(section, options = {}) {
  const config = SNAPSHOT_SECTION_CONFIG[section];
  if (!config) {
    return null;
  }

  const page = Math.max(1, Number(options.page ?? 1) || 1);
  const limit = Math.max(1, Math.min(500, Number(options.limit ?? 100) || 100));
  const offset = (page - 1) * limit;

  try {
    const pool = await __internalGetReadyPgPool();
    const [countResult, rowsResult] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM (${config.pgSelect}) AS snapshot_items`),
      pool.query(`${config.pgSelect} ORDER BY ${config.orderBy} LIMIT $1 OFFSET $2`, [limit, offset])
    ]);

    return {
      section,
      items: rowsResult.rows.map((row) => config.mapRow(row)),
      pagination: {
        page,
        limit,
        total: Number(countResult.rows[0]?.total ?? 0),
        hasMore: offset + rowsResult.rows.length < Number(countResult.rows[0]?.total ?? 0)
      }
    };
  } catch {
    const db = __internalGetSqlite();
    const total = Number(db.prepare(`SELECT COUNT(*) AS total FROM (${config.sqliteSelect})`).get()?.total ?? 0);
    const rows = db.prepare(`${config.sqliteSelect} ORDER BY ${config.orderBy} LIMIT ? OFFSET ?`).all(limit, offset);
    return {
      section,
      items: rows.map((row) => config.mapRow(row)),
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + rows.length < total
      }
    };
  }
}
