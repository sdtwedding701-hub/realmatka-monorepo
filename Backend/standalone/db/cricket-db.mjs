import { isStandalonePostgresEnabled } from "../config.mjs";
import {
  __internalGetReadyPgPool,
  __internalGetSqlite,
  __internalNowIso
} from "../db.mjs";

let ensured = false;

function mapMatch(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    teamA: row.team_a,
    teamB: row.team_b,
    status: row.status,
    activeOver: Number(row.active_over ?? 1),
    bettingOpen: Boolean(row.betting_open),
    resultRuns: row.result_runs == null ? null : Number(row.result_runs),
    resultWicket: row.result_wicket == null ? null : Boolean(row.result_wicket),
    resultBoundary: row.result_boundary == null ? null : Boolean(row.result_boundary),
    resultSettledAt: row.result_settled_at || null,
    createdAt: row.created_at
  };
}

function mapBet(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    matchId: row.match_id,
    matchTitle: row.match_title || "",
    overNumber: Number(row.over_number ?? 1),
    betType: row.bet_type,
    selection: row.selection,
    amount: Number(row.amount ?? 0),
    rate: Number(row.rate ?? 0),
    status: row.status,
    payout: Number(row.payout ?? 0),
    settledAt: row.settled_at || null,
    settledResult: row.settled_result || "",
    createdAt: row.created_at
  };
}

async function ensureCricketTables() {
  if (ensured) return;

  if (isStandalonePostgresEnabled()) {
    const pool = await __internalGetReadyPgPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cricket_matches (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        team_a TEXT NOT NULL,
        team_b TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Live',
        active_over INTEGER NOT NULL DEFAULT 1,
        betting_open BOOLEAN NOT NULL DEFAULT TRUE,
        result_runs INTEGER,
        result_wicket BOOLEAN,
        result_boundary BOOLEAN,
        result_settled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cricket_bets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        match_id TEXT NOT NULL,
        match_title TEXT NOT NULL,
        over_number INTEGER NOT NULL,
        bet_type TEXT NOT NULL,
        selection TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        rate NUMERIC NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        payout NUMERIC NOT NULL DEFAULT 0,
        settled_at TIMESTAMPTZ,
        settled_result TEXT,
        created_at TIMESTAMPTZ NOT NULL
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cricket_matches_status ON cricket_matches (status, created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cricket_bets_user_created_at ON cricket_bets (user_id, created_at DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cricket_bets_match_status ON cricket_bets (match_id, status, created_at ASC)`);
  } else {
    const db = __internalGetSqlite();
    db.prepare(`
      CREATE TABLE IF NOT EXISTS cricket_matches (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        team_a TEXT NOT NULL,
        team_b TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Live',
        active_over INTEGER NOT NULL DEFAULT 1,
        betting_open INTEGER NOT NULL DEFAULT 1,
        result_runs INTEGER,
        result_wicket INTEGER,
        result_boundary INTEGER,
        result_settled_at TEXT,
        created_at TEXT NOT NULL
      )
    `).run();
    db.prepare(`
      CREATE TABLE IF NOT EXISTS cricket_bets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        match_id TEXT NOT NULL,
        match_title TEXT NOT NULL,
        over_number INTEGER NOT NULL,
        bet_type TEXT NOT NULL,
        selection TEXT NOT NULL,
        amount REAL NOT NULL,
        rate REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'Pending',
        payout REAL NOT NULL DEFAULT 0,
        settled_at TEXT,
        settled_result TEXT,
        created_at TEXT NOT NULL
      )
    `).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_cricket_matches_status ON cricket_matches (status, created_at DESC)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_cricket_bets_user_created_at ON cricket_bets (user_id, created_at DESC)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_cricket_bets_match_status ON cricket_bets (match_id, status, created_at ASC)`).run();
  }

  ensured = true;
}

export async function listCricketMatches({ admin = false } = {}) {
  await ensureCricketTables();
  if (isStandalonePostgresEnabled()) {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT * FROM cricket_matches
       ${admin ? "" : "WHERE status <> 'Hidden'"}
       ORDER BY created_at DESC, id DESC
       LIMIT 100`
    );
    return result.rows.map(mapMatch);
  }

  const rows = __internalGetSqlite()
    .prepare(
      `SELECT * FROM cricket_matches
       ${admin ? "" : "WHERE status <> 'Hidden'"}
       ORDER BY created_at DESC, id DESC
       LIMIT 100`
    )
    .all();
  return rows.map(mapMatch);
}

export async function findCricketMatch(matchId) {
  await ensureCricketTables();
  if (isStandalonePostgresEnabled()) {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(`SELECT * FROM cricket_matches WHERE id = $1 LIMIT 1`, [matchId]);
    return mapMatch(result.rows[0]);
  }
  return mapMatch(__internalGetSqlite().prepare(`SELECT * FROM cricket_matches WHERE id = ? LIMIT 1`).get(matchId));
}

export async function upsertCricketMatch(input) {
  await ensureCricketTables();
  const now = __internalNowIso();
  const id = String(input.id || `cricket_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`).trim();
  const title = String(input.title || "").trim();
  const teamA = String(input.teamA || "").trim();
  const teamB = String(input.teamB || "").trim();
  const status = String(input.status || "Live").trim() || "Live";
  const activeOver = Math.max(1, Number(input.activeOver || 1));
  const bettingOpen = input.bettingOpen !== false && String(input.bettingOpen) !== "false";
  if (!title || !teamA || !teamB) {
    throw new Error("Match title, team A, and team B are required");
  }

  if (isStandalonePostgresEnabled()) {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `INSERT INTO cricket_matches (id, title, team_a, team_b, status, active_over, betting_open, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         team_a = EXCLUDED.team_a,
         team_b = EXCLUDED.team_b,
         status = EXCLUDED.status,
         active_over = EXCLUDED.active_over,
         betting_open = EXCLUDED.betting_open
       RETURNING *`,
      [id, title, teamA, teamB, status, activeOver, bettingOpen, now]
    );
    return mapMatch(result.rows[0]);
  }

  __internalGetSqlite()
    .prepare(
      `INSERT INTO cricket_matches (id, title, team_a, team_b, status, active_over, betting_open, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         team_a = excluded.team_a,
         team_b = excluded.team_b,
         status = excluded.status,
         active_over = excluded.active_over,
         betting_open = excluded.betting_open`
    )
    .run(id, title, teamA, teamB, status, activeOver, bettingOpen ? 1 : 0, now);
  return findCricketMatch(id);
}

export async function addCricketBet({ userId, match, betType, selection, amount, rate }) {
  await ensureCricketTables();
  const id = `cricket_bid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = __internalNowIso();
  if (isStandalonePostgresEnabled()) {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `INSERT INTO cricket_bets (id, user_id, match_id, match_title, over_number, bet_type, selection, amount, rate, status, payout, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pending', 0, $10)
       RETURNING *`,
      [id, userId, match.id, match.title, match.activeOver, betType, selection, amount, rate, createdAt]
    );
    return mapBet(result.rows[0]);
  }
  __internalGetSqlite()
    .prepare(
      `INSERT INTO cricket_bets (id, user_id, match_id, match_title, over_number, bet_type, selection, amount, rate, status, payout, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', 0, ?)`
    )
    .run(id, userId, match.id, match.title, match.activeOver, betType, selection, amount, rate, createdAt);
  return mapBet(__internalGetSqlite().prepare(`SELECT * FROM cricket_bets WHERE id = ? LIMIT 1`).get(id));
}

export async function listCricketBetsForUser(userId, limit = 200) {
  await ensureCricketTables();
  const normalizedLimit = Math.max(1, Math.min(1000, Number(limit) || 200));
  if (isStandalonePostgresEnabled()) {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT * FROM cricket_bets WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2`,
      [userId, normalizedLimit]
    );
    return result.rows.map(mapBet);
  }
  return __internalGetSqlite()
    .prepare(`SELECT * FROM cricket_bets WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?`)
    .all(userId, normalizedLimit)
    .map(mapBet);
}

export async function listCricketBetsForMatch(matchId) {
  await ensureCricketTables();
  if (isStandalonePostgresEnabled()) {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(`SELECT * FROM cricket_bets WHERE match_id = $1 ORDER BY created_at DESC, id DESC`, [matchId]);
    return result.rows.map(mapBet);
  }
  return __internalGetSqlite()
    .prepare(`SELECT * FROM cricket_bets WHERE match_id = ? ORDER BY created_at DESC, id DESC`)
    .all(matchId)
    .map(mapBet);
}

export async function updateCricketBetSettlement(betId, status, payout, settledResult) {
  const settledAt = status === "Pending" ? null : __internalNowIso();
  if (isStandalonePostgresEnabled()) {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `UPDATE cricket_bets
       SET status = $1, payout = $2, settled_at = $3, settled_result = $4
       WHERE id = $5
       RETURNING *`,
      [status, payout, settledAt, settledResult, betId]
    );
    return mapBet(result.rows[0]);
  }
  __internalGetSqlite()
    .prepare(`UPDATE cricket_bets SET status = ?, payout = ?, settled_at = ?, settled_result = ? WHERE id = ?`)
    .run(status, payout, settledAt, settledResult, betId);
  return mapBet(__internalGetSqlite().prepare(`SELECT * FROM cricket_bets WHERE id = ? LIMIT 1`).get(betId));
}

export async function saveCricketResult(matchId, { runs, wicket, boundary }) {
  await ensureCricketTables();
  const settledAt = __internalNowIso();
  if (isStandalonePostgresEnabled()) {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `UPDATE cricket_matches
       SET result_runs = $1, result_wicket = $2, result_boundary = $3, result_settled_at = $4, betting_open = FALSE
       WHERE id = $5
       RETURNING *`,
      [runs, wicket, boundary, settledAt, matchId]
    );
    return mapMatch(result.rows[0]);
  }
  __internalGetSqlite()
    .prepare(
      `UPDATE cricket_matches
       SET result_runs = ?, result_wicket = ?, result_boundary = ?, result_settled_at = ?, betting_open = 0
       WHERE id = ?`
    )
    .run(runs, wicket ? 1 : 0, boundary ? 1 : 0, settledAt, matchId);
  return findCricketMatch(matchId);
}
