import { isStandalonePostgresEnabled } from "../config.mjs";
import {
  __internalGetPgPool,
  __internalGetReadyPgPool,
  __internalGetSqlite,
  __internalMapBidRow,
  __internalNowIso
} from "../db.mjs";

export async function addBid({ userId, market, marketDay, boardLabel, gameType, sessionType, digit, points, status, payout, settledAt, settledResult }) {
  const id = `bid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = __internalNowIso();

  if (isStandalonePostgresEnabled()) {
    const pool = __internalGetPgPool();
    await pool.query(
      `INSERT INTO bids (id, user_id, market, market_day, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [id, userId, market, marketDay, boardLabel, gameType, sessionType, digit, points, status, payout, settledAt, settledResult, createdAt]
    );
  } else {
    __internalGetSqlite()
      .prepare(
        `INSERT INTO bids (id, user_id, market, market_day, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, userId, market, marketDay, boardLabel, gameType, sessionType, digit, points, status, payout, settledAt, settledResult, createdAt);
  }

  return { id, userId, market, marketDay, boardLabel, gameType, sessionType, digit, points, status, payout, settledAt, settledResult, createdAt };
}

export async function getBidsForUser(userId, limit = 50) {
  const normalizedLimit = Math.max(1, Math.min(5000, Number(limit) || 50));
  if (isStandalonePostgresEnabled()) {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT id, user_id, market, market_day, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at
       FROM bids
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [userId, normalizedLimit]
    );
    return result.rows.map((row) => __internalMapBidRow(row));
  }

  return __internalGetSqlite()
    .prepare(
      `SELECT id, user_id, market, market_day, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at
       FROM bids
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ?`
    )
    .all(userId, normalizedLimit)
    .map((row) => __internalMapBidRow(row));
}

export async function getBidsForMarket(marketName) {
  if (isStandalonePostgresEnabled()) {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT id, user_id, market, market_day, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at
       FROM bids
       WHERE market = $1
       ORDER BY created_at ASC, id ASC`,
      [marketName]
    );
    return result.rows.map((row) => __internalMapBidRow(row));
  }

  return __internalGetSqlite()
    .prepare(
      `SELECT id, user_id, market, market_day, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at
       FROM bids
       WHERE market = ?
       ORDER BY created_at ASC, id ASC`
    )
    .all(marketName)
    .map((row) => __internalMapBidRow(row));
}

export async function listAllBids(limit = 300) {
  const normalizedLimit = Math.max(1, Math.min(5000, Number(limit) || 300));
  if (isStandalonePostgresEnabled()) {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT id, user_id, market, market_day, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at
       FROM bids
       ORDER BY created_at DESC, id DESC
       LIMIT $1`,
      [normalizedLimit]
    );
    return result.rows.map((row) => __internalMapBidRow(row));
  }

  return __internalGetSqlite()
    .prepare(
      `SELECT id, user_id, market, market_day, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at
       FROM bids
       ORDER BY created_at DESC, id DESC
       LIMIT ?`
    )
    .all(normalizedLimit)
    .map((row) => __internalMapBidRow(row));
}

export async function listBidsPage({ limit = 500, offset = 0 } = {}) {
  const normalizedLimit = Math.max(1, Math.min(5000, Number(limit) || 500));
  const normalizedOffset = Math.max(0, Number(offset) || 0);
  if (isStandalonePostgresEnabled()) {
    const pool = await __internalGetReadyPgPool();
    const [countResult, rowsResult] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM bids`),
      pool.query(
        `SELECT id, user_id, market, market_day, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at
         FROM bids
         ORDER BY created_at DESC, id DESC
         LIMIT $1 OFFSET $2`,
        [normalizedLimit, normalizedOffset]
      )
    ]);
    const total = Number(countResult.rows[0]?.total ?? 0);
    return {
      items: rowsResult.rows.map((row) => __internalMapBidRow(row)),
      pagination: {
        limit: normalizedLimit,
        offset: normalizedOffset,
        total,
        hasMore: normalizedOffset + rowsResult.rows.length < total
      }
    };
  }

  const sqlite = __internalGetSqlite();
  const total = Number(sqlite.prepare(`SELECT COUNT(*) AS total FROM bids`).get()?.total ?? 0);
  const items = sqlite
    .prepare(
      `SELECT id, user_id, market, market_day, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at
       FROM bids
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`
    )
    .all(normalizedLimit, normalizedOffset)
    .map((row) => __internalMapBidRow(row));
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

export async function updateBidSettlement(bidId, status, payout, settledResult) {
  const settledAt = status === "Pending" ? null : __internalNowIso();
  const normalizedResult = status === "Pending" ? null : settledResult;

  if (isStandalonePostgresEnabled()) {
    const pool = __internalGetPgPool();
    const result = await pool.query(
      `UPDATE bids
       SET status = $1, payout = $2, settled_at = $3, settled_result = $4
       WHERE id = $5
       RETURNING id, user_id, market, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at`,
      [status, payout, settledAt, normalizedResult, bidId]
    );
    return __internalMapBidRow(result.rows[0]);
  }

  const db = __internalGetSqlite();
  db.prepare(`UPDATE bids SET status = ?, payout = ?, settled_at = ?, settled_result = ? WHERE id = ?`).run(
    status,
    payout,
    settledAt,
    normalizedResult,
    bidId
  );
  return __internalMapBidRow(
    db.prepare(
      `SELECT id, user_id, market, market_day, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at
       FROM bids WHERE id = ? LIMIT 1`
    ).get(bidId)
  );
}
