import {
  __internalGetReadyPgPool,
  __internalGetSqlite
} from "../db.mjs";

export async function getReportsSummaryData(from, to) {
  try {
    const pool = await __internalGetReadyPgPool();
    const [
      walletTotalsResult,
      bidTotalsResult,
      payoutTotalsResult,
      loginTotalsResult,
      activeUsersResult,
      userReportsResult,
      marketReportsResult,
      collectionSeriesResult,
      payoutSeriesResult
    ] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'DEPOSIT' AND status = ANY(ARRAY['SUCCESS', 'BACKOFFICE']) THEN amount ELSE 0 END), 0) AS deposits_success,
           COALESCE(SUM(CASE WHEN type = 'DEPOSIT' AND status = 'INITIATED' THEN amount ELSE 0 END), 0) AS deposits_pending,
           COALESCE(SUM(CASE WHEN type = 'WITHDRAW' AND status = 'SUCCESS' THEN amount ELSE 0 END), 0) AS withdraws_success,
           COALESCE(SUM(CASE WHEN type = 'WITHDRAW' AND status = 'INITIATED' THEN amount ELSE 0 END), 0) AS withdraws_pending,
           COALESCE(SUM(CASE WHEN type = 'WITHDRAW' AND status = 'REJECTED' THEN amount ELSE 0 END), 0) AS withdraws_rejected
         FROM wallet_entries
         WHERE created_at >= $1 AND created_at <= $2`,
        [from, to]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS bets_count, COALESCE(SUM(points), 0) AS bets_amount
         FROM bids
         WHERE created_at >= $1 AND created_at <= $2`,
        [from, to]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS payout_amount
         FROM wallet_entries
         WHERE type = 'BID_WIN'
           AND created_at >= $1
           AND created_at <= $2`,
        [from, to]
      ),
      pool.query(`SELECT COUNT(*)::int AS login_count FROM sessions WHERE created_at >= $1 AND created_at <= $2`, [from, to]),
      pool.query(
        `SELECT COUNT(DISTINCT user_id)::int AS active_users
         FROM (
           SELECT user_id FROM bids WHERE created_at >= $1 AND created_at <= $2
           UNION
           SELECT user_id FROM wallet_entries WHERE created_at >= $1 AND created_at <= $2
           UNION
           SELECT user_id FROM sessions WHERE created_at >= $1 AND created_at <= $2
         ) active_users`,
        [from, to]
      ),
      pool.query(
        `SELECT
           b.user_id,
           u.name AS user_name,
           u.phone AS user_phone,
           COUNT(*)::int AS bids_count,
           COALESCE(SUM(b.points), 0) AS bet_amount,
           COALESCE(SUM(b.payout), 0) AS payout_amount
         FROM bids b
         LEFT JOIN users u ON u.id = b.user_id
         WHERE b.created_at >= $1 AND b.created_at <= $2
         GROUP BY b.user_id, u.name, u.phone
         ORDER BY bet_amount DESC`,
        [from, to]
      ),
      pool.query(
        `SELECT market, COUNT(*)::int AS bets_count, COALESCE(SUM(points), 0) AS bets_amount, COALESCE(SUM(payout), 0) AS payout_amount
         FROM bids
         WHERE created_at >= $1 AND created_at <= $2
         GROUP BY market
         ORDER BY bets_amount DESC`,
        [from, to]
      ),
      pool.query(
        `SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, COALESCE(SUM(points), 0) AS collection
         FROM bids
         WHERE created_at >= $1 AND created_at <= $2
         GROUP BY 1`,
        [from, to]
      ),
      pool.query(
        `SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, COALESCE(SUM(amount), 0) AS payout
         FROM wallet_entries
         WHERE type = 'BID_WIN'
           AND created_at >= $1
           AND created_at <= $2
         GROUP BY 1`,
        [from, to]
      )
    ]);

    const dailySeriesMap = new Map();
    for (const row of collectionSeriesResult.rows) {
      dailySeriesMap.set(row.date, { date: row.date, collection: Number(row.collection ?? 0), payout: 0 });
    }
    for (const row of payoutSeriesResult.rows) {
      const existing = dailySeriesMap.get(row.date) ?? { date: row.date, collection: 0, payout: 0 };
      existing.payout = Number(row.payout ?? 0);
      dailySeriesMap.set(row.date, existing);
    }

    const betsAmount = Number(bidTotalsResult.rows[0]?.bets_amount ?? 0);
    const payoutAmount = Number(payoutTotalsResult.rows[0]?.payout_amount ?? 0);

    return {
      totals: {
        depositsSuccess: Number(walletTotalsResult.rows[0]?.deposits_success ?? 0),
        depositsPending: Number(walletTotalsResult.rows[0]?.deposits_pending ?? 0),
        withdrawsSuccess: Number(walletTotalsResult.rows[0]?.withdraws_success ?? 0),
        withdrawsPending: Number(walletTotalsResult.rows[0]?.withdraws_pending ?? 0),
        withdrawsRejected: Number(walletTotalsResult.rows[0]?.withdraws_rejected ?? 0),
        betsCount: Number(bidTotalsResult.rows[0]?.bets_count ?? 0),
        betsAmount,
        payoutAmount,
        loginCount: Number(loginTotalsResult.rows[0]?.login_count ?? 0),
        activeUsers: Number(activeUsersResult.rows[0]?.active_users ?? 0),
        collectionVsPayoutDelta: betsAmount - payoutAmount
      },
      userReports: userReportsResult.rows.map((row) => ({
        userId: row.user_id,
        userName: row.user_name ?? "Unknown",
        userPhone: row.user_phone ?? "",
        bidsCount: Number(row.bids_count ?? 0),
        betAmount: Number(row.bet_amount ?? 0),
        payoutAmount: Number(row.payout_amount ?? 0)
      })),
      marketReports: marketReportsResult.rows.map((row) => ({
        market: row.market,
        betsCount: Number(row.bets_count ?? 0),
        betsAmount: Number(row.bets_amount ?? 0),
        payoutAmount: Number(row.payout_amount ?? 0)
      })),
      dailySeries: Array.from(dailySeriesMap.values()).sort((a, b) => a.date.localeCompare(b.date))
    };
  } catch {
    const sqlite = __internalGetSqlite();
    const walletTotals = sqlite.prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'DEPOSIT' AND status IN ('SUCCESS', 'BACKOFFICE') THEN amount ELSE 0 END), 0) AS deposits_success,
         COALESCE(SUM(CASE WHEN type = 'DEPOSIT' AND status = 'INITIATED' THEN amount ELSE 0 END), 0) AS deposits_pending,
         COALESCE(SUM(CASE WHEN type = 'WITHDRAW' AND status = 'SUCCESS' THEN amount ELSE 0 END), 0) AS withdraws_success,
         COALESCE(SUM(CASE WHEN type = 'WITHDRAW' AND status = 'INITIATED' THEN amount ELSE 0 END), 0) AS withdraws_pending,
         COALESCE(SUM(CASE WHEN type = 'WITHDRAW' AND status = 'REJECTED' THEN amount ELSE 0 END), 0) AS withdraws_rejected
       FROM wallet_entries
       WHERE created_at >= ? AND created_at <= ?`
    ).get(from, to);
    const bidTotals = sqlite.prepare(`SELECT COUNT(*) AS bets_count, COALESCE(SUM(points), 0) AS bets_amount FROM bids WHERE created_at >= ? AND created_at <= ?`).get(from, to);
    const payoutTotals = sqlite.prepare(`SELECT COALESCE(SUM(amount), 0) AS payout_amount FROM wallet_entries WHERE type = 'BID_WIN' AND created_at >= ? AND created_at <= ?`).get(from, to);
    const loginTotals = sqlite.prepare(`SELECT COUNT(*) AS login_count FROM sessions WHERE created_at >= ? AND created_at <= ?`).get(from, to);
    const activeUsers = sqlite.prepare(
      `SELECT COUNT(DISTINCT user_id) AS active_users
       FROM (
         SELECT user_id FROM bids WHERE created_at >= ? AND created_at <= ?
         UNION
         SELECT user_id FROM wallet_entries WHERE created_at >= ? AND created_at <= ?
         UNION
         SELECT user_id FROM sessions WHERE created_at >= ? AND created_at <= ?
       ) active_users`
    ).get(from, to, from, to, from, to);
    const userReports = sqlite.prepare(
      `SELECT b.user_id, u.name AS user_name, u.phone AS user_phone, COUNT(*) AS bids_count, COALESCE(SUM(b.points), 0) AS bet_amount, COALESCE(SUM(b.payout), 0) AS payout_amount
       FROM bids b
       LEFT JOIN users u ON u.id = b.user_id
       WHERE b.created_at >= ? AND b.created_at <= ?
       GROUP BY b.user_id, u.name, u.phone
       ORDER BY bet_amount DESC`
    ).all(from, to);
    const marketReports = sqlite.prepare(
      `SELECT market, COUNT(*) AS bets_count, COALESCE(SUM(points), 0) AS bets_amount, COALESCE(SUM(payout), 0) AS payout_amount
       FROM bids
       WHERE created_at >= ? AND created_at <= ?
       GROUP BY market
       ORDER BY bets_amount DESC`
    ).all(from, to);
    const collectionSeries = sqlite.prepare(`SELECT substr(created_at, 1, 10) AS date, COALESCE(SUM(points), 0) AS collection FROM bids WHERE created_at >= ? AND created_at <= ? GROUP BY substr(created_at, 1, 10)`).all(from, to);
    const payoutSeries = sqlite.prepare(`SELECT substr(created_at, 1, 10) AS date, COALESCE(SUM(amount), 0) AS payout FROM wallet_entries WHERE type = 'BID_WIN' AND created_at >= ? AND created_at <= ? GROUP BY substr(created_at, 1, 10)`).all(from, to);

    const dailySeriesMap = new Map();
    for (const row of collectionSeries) dailySeriesMap.set(row.date, { date: row.date, collection: Number(row.collection ?? 0), payout: 0 });
    for (const row of payoutSeries) {
      const existing = dailySeriesMap.get(row.date) ?? { date: row.date, collection: 0, payout: 0 };
      existing.payout = Number(row.payout ?? 0);
      dailySeriesMap.set(row.date, existing);
    }

    const betsAmount = Number(bidTotals?.bets_amount ?? 0);
    const payoutAmount = Number(payoutTotals?.payout_amount ?? 0);

    return {
      totals: {
        depositsSuccess: Number(walletTotals?.deposits_success ?? 0),
        depositsPending: Number(walletTotals?.deposits_pending ?? 0),
        withdrawsSuccess: Number(walletTotals?.withdraws_success ?? 0),
        withdrawsPending: Number(walletTotals?.withdraws_pending ?? 0),
        withdrawsRejected: Number(walletTotals?.withdraws_rejected ?? 0),
        betsCount: Number(bidTotals?.bets_count ?? 0),
        betsAmount,
        payoutAmount,
        loginCount: Number(loginTotals?.login_count ?? 0),
        activeUsers: Number(activeUsers?.active_users ?? 0),
        collectionVsPayoutDelta: betsAmount - payoutAmount
      },
      userReports: userReports.map((row) => ({
        userId: row.user_id,
        userName: row.user_name ?? "Unknown",
        userPhone: row.user_phone ?? "",
        bidsCount: Number(row.bids_count ?? 0),
        betAmount: Number(row.bet_amount ?? 0),
        payoutAmount: Number(row.payout_amount ?? 0)
      })),
      marketReports: marketReports.map((row) => ({
        market: row.market,
        betsCount: Number(row.bets_count ?? 0),
        betsAmount: Number(row.bets_amount ?? 0),
        payoutAmount: Number(row.payout_amount ?? 0)
      })),
      dailySeries: Array.from(dailySeriesMap.values()).sort((a, b) => a.date.localeCompare(b.date))
    };
  }
}
