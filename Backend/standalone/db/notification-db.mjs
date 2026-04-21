import {
  __internalGetPgPool,
  __internalGetReadyPgPool,
  __internalGetSqlite,
  __internalMapNotificationDeviceRow,
  __internalNowIso,
  __internalToIso
} from "../db.mjs";

export async function listNotificationsForUser(userId, limit = 50) {
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
  try {
    const pool = __internalGetPgPool();
    const result = await pool.query(
      `SELECT id, title, body, channel, read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, safeLimit]
    );
    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      channel: row.channel,
      read: Boolean(row.read),
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
    }));
  } catch {
    const rows = __internalGetSqlite()
      .prepare(
        `SELECT id, title, body, channel, read, created_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
      )
      .all(userId, safeLimit);
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      channel: row.channel,
      read: Boolean(row.read),
      createdAt: row.created_at
    }));
  }
}

export async function markNotificationsReadForUser(userId, options = {}) {
  const notificationId = String(options.notificationId ?? "").trim();

  try {
    const pool = await __internalGetReadyPgPool();
    if (notificationId) {
      const result = await pool.query(
        `UPDATE notifications
         SET read = TRUE
         WHERE user_id = $1
           AND id = $2
           AND read = FALSE`,
        [userId, notificationId]
      );
      return { updatedCount: Number(result.rowCount || 0) };
    }

    const result = await pool.query(
      `UPDATE notifications
       SET read = TRUE
       WHERE user_id = $1
         AND read = FALSE`,
      [userId]
    );
    return { updatedCount: Number(result.rowCount || 0) };
  } catch {
    if (notificationId) {
      const result = __internalGetSqlite()
        .prepare(
          `UPDATE notifications
           SET read = 1
           WHERE user_id = ?
             AND id = ?
             AND read = 0`
        )
        .run(userId, notificationId);
      return { updatedCount: Number(result.changes || 0) };
    }

    const result = __internalGetSqlite()
      .prepare(
        `UPDATE notifications
         SET read = 1
         WHERE user_id = ?
           AND read = 0`
      )
      .run(userId);
    return { updatedCount: Number(result.changes || 0) };
  }
}

export async function registerNotificationDevice(userId, platform, token) {
  const createdAt = __internalNowIso();
  const updatedAt = createdAt;

  try {
    const pool = __internalGetPgPool();
    const existing = await pool.query(
      `SELECT id, user_id, platform, token, enabled, created_at, updated_at
       FROM notification_devices
       WHERE user_id = $1 AND token = $2
       LIMIT 1`,
      [userId, token]
    );
    const current = __internalMapNotificationDeviceRow(existing.rows[0]);
    if (current) {
      await pool.query(
        `UPDATE notification_devices
         SET platform = $1, enabled = TRUE, updated_at = $2
         WHERE id = $3`,
        [platform, updatedAt, current.id]
      );
      return { ...current, platform, enabled: true, updatedAt };
    }

    const id = `device_${Date.now()}`;
    await pool.query(
      `INSERT INTO notification_devices (id, user_id, platform, token, enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, $5, $5)`,
      [id, userId, platform, token, createdAt]
    );
    return { id, userId, platform, token, enabled: true, createdAt, updatedAt };
  } catch {
    const existing = __internalMapNotificationDeviceRow(
      __internalGetSqlite()
        .prepare(
          `SELECT id, user_id, platform, token, enabled, created_at, updated_at
           FROM notification_devices
           WHERE user_id = ? AND token = ?
           LIMIT 1`
        )
        .get(userId, token)
    );
    if (existing) {
      __internalGetSqlite()
        .prepare(
          `UPDATE notification_devices
           SET platform = ?, enabled = 1, updated_at = ?
           WHERE id = ?`
        )
        .run(platform, updatedAt, existing.id);
      return { ...existing, platform, enabled: true, updatedAt };
    }

    const id = `device_${Date.now()}`;
    __internalGetSqlite()
      .prepare(
        `INSERT INTO notification_devices (id, user_id, platform, token, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)`
      )
      .run(id, userId, platform, token, createdAt, updatedAt);

    return { id, userId, platform, token, enabled: true, createdAt, updatedAt };
  }
}

export async function createNotification({ userId, title, body, channel = "general" }) {
  const id = `notification_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = __internalNowIso();

  try {
    const pool = await __internalGetReadyPgPool();
    await pool.query(
      `INSERT INTO notifications (id, user_id, title, body, channel, read, created_at)
       VALUES ($1, $2, $3, $4, $5, FALSE, $6)`,
      [id, userId, title, body, channel, createdAt]
    );
  } catch {
    __internalGetSqlite()
      .prepare(
        `INSERT INTO notifications (id, user_id, title, body, channel, read, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?)`
      )
      .run(id, userId, title, body, channel, createdAt);
  }

  return { id, userId, title, body, channel, read: false, createdAt };
}

function normalizeNotificationListOptions(options = {}) {
  const limit = Math.min(250, Math.max(1, Number(options.limit) || 100));
  const offset = Math.max(0, Number(options.offset) || 0);
  return { limit, offset };
}

export async function listAllNotifications(options = {}) {
  const { limit, offset } = normalizeNotificationListOptions(options);
  try {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT id, user_id, title, body, channel, read, created_at, COUNT(*) OVER()::int AS total_count
       FROM notifications
       ORDER BY created_at DESC
       LIMIT $1
       OFFSET $2`,
      [limit, offset]
    );
    return {
      items: result.rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        body: row.body,
        channel: row.channel,
        read: Boolean(row.read),
        createdAt: __internalToIso(row.created_at)
      })),
      pagination: {
        limit,
        offset,
        total: Number(result.rows[0]?.total_count ?? 0),
        hasMore: offset + limit < Number(result.rows[0]?.total_count ?? 0)
      }
    };
  } catch {
    const rows = __internalGetSqlite()
      .prepare(
        `SELECT id, user_id, title, body, channel, read, created_at
         FROM notifications
         ORDER BY created_at DESC
         LIMIT ?
         OFFSET ?`
      )
      .all(limit, offset);
    return {
      items: rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        body: row.body,
        channel: row.channel,
        read: Boolean(row.read),
        createdAt: __internalToIso(row.created_at)
      })),
      pagination: {
        limit,
        offset,
        total: Number(
          __internalGetSqlite()
            .prepare(`SELECT COUNT(*) AS total_count FROM notifications`)
            .get()?.total_count ?? 0
        ),
        hasMore:
          offset + limit <
          Number(
            __internalGetSqlite()
              .prepare(`SELECT COUNT(*) AS total_count FROM notifications`)
              .get()?.total_count ?? 0
          )
      }
    };
  }
}

export async function getNotificationsAdminSummary(limit = 500) {
  const response = await listAllNotifications({ limit, offset: 0 });
  const items = response.items;
  const unreadCount = items.filter((item) => !item.read).length;
  const uniqueUsers = new Set(items.map((item) => item.userId).filter(Boolean)).size;

  return {
    total: items.length,
    unreadCount,
    uniqueUsers,
    latestCreatedAt: items[0]?.createdAt || null
  };
}
