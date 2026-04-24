import {
  __internalFindSupportSenderUserId,
  __internalGetReadyPgPool,
  __internalGetSqlite,
  __internalMapChatConversationRow,
  __internalMapChatMessageRow,
  __internalNowIso,
  __internalSupportChatResolvedRetentionMs,
  __internalToIso
} from "../db.mjs";

async function findChatConversationByUserId(userId) {
  try {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT id, user_id, status, created_at, updated_at, last_message_at, resolved_at
       FROM chat_conversations
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );
    return __internalMapChatConversationRow(result.rows[0]);
  } catch {
    return __internalMapChatConversationRow(
      __internalGetSqlite()
        .prepare(
          `SELECT id, user_id, status, created_at, updated_at, last_message_at, resolved_at
           FROM chat_conversations
           WHERE user_id = ?
           LIMIT 1`
        )
        .get(userId)
    );
  }
}

async function findChatConversationById(conversationId) {
  try {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT id, user_id, status, created_at, updated_at, last_message_at, resolved_at
       FROM chat_conversations
       WHERE id = $1
       LIMIT 1`,
      [conversationId]
    );
    return __internalMapChatConversationRow(result.rows[0]);
  } catch {
    return __internalMapChatConversationRow(
      __internalGetSqlite()
        .prepare(
          `SELECT id, user_id, status, created_at, updated_at, last_message_at, resolved_at
           FROM chat_conversations
           WHERE id = ?
           LIMIT 1`
        )
        .get(conversationId)
    );
  }
}

async function touchChatConversation(conversationId, timestamp) {
  try {
    const pool = await __internalGetReadyPgPool();
    await pool.query(
      `UPDATE chat_conversations
       SET updated_at = $1, last_message_at = $1
       WHERE id = $2`,
      [timestamp, conversationId]
    );
  } catch {
    __internalGetSqlite()
      .prepare(
        `UPDATE chat_conversations
         SET updated_at = ?, last_message_at = ?
         WHERE id = ?`
      )
      .run(timestamp, timestamp, conversationId);
  }
}

export async function updateSupportConversationStatus(conversationId, status) {
  const nextStatus = String(status || "").trim().toUpperCase();
  if (!conversationId || !["OPEN", "PENDING", "RESOLVED"].includes(nextStatus)) {
    throw new Error("Valid conversationId and status are required");
  }

  const updatedAt = __internalNowIso();
  const resolvedAt = nextStatus === "RESOLVED" ? updatedAt : null;

  try {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `UPDATE chat_conversations
       SET status = $1, updated_at = $2, resolved_at = $3
       WHERE id = $4
       RETURNING id, user_id, status, created_at, updated_at, last_message_at, resolved_at`,
      [nextStatus, updatedAt, resolvedAt, conversationId]
    );
    return __internalMapChatConversationRow(result.rows[0]);
  } catch {
    const sqlite = __internalGetSqlite();
    sqlite
      .prepare(
        `UPDATE chat_conversations
         SET status = ?, updated_at = ?, resolved_at = ?
         WHERE id = ?`
      )
      .run(nextStatus, updatedAt, resolvedAt, conversationId);
    return findChatConversationById(conversationId);
  }
}

export async function getOrCreateSupportConversation(userId) {
  const existing = await findChatConversationByUserId(userId);
  if (existing) {
    return existing;
  }

  const timestamp = __internalNowIso();
  const conversation = {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    status: "OPEN",
    createdAt: timestamp,
    updatedAt: timestamp,
    lastMessageAt: timestamp,
    resolvedAt: null
  };

  try {
    const pool = await __internalGetReadyPgPool();
    await pool.query(
      `INSERT INTO chat_conversations (id, user_id, status, created_at, updated_at, last_message_at, resolved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [conversation.id, conversation.userId, conversation.status, conversation.createdAt, conversation.updatedAt, conversation.lastMessageAt, conversation.resolvedAt]
    );
  } catch {
    __internalGetSqlite()
      .prepare(
        `INSERT INTO chat_conversations (id, user_id, status, created_at, updated_at, last_message_at, resolved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(conversation.id, conversation.userId, conversation.status, conversation.createdAt, conversation.updatedAt, conversation.lastMessageAt, conversation.resolvedAt);
  }

  await addSupportChatMessage({
    conversationId: conversation.id,
    senderRole: "support",
    senderUserId: await __internalFindSupportSenderUserId(),
    text: "Namaste. Wallet, withdraw, market result, bonus, ya bid issue ke liye yahan message bhejiye. Support team jaldi reply karegi.",
    readByUser: true,
    readByAdmin: true
  });

  return findChatConversationById(conversation.id);
}

export async function cleanupResolvedSupportConversations() {
  const cutoffIso = new Date(Date.now() - __internalSupportChatResolvedRetentionMs).toISOString();

  try {
    const pool = await __internalGetReadyPgPool();
    await pool.query(
      `DELETE FROM chat_messages
       WHERE conversation_id IN (
         SELECT id
         FROM chat_conversations
         WHERE status = 'RESOLVED'
           AND resolved_at IS NOT NULL
           AND resolved_at < $1
       )`,
      [cutoffIso]
    );
    await pool.query(
      `DELETE FROM chat_conversations
       WHERE status = 'RESOLVED'
         AND resolved_at IS NOT NULL
         AND resolved_at < $1`,
      [cutoffIso]
    );
  } catch {
    const sqlite = __internalGetSqlite();
    sqlite
      .prepare(
        `DELETE FROM chat_messages
         WHERE conversation_id IN (
           SELECT id
           FROM chat_conversations
           WHERE status = 'RESOLVED'
             AND resolved_at IS NOT NULL
             AND resolved_at < ?
         )`
      )
      .run(cutoffIso);
    sqlite
      .prepare(
        `DELETE FROM chat_conversations
         WHERE status = 'RESOLVED'
           AND resolved_at IS NOT NULL
           AND resolved_at < ?`
      )
      .run(cutoffIso);
  }
}

export async function addSupportChatMessage({
  conversationId,
  senderRole,
  senderUserId = null,
  text,
  readByUser,
  readByAdmin
}) {
  const trimmedText = String(text || "").trim();
  if (!trimmedText) {
    throw new Error("Message text is required");
  }

  if (senderRole === "user") {
    await updateSupportConversationStatus(conversationId, "OPEN");
  }

  const createdAt = __internalNowIso();
  const message = {
    id: `chat_msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    conversationId,
    senderRole,
    senderUserId,
    text: trimmedText,
    readByUser: typeof readByUser === "boolean" ? readByUser : senderRole !== "support",
    readByAdmin: typeof readByAdmin === "boolean" ? readByAdmin : senderRole !== "user",
    createdAt
  };

  try {
    const pool = await __internalGetReadyPgPool();
    await pool.query(
      `INSERT INTO chat_messages (id, conversation_id, sender_role, sender_user_id, text, read_by_user, read_by_admin, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [message.id, message.conversationId, message.senderRole, message.senderUserId, message.text, message.readByUser, message.readByAdmin, message.createdAt]
    );
  } catch {
    __internalGetSqlite()
      .prepare(
        `INSERT INTO chat_messages (id, conversation_id, sender_role, sender_user_id, text, read_by_user, read_by_admin, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        message.id,
        message.conversationId,
        message.senderRole,
        message.senderUserId,
        message.text,
        message.readByUser ? 1 : 0,
        message.readByAdmin ? 1 : 0,
        message.createdAt
      );
  }

  await touchChatConversation(conversationId, createdAt);
  return message;
}

export async function getSupportMessages(conversationId, options = {}) {
  const safeLimit = Math.min(200, Math.max(1, Number(options.limit) || 80));
  try {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT id, conversation_id, sender_role, sender_user_id, text, read_by_user, read_by_admin, created_at
       FROM (
         SELECT id, conversation_id, sender_role, sender_user_id, text, read_by_user, read_by_admin, created_at
         FROM chat_messages
         WHERE conversation_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT $2
       ) recent_messages
       ORDER BY created_at ASC, id ASC`,
      [conversationId, safeLimit]
    );
    return result.rows.map((row) => __internalMapChatMessageRow(row));
  } catch {
    return __internalGetSqlite()
      .prepare(
        `SELECT id, conversation_id, sender_role, sender_user_id, text, read_by_user, read_by_admin, created_at
         FROM (
           SELECT id, conversation_id, sender_role, sender_user_id, text, read_by_user, read_by_admin, created_at
           FROM chat_messages
           WHERE conversation_id = ?
           ORDER BY created_at DESC, id DESC
           LIMIT ?
         ) recent_messages
         ORDER BY created_at ASC, id ASC`
      )
      .all(conversationId, safeLimit)
      .map((row) => __internalMapChatMessageRow(row));
  }
}

export async function getSupportMessageCount(conversationId) {
  try {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT COUNT(*)::int AS total_count
       FROM chat_messages
       WHERE conversation_id = $1`,
      [conversationId]
    );
    return Number(result.rows[0]?.total_count ?? 0);
  } catch {
    const row = __internalGetSqlite()
      .prepare(
        `SELECT COUNT(*) AS total_count
         FROM chat_messages
         WHERE conversation_id = ?`
      )
      .get(conversationId);
    return Number(row?.total_count ?? 0);
  }
}

export async function markSupportMessagesReadByUser(conversationId) {
  try {
    const pool = await __internalGetReadyPgPool();
    await pool.query(
      `UPDATE chat_messages
       SET read_by_user = TRUE
       WHERE conversation_id = $1
         AND sender_role = 'support'
         AND read_by_user = FALSE`,
      [conversationId]
    );
  } catch {
    __internalGetSqlite()
      .prepare(
        `UPDATE chat_messages
         SET read_by_user = 1
         WHERE conversation_id = ?
           AND sender_role = 'support'
           AND read_by_user = 0`
      )
      .run(conversationId);
  }
}

export async function markSupportMessagesReadByAdmin(conversationId) {
  try {
    const pool = await __internalGetReadyPgPool();
    await pool.query(
      `UPDATE chat_messages
       SET read_by_admin = TRUE
       WHERE conversation_id = $1
         AND sender_role = 'user'
         AND read_by_admin = FALSE`,
      [conversationId]
    );
  } catch {
    __internalGetSqlite()
      .prepare(
        `UPDATE chat_messages
         SET read_by_admin = 1
         WHERE conversation_id = ?
           AND sender_role = 'user'
           AND read_by_admin = 0`
      )
      .run(conversationId);
  }
}

export async function getSupportConversationBundleForUser(userId, options = {}) {
  await cleanupResolvedSupportConversations();
  const conversation = await getOrCreateSupportConversation(userId);
  const messages = await getSupportMessages(conversation.id, options);
  return { conversation, messages };
}

function normalizeConversationListOptions(options = {}) {
  const limit = Math.min(200, Math.max(1, Number(options.limit) || 50));
  const offset = Math.max(0, Number(options.offset) || 0);
  const filter = String(options.filter || "all").trim().toLowerCase();
  const search = String(options.search || "").trim();

  return {
    limit,
    offset,
    filter: ["all", "unread", "waiting", "recent", "resolved"].includes(filter) ? filter : "all",
    search
  };
}

function mapSupportConversationListRow(row) {
  return {
    ...__internalMapChatConversationRow(row),
    userName: row.user_name,
    userPhone: row.user_phone,
    lastMessagePreview: row.last_message_text ?? "",
    lastMessageText: row.last_message_text ?? "",
    unreadForAdmin: Number(row.unread_for_admin ?? 0)
  };
}

function buildConversationFilterMeta(row, limit, offset) {
  const total = Number(row?.total_count ?? 0);
  return {
    limit,
    offset,
    total,
    hasMore: offset + limit < total
  };
}

export async function listSupportConversations(options = {}) {
  await cleanupResolvedSupportConversations();
  const { limit, offset, filter, search } = normalizeConversationListOptions(options);
  try {
    const pool = await __internalGetReadyPgPool();
    const now = new Date();
    const waitingCutoff = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const recentCutoff = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const params = [waitingCutoff, recentCutoff];
    const whereParts = [];

    if (filter === "unread") {
      whereParts.push("COALESCE(uc.unread_for_admin, 0) > 0");
    } else if (filter === "waiting") {
      whereParts.push("COALESCE(c.last_message_at, c.updated_at, c.created_at) <= $1");
      whereParts.push("c.status <> 'RESOLVED'");
    } else if (filter === "recent") {
      whereParts.push("COALESCE(c.last_message_at, c.updated_at, c.created_at) >= $2");
      whereParts.push("c.status <> 'RESOLVED'");
    } else if (filter === "resolved") {
      whereParts.push("c.status = 'RESOLVED'");
    }

    if (search) {
      params.push(`%${search}%`);
      const searchIndex = params.length;
      whereParts.push(`(
        u.name ILIKE $${searchIndex}
        OR u.phone ILIKE $${searchIndex}
        OR COALESCE(lm.text, '') ILIKE $${searchIndex}
      )`);
    }

    const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
    params.push(limit, offset);
    const limitIndex = params.length - 1;
    const offsetIndex = params.length;

    const result = await pool.query(
      `SELECT
         c.id,
         c.user_id,
         c.status,
         c.created_at,
         c.updated_at,
         c.last_message_at,
         c.resolved_at,
         u.name AS user_name,
         u.phone AS user_phone,
         lm.text AS last_message_text,
         COALESCE(uc.unread_for_admin, 0) AS unread_for_admin,
         COUNT(*) OVER()::int AS total_count
       FROM chat_conversations c
       LEFT JOIN users u ON u.id = c.user_id
       LEFT JOIN (
         SELECT DISTINCT ON (conversation_id)
           conversation_id,
           text
         FROM chat_messages
         ORDER BY conversation_id, created_at DESC, id DESC
       ) lm ON lm.conversation_id = c.id
       LEFT JOIN (
         SELECT conversation_id, COUNT(*)::int AS unread_for_admin
         FROM chat_messages
         WHERE sender_role = 'user'
           AND read_by_admin = FALSE
         GROUP BY conversation_id
       ) uc ON uc.conversation_id = c.id
       ${whereClause}
       ORDER BY COALESCE(c.last_message_at, c.updated_at, c.created_at) DESC, c.id DESC
       LIMIT $${limitIndex}
       OFFSET $${offsetIndex}`,
      params
    );

    return {
      items: result.rows.map(mapSupportConversationListRow),
      pagination: buildConversationFilterMeta(result.rows[0], limit, offset)
    };
  } catch {
    const sqlite = __internalGetSqlite();
    let rows = sqlite
      .prepare(
        `SELECT
           c.id,
           c.user_id,
           c.status,
           c.created_at,
           c.updated_at,
           c.last_message_at,
           c.resolved_at,
           u.name AS user_name,
           u.phone AS user_phone,
           (
             SELECT text
             FROM chat_messages
             WHERE conversation_id = c.id
             ORDER BY created_at DESC, id DESC
             LIMIT 1
           ) AS last_message_text,
           (
             SELECT COUNT(*)
             FROM chat_messages
             WHERE conversation_id = c.id
               AND sender_role = 'user'
               AND read_by_admin = 0
           ) AS unread_for_admin
         FROM chat_conversations c
         LEFT JOIN users u ON u.id = c.user_id
         ORDER BY COALESCE(c.last_message_at, c.updated_at, c.created_at) DESC, c.id DESC`
      )
      .all()
      .map(mapSupportConversationListRow);

    if (search) {
      const lowerSearch = search.toLowerCase();
      rows = rows.filter((row) =>
        String(row.userName || "").toLowerCase().includes(lowerSearch) ||
        String(row.userPhone || "").toLowerCase().includes(lowerSearch) ||
        String(row.lastMessageText || "").toLowerCase().includes(lowerSearch)
      );
    }

    if (filter === "unread") {
      rows = rows.filter((row) => Number(row.unreadForAdmin || 0) > 0);
    } else if (filter === "waiting") {
      const waitingTime = Date.now() - 15 * 60 * 1000;
      rows = rows.filter((row) => {
        const stamp = new Date(row.lastMessageAt || row.updatedAt || row.createdAt || 0).getTime();
        return stamp <= waitingTime && String(row.status || "").toUpperCase() !== "RESOLVED";
      });
    } else if (filter === "recent") {
      const recentTime = Date.now() - 60 * 60 * 1000;
      rows = rows.filter((row) => {
        const stamp = new Date(row.lastMessageAt || row.updatedAt || row.createdAt || 0).getTime();
        return stamp >= recentTime && String(row.status || "").toUpperCase() !== "RESOLVED";
      });
    } else if (filter === "resolved") {
      rows = rows.filter((row) => String(row.status || "").toUpperCase() === "RESOLVED");
    }

    const total = rows.length;
    return {
      items: rows.slice(offset, offset + limit),
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total
      }
    };
  }
}

export async function getSupportConversationSummary() {
  await cleanupResolvedSupportConversations();
  try {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS conversations_count,
         COALESCE((
           SELECT COUNT(*)::int
           FROM chat_messages
           WHERE sender_role = 'user'
             AND read_by_admin = FALSE
         ), 0) AS unread_for_admin`
    );
    return {
      conversationsCount: Number(result.rows[0]?.conversations_count ?? 0),
      unreadForAdmin: Number(result.rows[0]?.unread_for_admin ?? 0)
    };
  } catch {
    const row = __internalGetSqlite()
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM chat_conversations) AS conversations_count,
           (SELECT COUNT(*) FROM chat_messages WHERE sender_role = 'user' AND read_by_admin = 0) AS unread_for_admin`
      )
      .get();
    return {
      conversationsCount: Number(row?.conversations_count ?? 0),
      unreadForAdmin: Number(row?.unread_for_admin ?? 0)
    };
  }
}

export async function getSupportConversationDetailsForAdmin(conversationId, options = {}) {
  await cleanupResolvedSupportConversations();
  const conversation = await findChatConversationById(conversationId);
  if (!conversation) {
    return null;
  }

  const { findUserById } = await import("../db.mjs");
  const user = await findUserById(conversation.userId);
  const [messages, totalCount] = await Promise.all([
    getSupportMessages(conversation.id, options),
    getSupportMessageCount(conversation.id)
  ]);
  const normalizedLimit = Math.min(200, Math.max(1, Number(options.limit) || 100));

  return {
    conversation,
    user: user
      ? {
          id: user.id,
          name: user.name,
          phone: user.phone
        }
      : null,
    messages,
    pagination: {
      limit: normalizedLimit,
      totalCount,
      hasOlder: totalCount > messages.length
    }
  };
}
