import { randomBytes } from "node:crypto";
import { hashSecret } from "../http.mjs";
import {
  __internalCacheActiveUserByTokenHash,
  __internalClearCachedAuthSession,
  __internalGetCachedActiveUserByTokenHash,
  __internalGetReadyPgPool,
  __internalGetSqlite,
  __internalIsUserAccountActive,
  __internalMapUserRow,
  __internalNowIso,
  __internalSessionTtlMs
} from "../db.mjs";

export { verifyCredential } from "../db.mjs";

export async function findUserByPhone(phone) {
  if (__internalGetReadyPgPool) {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT id, phone, password_hash, mpin_hash, mpin_configured, name, role, referral_code, joined_at, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id
       FROM users
       WHERE phone = $1
       LIMIT 1`,
      [phone]
    );
    return __internalMapUserRow(result.rows[0]);
  }

  const row = __internalGetSqlite()
    .prepare(
      `SELECT id, phone, password_hash, mpin_hash, mpin_configured, name, role, referral_code, joined_at, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id
       FROM users
       WHERE phone = ?
       LIMIT 1`
    )
    .get(phone);
  return __internalMapUserRow(row);
}

function mapAdminAccountRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    adminId: row.id,
    userId: row.id,
    phone: row.phone,
    adminPhone: row.phone,
    name: row.display_name,
    adminDisplayName: row.display_name,
    passwordHash: row.password_hash,
    role: row.role ?? "admin",
    adminTwoFactorEnabled: row.two_factor_enabled == null ? true : Boolean(row.two_factor_enabled),
    adminTwoFactorSecret: row.two_factor_secret ?? "",
    blockedAt: row.blocked_at ?? null,
    deactivatedAt: row.deactivated_at ?? null,
    approvalStatus: "Approved",
    approvedAt: row.created_at ?? null,
    rejectedAt: null,
    statusNote: "",
    hasMpin: false,
    mpinHash: null,
    referralCode: "",
    joinedAt: row.created_at ?? null,
    signupBonusGranted: true,
    referredByUserId: null
  };
}

export async function findAdminByPhone(phone) {
  try {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT
         id,
         phone,
         password_hash,
         display_name,
         role,
         two_factor_enabled,
         two_factor_secret,
         blocked_at,
         deactivated_at,
         created_at
       FROM admins
       WHERE phone = $1
       LIMIT 1`,
      [phone]
    );
    return mapAdminAccountRow(result.rows[0]);
  } catch {
    const row = __internalGetSqlite()
      .prepare(
        `SELECT
           id,
           phone,
           password_hash,
           display_name,
           role,
           two_factor_enabled,
           two_factor_secret,
           blocked_at,
           deactivated_at,
           created_at
         FROM admins
         WHERE phone = ?
         LIMIT 1`
      )
      .get(phone);
    return mapAdminAccountRow(row);
  }
}

export async function findAdminById(adminId) {
  try {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT
         id,
         phone,
         password_hash,
         display_name,
         role,
         two_factor_enabled,
         two_factor_secret,
         blocked_at,
         deactivated_at,
         created_at
       FROM admins
       WHERE id = $1
       LIMIT 1`,
      [adminId]
    );
    return mapAdminAccountRow(result.rows[0]);
  } catch {
    const row = __internalGetSqlite()
      .prepare(
        `SELECT
           id,
           phone,
           password_hash,
           display_name,
           role,
           two_factor_enabled,
           two_factor_secret,
           blocked_at,
           deactivated_at,
           created_at
         FROM admins
         WHERE id = ?
         LIMIT 1`
      )
      .get(adminId);
    return mapAdminAccountRow(row);
  }
}

export async function createAdminSession(adminId) {
  const rawToken = randomBytes(24).toString("hex");
  const tokenHash = hashSecret(rawToken);
  const createdAt = __internalNowIso();

  try {
    const pool = await __internalGetReadyPgPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM admin_sessions WHERE admin_id = $1`, [adminId]);
      await client.query(
        `INSERT INTO admin_sessions (token_hash, admin_id, created_at)
         VALUES ($1, $2, $3)`,
        [tokenHash, adminId, createdAt]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch {
    const sqlite = __internalGetSqlite();
    sqlite.exec("BEGIN");
    try {
      sqlite.prepare(`DELETE FROM admin_sessions WHERE admin_id = ?`).run(adminId);
      sqlite.prepare(`INSERT INTO admin_sessions (token_hash, admin_id, created_at) VALUES (?, ?, ?)`).run(tokenHash, adminId, createdAt);
      sqlite.exec("COMMIT");
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
  }

  __internalClearCachedAuthSession(tokenHash);
  return { rawToken, tokenHash, createdAt };
}

export async function updateAdminTwoFactorSecret(adminId, secret) {
  const updatedAt = __internalNowIso();

  try {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `UPDATE admins
       SET two_factor_secret = $2, updated_at = $3
       WHERE id = $1
       RETURNING
         id,
         phone,
         password_hash,
         display_name,
         role,
         two_factor_enabled,
         two_factor_secret,
         blocked_at,
         deactivated_at,
         created_at`,
      [adminId, secret, updatedAt]
    );
    return mapAdminAccountRow(result.rows[0]);
  } catch {
    __internalGetSqlite()
      .prepare(
        `UPDATE admins
         SET two_factor_secret = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(secret, updatedAt, adminId);

    return findAdminById(adminId);
  }
}

export async function createSession(userId) {
  const rawToken = randomBytes(24).toString("hex");
  const tokenHash = hashSecret(rawToken);
  const createdAt = __internalNowIso();

  try {
    const pool = await __internalGetReadyPgPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM sessions WHERE user_id = $1`, [userId]);
      await client.query(
        `INSERT INTO sessions (token_hash, user_id, created_at)
         VALUES ($1, $2, $3)`,
        [tokenHash, userId, createdAt]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch {
    const sqlite = __internalGetSqlite();
    sqlite.exec("BEGIN");
    try {
      sqlite.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
      sqlite.prepare(`INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?, ?, ?)`).run(tokenHash, userId, createdAt);
      sqlite.exec("COMMIT");
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
  }

  __internalClearCachedAuthSession(tokenHash);
  return { rawToken, tokenHash, createdAt };
}

export async function requireUserByToken(token) {
  if (!token) {
    return null;
  }

  const tokenHash = hashSecret(token);
  const cachedUser = __internalGetCachedActiveUserByTokenHash(tokenHash);
  if (cachedUser) {
    return cachedUser;
  }

  const minCreatedAt = new Date(Date.now() - __internalSessionTtlMs).toISOString();

  try {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT u.id, u.phone, u.password_hash, u.mpin_hash, u.mpin_configured, u.name, u.role, u.referral_code, u.joined_at, u.approval_status, u.approved_at, u.rejected_at, u.blocked_at, u.deactivated_at, u.status_note, u.signup_bonus_granted, u.referred_by_user_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.created_at >= $2
       LIMIT 1`,
      [tokenHash, minCreatedAt]
    );
    const user = __internalMapUserRow(result.rows[0]);
    const activeUser = __internalIsUserAccountActive(user) ? user : null;
    if (activeUser) {
      __internalCacheActiveUserByTokenHash(tokenHash, activeUser);
    } else {
      __internalClearCachedAuthSession(tokenHash);
    }
    return activeUser;
  } catch {
    const row = __internalGetSqlite()
      .prepare(
        `SELECT u.id, u.phone, u.password_hash, u.mpin_hash, u.mpin_configured, u.name, u.role, u.referral_code, u.joined_at, u.approval_status, u.approved_at, u.rejected_at, u.blocked_at, u.deactivated_at, u.status_note, u.signup_bonus_granted, u.referred_by_user_id
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.created_at >= ?
         LIMIT 1`
      )
      .get(tokenHash, minCreatedAt);
    const user = __internalMapUserRow(row);
    const activeUser = __internalIsUserAccountActive(user) ? user : null;
    if (activeUser) {
      __internalCacheActiveUserByTokenHash(tokenHash, activeUser);
    } else {
      __internalClearCachedAuthSession(tokenHash);
    }
    return activeUser;
  }
}

export async function requireUserSnapshotByToken(token) {
  if (!token) {
    return null;
  }

  const tokenHash = hashSecret(token);
  const minCreatedAt = new Date(Date.now() - __internalSessionTtlMs).toISOString();

  try {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT
         u.id,
         u.phone,
         u.password_hash,
         u.mpin_hash,
         u.mpin_configured,
         u.name,
         u.role,
         u.referral_code,
         u.joined_at,
         u.approval_status,
         u.approved_at,
         u.rejected_at,
         u.blocked_at,
         u.deactivated_at,
         u.status_note,
         u.signup_bonus_granted,
         u.referred_by_user_id,
         COALESCE((
           SELECT we.after_balance
           FROM wallet_entries we
           WHERE we.user_id = u.id
           ORDER BY we.created_at DESC, we.id DESC
           LIMIT 1
         ), 0) AS wallet_balance
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.created_at >= $2
       LIMIT 1`,
      [tokenHash, minCreatedAt]
    );

    const user = __internalMapUserRow(result.rows[0]);
    if (!__internalIsUserAccountActive(user)) {
      __internalClearCachedAuthSession(tokenHash);
      return null;
    }

    __internalCacheActiveUserByTokenHash(tokenHash, user);
    return {
      ...user,
      walletBalance: Number(result.rows[0]?.wallet_balance ?? 0)
    };
  } catch {
    const row = __internalGetSqlite()
      .prepare(
        `SELECT
           u.id,
           u.phone,
           u.password_hash,
           u.mpin_hash,
           u.mpin_configured,
           u.name,
           u.role,
           u.referral_code,
           u.joined_at,
           u.approval_status,
           u.approved_at,
           u.rejected_at,
           u.blocked_at,
           u.deactivated_at,
           u.status_note,
           u.signup_bonus_granted,
           u.referred_by_user_id,
           COALESCE((
             SELECT we.after_balance
             FROM wallet_entries we
             WHERE we.user_id = u.id
             ORDER BY we.created_at DESC, we.id DESC
             LIMIT 1
           ), 0) AS wallet_balance
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.created_at >= ?
         LIMIT 1`
      )
      .get(tokenHash, minCreatedAt);

    const user = __internalMapUserRow(row);
    if (!__internalIsUserAccountActive(user)) {
      __internalClearCachedAuthSession(tokenHash);
      return null;
    }

    __internalCacheActiveUserByTokenHash(tokenHash, user);
    return {
      ...user,
      walletBalance: Number(row?.wallet_balance ?? 0)
    };
  }
}

export async function requireAdminByToken(token) {
  if (!token) {
    return null;
  }

  const tokenHash = hashSecret(token);
  const minCreatedAt = new Date(Date.now() - __internalSessionTtlMs).toISOString();

  try {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT
         a.id,
         a.phone,
         a.password_hash,
         a.display_name,
         a.role,
         a.two_factor_enabled,
         a.blocked_at,
         a.deactivated_at,
         a.created_at
       FROM admin_sessions s
       JOIN admins a ON a.id = s.admin_id
       WHERE s.token_hash = $1 AND s.created_at >= $2
       LIMIT 1`,
      [tokenHash, minCreatedAt]
    );
    return mapAdminAccountRow(result.rows[0]);
  } catch {
    const row = __internalGetSqlite()
      .prepare(
        `SELECT
           a.id,
           a.phone,
           a.password_hash,
           a.display_name,
           a.role,
           a.two_factor_enabled,
           a.blocked_at,
           a.deactivated_at,
           a.created_at
         FROM admin_sessions s
         JOIN admins a ON a.id = s.admin_id
         WHERE s.token_hash = ? AND s.created_at >= ?
         LIMIT 1`
      )
      .get(tokenHash, minCreatedAt);
    return mapAdminAccountRow(row);
  }
}

export async function getAppSettings() {
  const { getAppSettings } = await import("../db.mjs");
  return getAppSettings();
}
