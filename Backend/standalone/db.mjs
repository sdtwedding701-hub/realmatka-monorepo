import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Pool } from "pg";
import { fileURLToPath } from "node:url";
import { standaloneConfig, isStandalonePostgresEnabled } from "./config.mjs";
import { hashSecret } from "./http.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const sqlitePath = path.join(backendRoot, "data", "server.db");
const postgresSchemaSql = readFileSync(path.join(backendRoot, "postgres-schema.sql"), "utf8");
const sessionTtlMs = standaloneConfig.sessionTtlHours * 60 * 60 * 1000;
const signupBonusAmount = 25;
const supportChatResolvedRetentionMs = Math.max(1, standaloneConfig.supportChatResolvedRetentionDays) * 24 * 60 * 60 * 1000;
const dbIndexDefinitions = [
  ["idx_users_role_approval_joined_at", "users (role, approval_status, joined_at DESC)"],
  ["idx_users_status_flags", "users (blocked_at, deactivated_at)"],
  ["idx_sessions_user_created_at", "sessions (user_id, created_at DESC)"],
  ["idx_otp_challenges_phone_purpose_created_at", "otp_challenges (phone, purpose, created_at DESC)"],
  ["idx_otp_challenges_phone_purpose_expires_at", "otp_challenges (phone, purpose, expires_at DESC)"],
  ["idx_wallet_entries_user_created_at", "wallet_entries (user_id, created_at DESC)"],
  ["idx_wallet_entries_type_status_created_at", "wallet_entries (type, status, created_at DESC)"],
  ["idx_wallet_entries_user_type_created_at", "wallet_entries (user_id, type, created_at DESC)"],
  ["idx_wallet_entries_user_reference_id", "wallet_entries (user_id, reference_id)"],
  ["idx_bids_user_created_at", "bids (user_id, created_at DESC)"],
  ["idx_bids_market_created_at", "bids (market, created_at DESC)"],
  ["idx_bids_market_status_created_at", "bids (market, status, created_at DESC)"],
  ["idx_bids_user_status_created_at", "bids (user_id, status, created_at DESC)"],
  ["idx_bank_accounts_user_created_at", "bank_accounts (user_id, created_at DESC)"],
  ["idx_audit_logs_actor_created_at", "audit_logs (actor_user_id, created_at DESC)"],
  ["idx_audit_logs_entity_created_at", "audit_logs (entity_type, entity_id, created_at DESC)"],
  ["idx_notification_devices_user_enabled_updated_at", "notification_devices (user_id, enabled, updated_at DESC)"],
  ["idx_notifications_user_read_created_at", "notifications (user_id, read, created_at DESC)"],
  ["idx_payment_orders_user_created_at", "payment_orders (user_id, created_at DESC)"],
  ["idx_payment_orders_status_created_at", "payment_orders (status, created_at DESC)"],
  ["idx_chat_conversations_user_updated_at", "chat_conversations (user_id, updated_at DESC)"],
  ["idx_chat_conversations_status_last_message_at", "chat_conversations (status, last_message_at DESC)"],
  ["idx_chat_messages_conversation_created_at", "chat_messages (conversation_id, created_at DESC)"]
];

let sqlite = null;
let pgPool = null;
let pgBootstrapPromise = null;

function getDefaultSeedAdmin() {
  if (!standaloneConfig.allowDefaultAdminSeed) {
    return null;
  }
  if (!standaloneConfig.defaultAdminPhone || !standaloneConfig.defaultAdminPassword || !standaloneConfig.defaultAdminMpin) {
    return null;
  }

  return {
    id: "user_1",
    phone: standaloneConfig.defaultAdminPhone,
    passwordHash: hashSecret(standaloneConfig.defaultAdminPassword),
    mpinHash: hashSecret(standaloneConfig.defaultAdminMpin),
    name: standaloneConfig.defaultAdminName,
    joinedAt: "2025-04-12T10:00:00.000Z",
    referralCode: standaloneConfig.defaultAdminReferralCode,
    role: "admin",
    approvalStatus: "Approved"
  };
}

function getDefaultWalletEntry(seedAdmin) {
  if (!seedAdmin) {
    return null;
  }

  return {
    id: "wallet_1",
    userId: seedAdmin.id,
    type: "DEPOSIT",
    status: "SUCCESS",
    amount: 0,
    beforeBalance: 0,
    afterBalance: 0
  };
}

function isUserAccountActive(user) {
  return Boolean(user) && !user.blockedAt && !user.deactivatedAt;
}

async function findSupportSenderUserId() {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT id
       FROM users
       WHERE role = 'admin'
       ORDER BY joined_at ASC, id ASC
       LIMIT 1`
    );
    return result.rows[0]?.id ?? null;
  }

  const row = getSqlite()
    .prepare(
      `SELECT id
       FROM users
       WHERE role = 'admin'
       ORDER BY joined_at ASC, id ASC
       LIMIT 1`
    )
    .get();
  return row?.id ?? null;
}

const seededMarkets = [
  ["seed_ntr_morning", "ntr-morning", "NTR Morning", "***-**-***", "Betting open now", "Place Bet", "09:00 AM", "10:00 AM", "main"],
  ["seed_sita_morning", "sita-morning", "Sita Morning", "***-**-***", "Betting open now", "Place Bet", "09:40 AM", "10:40 AM", "main"],
  ["seed_karnataka_day", "karnataka-day", "Karnataka Day", "***-**-***", "Betting open now", "Place Bet", "09:55 AM", "10:55 AM", "main"],
  ["seed_star_tara_morning", "star-tara-morning", "Star Tara Morning", "***-**-***", "Betting open now", "Place Bet", "10:05 AM", "11:05 AM", "main"],
  ["seed_milan_morning", "milan-morning", "Milan Morning", "***-**-***", "Betting open now", "Place Bet", "10:10 AM", "11:10 AM", "main"],
  ["seed_maya_bazar", "maya-bazar", "Maya Bazar", "***-**-***", "Betting open now", "Place Bet", "10:15 AM", "11:15 AM", "main"],
  ["seed_andhra_morning", "andhra-morning", "Andhra Morning", "***-**-***", "Betting open now", "Place Bet", "10:35 AM", "11:35 AM", "main"],
  ["seed_sridevi", "sridevi", "Sridevi", "***-**-***", "Betting open now", "Place Bet", "11:25 AM", "12:25 PM", "main"],
  ["seed_mahadevi_morning", "mahadevi-morning", "Mahadevi Morning", "***-**-***", "Betting open now", "Place Bet", "11:40 AM", "12:40 PM", "main"],
  ["seed_time_bazar", "time-bazar", "Time Bazar", "***-**-***", "Betting open now", "Place Bet", "12:45 PM", "01:45 PM", "main"],
  ["seed_madhur_day", "madhur-day", "Madhur Day", "***-**-***", "Betting open now", "Place Bet", "01:20 PM", "02:20 PM", "main"],
  ["seed_sita_day", "sita-day", "Sita Day", "***-**-***", "Betting open now", "Place Bet", "01:40 PM", "02:40 PM", "main"],
  ["seed_star_tara_day", "star-tara-day", "Star Tara Day", "***-**-***", "Betting open now", "Place Bet", "02:15 PM", "03:15 PM", "main"],
  ["seed_ntr_bazar", "ntr-bazar", "NTR Bazar", "***-**-***", "Betting open now", "Place Bet", "02:45 PM", "03:50 PM", "main"],
  ["seed_milan_day", "milan-day", "Milan Day", "***-**-***", "Betting open now", "Place Bet", "02:45 PM", "04:45 PM", "main"],
  ["seed_rajdhani_day", "rajdhani-day", "Rajdhani Day", "***-**-***", "Betting open now", "Place Bet", "03:00 PM", "05:00 PM", "main"],
  ["seed_andhra_day", "andhra-day", "Andhra Day", "***-**-***", "Betting open now", "Place Bet", "03:30 PM", "05:30 PM", "main"],
  ["seed_kalyan", "kalyan", "Kalyan", "***-**-***", "Betting open now", "Place Bet", "04:10 PM", "06:10 PM", "main"],
  ["seed_mahadevi", "mahadevi", "Mahadevi", "***-**-***", "Betting open now", "Place Bet", "04:25 PM", "06:25 PM", "main"],
  ["seed_ntr_day", "ntr-day", "NTR Day", "***-**-***", "Betting open now", "Place Bet", "04:50 PM", "06:50 PM", "main"],
  ["seed_sita_night", "sita-night", "Sita Night", "***-**-***", "Betting open now", "Place Bet", "06:40 PM", "07:40 PM", "main"],
  ["seed_sridevi_night", "sridevi-night", "Sridevi Night", "***-**-***", "Betting open now", "Place Bet", "07:05 PM", "08:05 PM", "main"],
  ["seed_star_tara_night", "star-tara-night", "Star Tara Night", "***-**-***", "Betting open now", "Place Bet", "07:15 PM", "08:15 PM", "main"],
  ["seed_mahadevi_night", "mahadevi-night", "Mahadevi Night", "***-**-***", "Betting open now", "Place Bet", "07:45 PM", "08:45 PM", "main"],
  ["seed_madhur_night", "madhur-night", "Madhur Night", "***-**-***", "Betting open now", "Place Bet", "08:20 PM", "10:20 PM", "main"],
  ["seed_supreme_night", "supreme-night", "Supreme Night", "***-**-***", "Betting open now", "Place Bet", "08:35 PM", "10:35 PM", "main"],
  ["seed_andhra_night", "andhra-night", "Andhra Night", "***-**-***", "Betting open now", "Place Bet", "08:40 PM", "10:40 PM", "main"],
  ["seed_ntr_night", "ntr-night", "NTR Night", "***-**-***", "Betting open now", "Place Bet", "08:50 PM", "10:50 PM", "main"],
  ["seed_milan_night", "milan-night", "Milan Night", "***-**-***", "Betting open now", "Place Bet", "08:50 PM", "10:50 PM", "main"],
  ["seed_kalyan_night", "kalyan-night", "Kalyan Night", "***-**-***", "Betting open now", "Place Bet", "09:25 PM", "11:25 PM", "main"],
  ["seed_rajdhani_night", "rajdhani-night", "Rajdhani Night", "***-**-***", "Betting open now", "Place Bet", "09:30 PM", "11:40 PM", "main"],
  ["seed_main_bazar", "main-bazar", "Main Bazar", "***-**-***", "Betting open now", "Place Bet", "09:45 PM", "11:55 PM", "main"],
  ["seed_mangal_bazar", "mangal-bazar", "Mangal Bazar", "***-**-***", "Betting open now", "Place Bet", "10:05 PM", "11:05 PM", "main"]
];

function nowIso() {
  return new Date().toISOString();
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

const referralLossCommissionRate = Number(process.env.REFERRAL_LOSS_COMMISSION_RATE || "0.2");

function toIso(value) {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value.toISOString() : String(value);
}

function toBool(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function toChartRows(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    return JSON.parse(value);
  }
  return [];
}

function formatChartDayForRows(value) {
  const month = value.toLocaleString("en-US", { month: "short" });
  const day = String(value.getDate()).padStart(2, "0");
  return `${month} ${day}`;
}

function getWeekStartForRows(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value;
}

function getWeekEndForRows(date) {
  const value = getWeekStartForRows(date);
  value.setDate(value.getDate() + 6);
  return value;
}

function getWeekChartLabelForRows(date) {
  const start = getWeekStartForRows(date);
  const end = getWeekEndForRows(date);
  return `${start.getFullYear()} ${formatChartDayForRows(start)} to ${formatChartDayForRows(end)}`;
}

function parseWeekLabelStartDateForRows(label) {
  const value = String(label || "").trim();
  let match = value.match(/^(\d{4})\s+([A-Za-z]{3})\s+(\d{2})\s+to\s+([A-Za-z]{3})\s+(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    const parsed = new Date(`${month} ${day}, ${year} 00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  match = value.match(/^(\d{4})\s+(\d{2})\s+([A-Za-z]{3})\s+to\s+(\d{2})\s+([A-Za-z]{3})$/);
  if (match) {
    const [, year, day, month] = match;
    const parsed = new Date(`${month} ${day}, ${year} 00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function normalizeWeekLabelForRows(label) {
  const parsed = parseWeekLabelStartDateForRows(label);
  return parsed ? getWeekChartLabelForRows(parsed) : String(label || "").trim();
}

function isPlaceholderChartCellForRows(value) {
  const text = String(value || "").trim();
  return !text || text === "**" || text === "***" || text === "--" || text === "---";
}

function sortChartRowsChronologicallyForRows(rows) {
  return [...rows].sort((left, right) => {
    const leftParsed = parseWeekLabelStartDateForRows(left?.[0]);
    const rightParsed = parseWeekLabelStartDateForRows(right?.[0]);
    const leftTime = leftParsed ? leftParsed.getTime() : Number.MAX_SAFE_INTEGER;
    const rightTime = rightParsed ? rightParsed.getTime() : Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });
}

function normalizeChartRowsForStorage(chartType, rows) {
  const size = chartType === "panna" ? 14 : 7;
  const placeholder = chartType === "panna" ? "---" : "--";
  const merged = new Map();

  for (const sourceRow of Array.isArray(rows) ? rows : []) {
    if (!Array.isArray(sourceRow) || sourceRow.length === 0) {
      continue;
    }

    const label = normalizeWeekLabelForRows(sourceRow[0]);
    const base = merged.get(label) ?? [label, ...Array.from({ length: size }, () => placeholder)];
    for (let index = 0; index < size; index += 1) {
      const candidate = String(sourceRow[index + 1] ?? "").trim();
      if (!isPlaceholderChartCellForRows(candidate)) {
        base[index + 1] = candidate;
      }
    }
    merged.set(label, base);
  }

  return sortChartRowsChronologicallyForRows(Array.from(merged.values()));
}

function mapUserRow(row) {
  return row
    ? {
        id: row.id,
        phone: row.phone,
        passwordHash: row.password_hash,
        mpinHash: row.mpin_hash,
        hasMpin: toBool(row.mpin_configured),
        name: row.name,
        joinedAt: toIso(row.joined_at),
        referralCode: row.referral_code,
        role: row.role,
        approvalStatus: row.approval_status ?? "Approved",
        approvedAt: toIso(row.approved_at),
        rejectedAt: toIso(row.rejected_at),
        blockedAt: toIso(row.blocked_at),
        deactivatedAt: toIso(row.deactivated_at),
        statusNote: row.status_note ?? "",
        signupBonusGranted: toBool(row.signup_bonus_granted),
        referredByUserId: row.referred_by_user_id ?? null
      }
    : null;
}

function mapWalletEntryRow(row) {
  return row
    ? {
        id: row.id,
        userId: row.user_id,
        type: row.type,
        status: row.status,
        amount: Number(row.amount),
        beforeBalance: Number(row.before_balance),
        afterBalance: Number(row.after_balance),
        referenceId: row.reference_id ?? "",
        proofUrl: row.proof_url ?? "",
        note: row.note ?? "",
        createdAt: toIso(row.created_at)
      }
    : null;
}

function mapPaymentOrderRow(row) {
  return row
    ? {
        id: row.id,
        userId: row.user_id,
        provider: row.provider,
        amount: Number(row.amount),
        status: row.status,
        reference: row.reference,
        checkoutToken: row.checkout_token ?? null,
        gatewayOrderId: row.gateway_order_id ?? null,
        gatewayPaymentId: row.gateway_payment_id ?? null,
        gatewaySignature: row.gateway_signature ?? null,
        verifiedAt: toIso(row.verified_at),
        redirectUrl: row.redirect_url ?? null,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at)
      }
    : null;
}

function mapChatConversationRow(row) {
  return row
    ? {
        id: row.id,
        userId: row.user_id,
        status: row.status,
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at),
        lastMessageAt: toIso(row.last_message_at),
        resolvedAt: toIso(row.resolved_at)
      }
    : null;
}

function mapChatMessageRow(row) {
  return row
    ? {
        id: row.id,
        conversationId: row.conversation_id,
        senderRole: row.sender_role,
        senderUserId: row.sender_user_id ?? null,
        text: row.text,
        readByUser: toBool(row.read_by_user),
        readByAdmin: toBool(row.read_by_admin),
        createdAt: toIso(row.created_at)
      }
    : null;
}

function mapBidRow(row) {
  return row
    ? {
        id: row.id,
        userId: row.user_id,
        market: row.market,
        boardLabel: row.board_label,
        gameType: row.game_type ?? row.board_label,
        sessionType: row.session_type,
        digit: row.digit,
        points: Number(row.points),
        status: row.status,
        payout: Number(row.payout ?? 0),
        settledAt: toIso(row.settled_at),
        settledResult: row.settled_result ?? null,
        createdAt: toIso(row.created_at)
      }
    : null;
}

function mapBankRow(row) {
  return row
    ? {
        id: row.id,
        accountNumber: row.account_number,
        holderName: row.holder_name,
        ifsc: row.ifsc,
        createdAt: toIso(row.created_at)
      }
    : null;
}

function mapMarketRow(row) {
  return row
    ? {
        id: row.id,
        slug: row.slug,
        name: row.name,
        result: row.result,
        status: row.status,
        action: row.action,
        open: row.open_time,
        close: row.close_time,
        category: row.category
      }
    : null;
}

function parseClockTimeToMinutes(value) {
  if (typeof value !== "string") {
    return Number.MAX_SAFE_INTEGER;
  }

  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  let hours = Number(match[1]) % 12;
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (meridiem === "PM") {
    hours += 12;
  }

  return hours * 60 + minutes;
}

function sortMarketsByOpenTime(markets) {
  return [...markets].sort((left, right) => {
    const openDiff = parseClockTimeToMinutes(left.open) - parseClockTimeToMinutes(right.open);
    if (openDiff !== 0) {
      return openDiff;
    }

    const closeDiff = parseClockTimeToMinutes(left.close) - parseClockTimeToMinutes(right.close);
    if (closeDiff !== 0) {
      return closeDiff;
    }

    return left.name.localeCompare(right.name);
  });
}

function mapNotificationDeviceRow(row) {
  return row
    ? {
        id: row.id,
        userId: row.user_id,
        platform: row.platform,
        token: row.token,
        enabled: toBool(row.enabled),
        createdAt: toIso(row.created_at),
        updatedAt: toIso(row.updated_at)
      }
    : null;
}

function mapAuditLogRow(row) {
  return row
    ? {
        id: row.id,
        actorUserId: row.actor_user_id,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        details: row.details,
        createdAt: toIso(row.created_at)
      }
    : null;
}

function mapAppSettingRow(row) {
  return row
    ? {
        key: row.setting_key,
        value: row.setting_value,
        updatedAt: toIso(row.updated_at)
      }
    : null;
}

function ensureSqliteColumn(db, tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

async function ensurePostgresIndexes(client) {
  for (const [indexName, target] of dbIndexDefinitions) {
    await client.query(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${target}`);
  }
}

function ensureSqliteIndexes(db) {
  for (const [indexName, target] of dbIndexDefinitions) {
    db.exec(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${target}`);
  }
}

function verifyCredential(input, storedHash) {
  if (typeof storedHash !== "string" || !storedHash) {
    return false;
  }

  if (storedHash.startsWith("scrypt$")) {
    const [, salt, expected] = storedHash.split("$");
    if (!salt || !expected) {
      return false;
    }

    const actual = Buffer.from(scryptSync(input, salt, 64).toString("hex"));
    const desired = Buffer.from(expected);
    return actual.length === desired.length && timingSafeEqual(actual, desired);
  }

  const actual = Buffer.from(hashSecret(input));
  const desired = Buffer.from(storedHash);
  return actual.length === desired.length && timingSafeEqual(actual, desired);
}

function hashCredential(input) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(input, salt, 64).toString("hex");
  return `scrypt$${salt}$${digest}`;
}

function isLocalPostgresUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const hostname = (parsed.hostname || "").toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    );
  } catch {
    return false;
  }
}

async function ensurePostgresBootstrap(pool) {
  if (pgBootstrapPromise) {
    return pgBootstrapPromise;
  }

  pgBootstrapPromise = (async () => {
    const client = await pool.connect();
    try {
      const defaultUser = getDefaultSeedAdmin();
      const defaultWalletEntry = getDefaultWalletEntry(defaultUser);
      await client.query("BEGIN");
      const usersTableExists = Boolean((await client.query(`SELECT to_regclass('public.users') AS value`)).rows[0]?.value);
      if (!usersTableExists) {
        await client.query(postgresSchemaSql);
      }
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS status_note TEXT`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mpin_configured BOOLEAN NOT NULL DEFAULT FALSE`);
      await client.query(`ALTER TABLE bids ADD COLUMN IF NOT EXISTS game_type TEXT`);
      await client.query(`ALTER TABLE markets ADD COLUMN IF NOT EXISTS result_locked_at TIMESTAMPTZ`);
      await client.query(`ALTER TABLE markets ADD COLUMN IF NOT EXISTS result_locked_by_user_id TEXT REFERENCES users(id)`);
      await client.query(`ALTER TABLE wallet_entries ADD COLUMN IF NOT EXISTS reference_id TEXT`);
      await client.query(`ALTER TABLE wallet_entries ADD COLUMN IF NOT EXISTS proof_url TEXT`);
      await client.query(`ALTER TABLE wallet_entries ADD COLUMN IF NOT EXISTS note TEXT`);
      await client.query(`ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS checkout_token TEXT`);
      await client.query(`ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS gateway_order_id TEXT`);
      await client.query(`ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT`);
      await client.query(`ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS gateway_signature TEXT`);
      await client.query(`ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS chat_conversations (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          status TEXT NOT NULL DEFAULT 'OPEN',
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          last_message_at TIMESTAMPTZ NOT NULL,
          resolved_at TIMESTAMPTZ
        )
      `);
      await client.query(`ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
          sender_role TEXT NOT NULL,
          sender_user_id TEXT,
          text TEXT NOT NULL,
          read_by_user BOOLEAN NOT NULL DEFAULT FALSE,
          read_by_admin BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS app_settings (
          setting_key TEXT PRIMARY KEY,
          setting_value TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        )
      `);
      await ensurePostgresIndexes(client);

      const userCount = Number((await client.query("SELECT COUNT(*)::int AS count FROM users")).rows[0]?.count ?? 0);
      if (userCount === 0 && defaultUser) {
        await client.query(
          `INSERT INTO users (id, phone, password_hash, mpin_hash, mpin_configured, name, joined_at, referral_code, role, approval_status, approved_at, signup_bonus_granted)
           VALUES ($1, $2, $3, $4, TRUE, $5, $6, $7, $8, $9, $10, TRUE)`,
          [
            defaultUser.id,
            defaultUser.phone,
            defaultUser.passwordHash,
            defaultUser.mpinHash,
            defaultUser.name,
            defaultUser.joinedAt,
            defaultUser.referralCode,
            defaultUser.role,
            defaultUser.approvalStatus,
            defaultUser.joinedAt
          ]
        );
      }

      const walletCount = Number((await client.query("SELECT COUNT(*)::int AS count FROM wallet_entries")).rows[0]?.count ?? 0);
      if (walletCount === 0 && defaultWalletEntry) {
        await client.query(
          `INSERT INTO wallet_entries (id, user_id, type, status, amount, before_balance, after_balance, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            defaultWalletEntry.id,
            defaultWalletEntry.userId,
            defaultWalletEntry.type,
            defaultWalletEntry.status,
            defaultWalletEntry.amount,
            defaultWalletEntry.beforeBalance,
            defaultWalletEntry.afterBalance,
            nowIso()
          ]
        );
      }

      for (const market of seededMarkets) {
        await client.query(
          `INSERT INTO markets (id, slug, name, result, status, action, open_time, close_time, category)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (slug) DO UPDATE SET
             name = EXCLUDED.name,
             result = EXCLUDED.result,
             status = EXCLUDED.status,
             action = EXCLUDED.action,
             open_time = EXCLUDED.open_time,
             close_time = EXCLUDED.close_time,
             category = EXCLUDED.category`,
          market
        );
      }

      const settingsCount = Number((await client.query("SELECT COUNT(*)::int AS count FROM app_settings")).rows[0]?.count ?? 0);
      if (settingsCount === 0) {
        const settings = [
          ["notice_text", "Withdraw approvals aur result updates yahan se control hote hain."],
          ["support_phone", defaultUser?.phone || ""],
          ["support_hours", "10:00 AM - 10:00 PM"],
          ["bonus_enabled", "true"],
          ["bonus_text", "Signup bonus aur promo offers ko dashboard se monitor karo."],
          ["admin_two_factor_enabled", "true"]
        ];
        for (const [key, value] of settings) {
          await client.query(
            `INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES ($1, $2, $3)`,
            [key, value, nowIso()]
          );
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      pgBootstrapPromise = null;
      throw error;
    } finally {
      client.release();
    }
  })();

  return pgBootstrapPromise;
}

function getSqlite() {
  if (sqlite) {
    return sqlite;
  }

  mkdirSync(path.dirname(sqlitePath), { recursive: true });
  sqlite = new DatabaseSync(sqlitePath);
  const defaultUser = getDefaultSeedAdmin();
  const defaultWalletEntry = getDefaultWalletEntry(defaultUser);
  sqlite.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      mpin_hash TEXT NOT NULL,
      mpin_configured INTEGER NOT NULL DEFAULT 0,
      name TEXT NOT NULL,
      joined_at TEXT NOT NULL,
      referral_code TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      approval_status TEXT NOT NULL DEFAULT 'Approved',
      approved_at TEXT,
      rejected_at TEXT,
      blocked_at TEXT,
      deactivated_at TEXT,
      status_note TEXT,
      signup_bonus_granted INTEGER NOT NULL DEFAULT 0,
      referred_by_user_id TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

      CREATE TABLE IF NOT EXISTS wallet_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        amount REAL NOT NULL,
        before_balance REAL NOT NULL,
        after_balance REAL NOT NULL,
        reference_id TEXT,
        proof_url TEXT,
        note TEXT,
        created_at TEXT NOT NULL
      );

    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      market TEXT NOT NULL,
      board_label TEXT NOT NULL,
      game_type TEXT,
      session_type TEXT NOT NULL DEFAULT 'Close',
      digit TEXT NOT NULL,
      points REAL NOT NULL,
      status TEXT NOT NULL,
      payout REAL NOT NULL DEFAULT 0,
      settled_at TEXT,
      settled_result TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bank_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      account_number TEXT NOT NULL,
      holder_name TEXT NOT NULL,
      ifsc TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      token TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      channel TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_message_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      sender_user_id TEXT,
      text TEXT NOT NULL,
      read_by_user INTEGER NOT NULL DEFAULT 0,
      read_by_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      reference TEXT NOT NULL UNIQUE,
      checkout_token TEXT,
      gateway_order_id TEXT,
      gateway_payment_id TEXT,
      gateway_signature TEXT,
      verified_at TEXT,
      redirect_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS markets (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      result TEXT NOT NULL,
      status TEXT NOT NULL,
      action TEXT NOT NULL,
      open_time TEXT NOT NULL,
      close_time TEXT NOT NULL,
      category TEXT NOT NULL,
      result_locked_at TEXT,
      result_locked_by_user_id TEXT
    );

    CREATE TABLE IF NOT EXISTS charts (
      market_slug TEXT NOT NULL,
      chart_type TEXT NOT NULL,
      rows_json TEXT NOT NULL,
      PRIMARY KEY (market_slug, chart_type)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  ensureSqliteColumn(sqlite, "users", "approved_at", "TEXT");
  ensureSqliteColumn(sqlite, "users", "rejected_at", "TEXT");
  ensureSqliteColumn(sqlite, "users", "blocked_at", "TEXT");
  ensureSqliteColumn(sqlite, "users", "deactivated_at", "TEXT");
  ensureSqliteColumn(sqlite, "users", "status_note", "TEXT");
  ensureSqliteColumn(sqlite, "users", "mpin_configured", "INTEGER NOT NULL DEFAULT 0");
  ensureSqliteColumn(sqlite, "users", "signup_bonus_granted", "INTEGER NOT NULL DEFAULT 0");
  ensureSqliteColumn(sqlite, "users", "referred_by_user_id", "TEXT");
  ensureSqliteColumn(sqlite, "bids", "game_type", "TEXT");
  ensureSqliteColumn(sqlite, "markets", "result_locked_at", "TEXT");
  ensureSqliteColumn(sqlite, "markets", "result_locked_by_user_id", "TEXT");
  ensureSqliteColumn(sqlite, "wallet_entries", "reference_id", "TEXT");
  ensureSqliteColumn(sqlite, "wallet_entries", "proof_url", "TEXT");
  ensureSqliteColumn(sqlite, "wallet_entries", "note", "TEXT");
  ensureSqliteColumn(sqlite, "payment_orders", "checkout_token", "TEXT");
  ensureSqliteColumn(sqlite, "payment_orders", "gateway_order_id", "TEXT");
  ensureSqliteColumn(sqlite, "payment_orders", "gateway_payment_id", "TEXT");
  ensureSqliteColumn(sqlite, "payment_orders", "gateway_signature", "TEXT");
  ensureSqliteColumn(sqlite, "payment_orders", "verified_at", "TEXT");
  ensureSqliteColumn(sqlite, "chat_conversations", "resolved_at", "TEXT");
  ensureSqliteIndexes(sqlite);

  const userCount = Number(sqlite.prepare("SELECT COUNT(*) AS count FROM users").get().count || 0);
  if (userCount === 0 && defaultUser) {
    sqlite.prepare(`
      INSERT INTO users (id, phone, password_hash, mpin_hash, name, joined_at, referral_code, role, approval_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      defaultUser.id,
      defaultUser.phone,
      defaultUser.passwordHash,
      defaultUser.mpinHash,
      defaultUser.name,
      defaultUser.joinedAt,
      defaultUser.referralCode,
      defaultUser.role,
      defaultUser.approvalStatus
    );
    sqlite.prepare(`UPDATE users SET approved_at = ?, signup_bonus_granted = 1, mpin_configured = 1 WHERE id = ?`).run(defaultUser.joinedAt, defaultUser.id);
  }

  const walletCount = Number(sqlite.prepare("SELECT COUNT(*) AS count FROM wallet_entries").get().count || 0);
  if (walletCount === 0 && defaultWalletEntry) {
    sqlite.prepare(`
      INSERT INTO wallet_entries (id, user_id, type, status, amount, before_balance, after_balance, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(defaultWalletEntry.id, defaultWalletEntry.userId, defaultWalletEntry.type, defaultWalletEntry.status, defaultWalletEntry.amount, defaultWalletEntry.beforeBalance, defaultWalletEntry.afterBalance, nowIso());
  }

  const marketCount = Number(sqlite.prepare("SELECT COUNT(*) AS count FROM markets").get().count || 0);
  if (marketCount === 0) {
    const insert = sqlite.prepare(`
      INSERT INTO markets (id, slug, name, result, status, action, open_time, close_time, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run("market_1", "mangal-bazar", "Mangal Bazar", "***-**-***", "Betting is running for close", "Place Bet", "10:05 PM", "11:05 PM", "games");
    insert.run("market_2", "bharat-starline", "Bharat Starline", "580", "Live bidding open now", "Play Now", "10:00 AM", "09:00 PM", "starline");
  }

  const chartCount = Number(sqlite.prepare("SELECT COUNT(*) AS count FROM charts").get().count || 0);
  if (chartCount === 0) {
    const sampleRows = JSON.stringify([
      ["05-Feb", "470", "237", "450"],
      ["12-Feb", "368", "125", "359"]
    ]);
    sqlite.prepare("INSERT INTO charts (market_slug, chart_type, rows_json) VALUES (?, ?, ?)").run("mangal-bazar", "jodi", sampleRows);
    sqlite.prepare("INSERT INTO charts (market_slug, chart_type, rows_json) VALUES (?, ?, ?)").run("mangal-bazar", "panna", sampleRows);
  }

  const settingsCount = Number(sqlite.prepare("SELECT COUNT(*) AS count FROM app_settings").get().count || 0);
  if (settingsCount === 0) {
    const insertSetting = sqlite.prepare(`INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)`);
    const createdAt = nowIso();
    insertSetting.run("notice_text", "Withdraw approvals aur result updates yahan se control hote hain.", createdAt);
    insertSetting.run("support_phone", defaultUser?.phone || "", createdAt);
    insertSetting.run("support_hours", "10:00 AM - 10:00 PM", createdAt);
    insertSetting.run("bonus_enabled", "true", createdAt);
    insertSetting.run("bonus_text", "Signup bonus aur promo offers ko dashboard se monitor karo.", createdAt);
    insertSetting.run("admin_two_factor_enabled", "true", createdAt);
  }

  return sqlite;
}

function getPgPool() {
  if (!isStandalonePostgresEnabled()) {
    return null;
  }

  if (!pgPool) {
    const normalizedUrl = new URL(standaloneConfig.databaseUrl);
    normalizedUrl.searchParams.delete("sslmode");
    pgPool = new Pool({
      connectionString: normalizedUrl.toString(),
      ssl: isLocalPostgresUrl(standaloneConfig.databaseUrl) ? false : { rejectUnauthorized: false }
    });
  }

  void ensurePostgresBootstrap(pgPool);
  return pgPool;
}

async function getReadyPgPool() {
  const pool = getPgPool();
  await ensurePostgresBootstrap(pool);
  return pool;
}

export async function findUserByPhone(phone) {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT id, phone, password_hash, mpin_hash, mpin_configured, name, role, referral_code, joined_at, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id
       FROM users
       WHERE phone = $1
       LIMIT 1`,
      [phone]
    );
    return mapUserRow(result.rows[0]);
  }

  const row = getSqlite()
    .prepare(
      `SELECT id, phone, password_hash, mpin_hash, mpin_configured, name, role, referral_code, joined_at, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id
       FROM users
       WHERE phone = ?
       LIMIT 1`
    )
    .get(phone);
  return mapUserRow(row);
}

export async function createSession(userId) {
  const rawToken = randomBytes(24).toString("hex");
  const tokenHash = hashSecret(rawToken);
  const createdAt = nowIso();

  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
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
  } else {
    const sqlite = getSqlite();
    sqlite.exec("BEGIN");
    try {
      sqlite.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
      sqlite
        .prepare(`INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?, ?, ?)`)
        .run(tokenHash, userId, createdAt);
      sqlite.exec("COMMIT");
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
  }

  return { rawToken, tokenHash, createdAt };
}

export async function revokeSession(token) {
  if (!token) {
    return;
  }

  const tokenHash = hashSecret(token);
  if (isStandalonePostgresEnabled()) {
      const pool = await getReadyPgPool();
    await pool.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
    return;
  }

  getSqlite().prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

export async function requireUserByToken(token) {
  if (!token) {
    return null;
  }

  const tokenHash = hashSecret(token);
  const minCreatedAt = new Date(Date.now() - sessionTtlMs).toISOString();

  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT u.id, u.phone, u.password_hash, u.mpin_hash, u.mpin_configured, u.name, u.role, u.referral_code, u.joined_at, u.approval_status, u.approved_at, u.rejected_at, u.blocked_at, u.deactivated_at, u.status_note, u.signup_bonus_granted, u.referred_by_user_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.created_at >= $2
       LIMIT 1`,
      [tokenHash, minCreatedAt]
    );
    const user = mapUserRow(result.rows[0]);
    return isUserAccountActive(user) ? user : null;
  }

  const row = getSqlite()
    .prepare(
      `SELECT u.id, u.phone, u.password_hash, u.mpin_hash, u.mpin_configured, u.name, u.role, u.referral_code, u.joined_at, u.approval_status, u.approved_at, u.rejected_at, u.blocked_at, u.deactivated_at, u.status_note, u.signup_bonus_granted, u.referred_by_user_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.created_at >= ?
       LIMIT 1`
    )
    .get(tokenHash, minCreatedAt);
  const user = mapUserRow(row);
  return isUserAccountActive(user) ? user : null;
}

export async function getUserBalance(userId) {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT after_balance
       FROM wallet_entries
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );
    return Number(result.rows[0]?.after_balance ?? 0);
  }

  const row = getSqlite()
    .prepare(
      `SELECT after_balance
       FROM wallet_entries
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(userId);
  return Number(row?.after_balance ?? 0);
}

export async function updateUserPassword(userId, passwordHash) {
  if (isStandalonePostgresEnabled()) {
      const pool = await getReadyPgPool();
    await pool.query("UPDATE users SET password_hash = $2 WHERE id = $1", [userId, passwordHash]);
    return;
  }

  getSqlite().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId);
}

export async function updateUserMpin(userId, mpinHash) {
  if (isStandalonePostgresEnabled()) {
      const pool = await getReadyPgPool();
    await pool.query("UPDATE users SET mpin_hash = $2, mpin_configured = TRUE WHERE id = $1", [userId, mpinHash]);
    return;
  }

  getSqlite().prepare("UPDATE users SET mpin_hash = ?, mpin_configured = 1 WHERE id = ?").run(mpinHash, userId);
}

export async function updateUserProfile(userId, updates) {
  const nextName = typeof updates.name === "string" ? updates.name.trim() : "";
  const nextPhone = typeof updates.phone === "string" ? updates.phone.trim() : "";

  if (isStandalonePostgresEnabled()) {
      const pool = await getReadyPgPool();
    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE(NULLIF($2, ''), name),
           phone = COALESCE(NULLIF($3, ''), phone)
       WHERE id = $1
       RETURNING id, phone, password_hash, mpin_hash, mpin_configured, name, role, referral_code, joined_at, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id`,
      [userId, nextName, nextPhone]
    );
    return mapUserRow(result.rows[0]);
  }

  const db = getSqlite();
  db.prepare(
    `UPDATE users
     SET name = COALESCE(NULLIF(?, ''), name),
         phone = COALESCE(NULLIF(?, ''), phone)
     WHERE id = ?`
  ).run(nextName, nextPhone, userId);

  const row = db
    .prepare(
      `SELECT id, phone, password_hash, mpin_hash, mpin_configured, name, role, referral_code, joined_at, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id
       FROM users
       WHERE id = ?
       LIMIT 1`
    )
    .get(userId);
  return mapUserRow(row);
}

export async function createUserAccount({ phone, passwordHash, referenceCode, firstName, lastName }) {
  const existing = await findUserByPhone(phone);
  if (existing) {
    return { user: null, error: "Phone number already registered" };
  }

  const normalizedReferenceCode = String(referenceCode ?? "").trim();
  const referrer = normalizedReferenceCode ? await findUserByReferralCode(normalizedReferenceCode) : null;
  if (normalizedReferenceCode && !referrer) {
    return { user: null, error: "Invalid reference code" };
  }

  const userId = `user_${Date.now()}`;
  const joinedAt = nowIso();
  const referralCode = String(Math.floor(100000 + Math.random() * 900000));
  const normalizedFirstName = String(firstName ?? "").trim();
  const normalizedLastName = String(lastName ?? "").trim();
  const name = `${normalizedFirstName} ${normalizedLastName}`.trim();

  if (isStandalonePostgresEnabled()) {
      const pool = await getReadyPgPool();
    await pool.query(
      `INSERT INTO users (id, phone, password_hash, mpin_hash, mpin_configured, name, joined_at, referral_code, role, approval_status, approved_at, signup_bonus_granted, referred_by_user_id)
       VALUES ($1, $2, $3, $4, FALSE, $5, $6, $7, 'user', 'Approved', $6, FALSE, $8)`,
      [userId, phone, passwordHash, hashSecret("1234"), name, joinedAt, referralCode, referrer?.id ?? null]
    );
  } else {
    getSqlite()
      .prepare(
        `INSERT INTO users (id, phone, password_hash, mpin_hash, mpin_configured, name, joined_at, referral_code, role, approval_status, approved_at, signup_bonus_granted, referred_by_user_id)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, 'user', 'Approved', ?, 0, ?)`
      )
      .run(userId, phone, passwordHash, hashSecret("1234"), name, joinedAt, referralCode, joinedAt, referrer?.id ?? null);
  }

  return {
    user: {
      id: userId,
      phone,
      name,
      role: "user",
      referralCode,
      joinedAt,
      approvalStatus: "Approved",
      hasMpin: false,
      approvedAt: joinedAt,
      rejectedAt: null,
      signupBonusGranted: false,
      referredByUserId: referrer?.id ?? null
    },
    error: null
  };
}

async function findUserByReferralCode(referenceCode) {
  if (isStandalonePostgresEnabled()) {
      const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT id, phone, password_hash, mpin_hash, mpin_configured, name, role, referral_code, joined_at, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id
       FROM users
       WHERE referral_code = $1
       LIMIT 1`,
      [referenceCode]
    );
    return mapUserRow(result.rows[0]);
  }

  return mapUserRow(
    getSqlite()
      .prepare(
        `SELECT id, phone, password_hash, mpin_hash, mpin_configured, name, role, referral_code, joined_at, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id
         FROM users
         WHERE referral_code = ?
         LIMIT 1`
      )
      .get(referenceCode)
  );
}

export async function findUserById(userId) {
  if (isStandalonePostgresEnabled()) {
      const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT id, phone, password_hash, mpin_hash, mpin_configured, name, joined_at, referral_code, role, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );
    return mapUserRow(result.rows[0]);
  }

  return mapUserRow(
    getSqlite()
      .prepare(
        `SELECT id, phone, password_hash, mpin_hash, mpin_configured, name, joined_at, referral_code, role, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id
         FROM users
         WHERE id = ?
         LIMIT 1`
      )
      .get(userId)
  );
}

export async function getUsersList() {
  if (isStandalonePostgresEnabled()) {
      const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT id, phone, password_hash, mpin_hash, name, joined_at, referral_code, role, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id
       FROM users
       ORDER BY joined_at DESC, id DESC`
    );
    return result.rows.map((row) => mapUserRow(row));
  }

  return getSqlite()
    .prepare(
      `SELECT id, phone, password_hash, mpin_hash, name, joined_at, referral_code, role, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id
       FROM users
       ORDER BY joined_at DESC, id DESC`
    )
    .all()
    .map((row) => mapUserRow(row));
}

export async function getUserAdminSummaries() {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(`
      SELECT
        u.id,
        u.phone,
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
        COALESCE(balance.after_balance, 0) AS wallet_balance,
        COALESCE(session_stats.login_count, 0) AS login_count,
        COALESCE(bid_stats.bid_count, 0) AS bid_count,
        COALESCE(bid_stats.total_bet_amount, 0) AS total_bet_amount,
        COALESCE(payout_stats.total_payout_amount, 0) AS total_payout_amount,
        CASE
          WHEN session_stats.last_session_at IS NULL AND bid_stats.last_bid_at IS NULL AND wallet_stats.last_wallet_at IS NULL THEN NULL
          ELSE GREATEST(
            COALESCE(session_stats.last_session_at, '-infinity'::timestamptz),
            COALESCE(bid_stats.last_bid_at, '-infinity'::timestamptz),
            COALESCE(wallet_stats.last_wallet_at, '-infinity'::timestamptz)
          )
        END AS last_activity
      FROM users u
      LEFT JOIN LATERAL (
        SELECT after_balance
        FROM wallet_entries
        WHERE user_id = u.id
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      ) balance ON TRUE
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int AS login_count, MAX(created_at) AS last_session_at
        FROM sessions
        GROUP BY user_id
      ) session_stats ON session_stats.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*)::int AS bid_count, COALESCE(SUM(points), 0) AS total_bet_amount, MAX(created_at) AS last_bid_at
        FROM bids
        GROUP BY user_id
      ) bid_stats ON bid_stats.user_id = u.id
      LEFT JOIN (
        SELECT user_id, MAX(created_at) AS last_wallet_at
        FROM wallet_entries
        GROUP BY user_id
      ) wallet_stats ON wallet_stats.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COALESCE(SUM(amount), 0) AS total_payout_amount
        FROM wallet_entries
        WHERE type = 'BID_WIN' AND status = ANY(ARRAY['SUCCESS', 'BACKOFFICE'])
        GROUP BY user_id
      ) payout_stats ON payout_stats.user_id = u.id
      WHERE u.role = 'user'
      ORDER BY u.joined_at DESC, u.id DESC
    `);

    return result.rows.map((row) => ({
      id: row.id,
      phone: row.phone,
      name: row.name,
      role: row.role,
      referralCode: row.referral_code,
      joinedAt: toIso(row.joined_at),
      approvalStatus: row.approval_status ?? "Approved",
      approvedAt: toIso(row.approved_at),
      rejectedAt: toIso(row.rejected_at),
      blockedAt: toIso(row.blocked_at),
      deactivatedAt: toIso(row.deactivated_at),
      statusNote: row.status_note ?? "",
      signupBonusGranted: toBool(row.signup_bonus_granted),
      referredByUserId: row.referred_by_user_id ?? null,
      walletBalance: Number(row.wallet_balance ?? 0),
      loginCount: Number(row.login_count ?? 0),
      bidCount: Number(row.bid_count ?? 0),
      totalBetAmount: Number(row.total_bet_amount ?? 0),
      totalPayoutAmount: Number(row.total_payout_amount ?? 0),
      lastActivity: toIso(row.last_activity)
    }));
  }

  return getSqlite()
    .prepare(
      `SELECT
         u.id,
         u.phone,
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
           SELECT after_balance
           FROM wallet_entries we
           WHERE we.user_id = u.id
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         ), 0) AS wallet_balance,
         (
           SELECT COUNT(*)
           FROM sessions s
           WHERE s.user_id = u.id
         ) AS login_count,
         (
           SELECT COUNT(*)
           FROM bids b
           WHERE b.user_id = u.id
         ) AS bid_count,
         COALESCE((
           SELECT SUM(b.points)
           FROM bids b
           WHERE b.user_id = u.id
         ), 0) AS total_bet_amount,
         COALESCE((
           SELECT SUM(we.amount)
           FROM wallet_entries we
           WHERE we.user_id = u.id
             AND we.type = 'BID_WIN'
             AND we.status IN ('SUCCESS', 'BACKOFFICE')
         ), 0) AS total_payout_amount,
         MAX(
           COALESCE((SELECT MAX(s.created_at) FROM sessions s WHERE s.user_id = u.id), ''),
           COALESCE((SELECT MAX(b.created_at) FROM bids b WHERE b.user_id = u.id), ''),
           COALESCE((SELECT MAX(we.created_at) FROM wallet_entries we WHERE we.user_id = u.id), '')
         ) AS last_activity
       FROM users u
       WHERE u.role = 'user'
       ORDER BY u.joined_at DESC, u.id DESC`
    )
    .all()
    .map((row) => ({
      id: row.id,
      phone: row.phone,
      name: row.name,
      role: row.role,
      referralCode: row.referral_code,
      joinedAt: toIso(row.joined_at),
      approvalStatus: row.approval_status ?? "Approved",
      approvedAt: toIso(row.approved_at),
      rejectedAt: toIso(row.rejected_at),
      blockedAt: toIso(row.blocked_at),
      deactivatedAt: toIso(row.deactivated_at),
      statusNote: row.status_note ?? "",
      signupBonusGranted: toBool(row.signup_bonus_granted),
      referredByUserId: row.referred_by_user_id ?? null,
      walletBalance: Number(row.wallet_balance ?? 0),
      loginCount: Number(row.login_count ?? 0),
      bidCount: Number(row.bid_count ?? 0),
      totalBetAmount: Number(row.total_bet_amount ?? 0),
      totalPayoutAmount: Number(row.total_payout_amount ?? 0),
      lastActivity: row.last_activity ? toIso(row.last_activity) : null
    }));
}

export async function getReportsSummaryData(from, to) {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
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
           COALESCE(SUM(CASE WHEN type = 'WITHDRAW' AND status = ANY(ARRAY['SUCCESS', 'BACKOFFICE']) THEN amount ELSE 0 END), 0) AS withdraws_success,
           COALESCE(SUM(CASE WHEN type = 'WITHDRAW' AND status = 'INITIATED' THEN amount ELSE 0 END), 0) AS withdraws_pending,
           COALESCE(SUM(CASE WHEN type = 'WITHDRAW' AND status = 'REJECTED' THEN amount ELSE 0 END), 0) AS withdraws_rejected
         FROM wallet_entries
         WHERE created_at >= $1 AND created_at <= $2`,
        [from, to]
      ),
      pool.query(
        `SELECT
           COUNT(*)::int AS bets_count,
           COALESCE(SUM(points), 0) AS bets_amount
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
      pool.query(
        `SELECT COUNT(*)::int AS login_count
         FROM sessions
         WHERE created_at >= $1 AND created_at <= $2`,
        [from, to]
      ),
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
        `SELECT
           market,
           COUNT(*)::int AS bets_count,
           COALESCE(SUM(points), 0) AS bets_amount,
           COALESCE(SUM(payout), 0) AS payout_amount
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

    const walletTotals = walletTotalsResult.rows[0] ?? {};
    const bidTotals = bidTotalsResult.rows[0] ?? {};
    const payoutTotals = payoutTotalsResult.rows[0] ?? {};
    const loginTotals = loginTotalsResult.rows[0] ?? {};
    const activeUsers = activeUsersResult.rows[0] ?? {};
    const dailySeriesMap = new Map();

    for (const row of collectionSeriesResult.rows) {
      dailySeriesMap.set(row.date, {
        date: row.date,
        collection: Number(row.collection ?? 0),
        payout: 0
      });
    }
    for (const row of payoutSeriesResult.rows) {
      const existing = dailySeriesMap.get(row.date) ?? { date: row.date, collection: 0, payout: 0 };
      existing.payout = Number(row.payout ?? 0);
      dailySeriesMap.set(row.date, existing);
    }

    const betsAmount = Number(bidTotals.bets_amount ?? 0);
    const payoutAmount = Number(payoutTotals.payout_amount ?? 0);

    return {
      totals: {
        depositsSuccess: Number(walletTotals.deposits_success ?? 0),
        depositsPending: Number(walletTotals.deposits_pending ?? 0),
        withdrawsSuccess: Number(walletTotals.withdraws_success ?? 0),
        withdrawsPending: Number(walletTotals.withdraws_pending ?? 0),
        withdrawsRejected: Number(walletTotals.withdraws_rejected ?? 0),
        betsCount: Number(bidTotals.bets_count ?? 0),
        betsAmount,
        payoutAmount,
        loginCount: Number(loginTotals.login_count ?? 0),
        activeUsers: Number(activeUsers.active_users ?? 0),
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
  }

  const sqlite = getSqlite();
  const walletTotals = sqlite.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'DEPOSIT' AND status IN ('SUCCESS', 'BACKOFFICE') THEN amount ELSE 0 END), 0) AS deposits_success,
       COALESCE(SUM(CASE WHEN type = 'DEPOSIT' AND status = 'INITIATED' THEN amount ELSE 0 END), 0) AS deposits_pending,
       COALESCE(SUM(CASE WHEN type = 'WITHDRAW' AND status IN ('SUCCESS', 'BACKOFFICE') THEN amount ELSE 0 END), 0) AS withdraws_success,
       COALESCE(SUM(CASE WHEN type = 'WITHDRAW' AND status = 'INITIATED' THEN amount ELSE 0 END), 0) AS withdraws_pending,
       COALESCE(SUM(CASE WHEN type = 'WITHDRAW' AND status = 'REJECTED' THEN amount ELSE 0 END), 0) AS withdraws_rejected
     FROM wallet_entries
     WHERE created_at >= ? AND created_at <= ?`
  ).get(from, to);
  const bidTotals = sqlite.prepare(
    `SELECT
       COUNT(*) AS bets_count,
       COALESCE(SUM(points), 0) AS bets_amount
     FROM bids
     WHERE created_at >= ? AND created_at <= ?`
  ).get(from, to);
  const payoutTotals = sqlite.prepare(
    `SELECT COALESCE(SUM(amount), 0) AS payout_amount
     FROM wallet_entries
     WHERE type = 'BID_WIN'
       AND created_at >= ?
       AND created_at <= ?`
  ).get(from, to);
  const loginTotals = sqlite.prepare(
    `SELECT COUNT(*) AS login_count
     FROM sessions
     WHERE created_at >= ? AND created_at <= ?`
  ).get(from, to);
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
    `SELECT
       b.user_id,
       u.name AS user_name,
       u.phone AS user_phone,
       COUNT(*) AS bids_count,
       COALESCE(SUM(b.points), 0) AS bet_amount,
       COALESCE(SUM(b.payout), 0) AS payout_amount
     FROM bids b
     LEFT JOIN users u ON u.id = b.user_id
     WHERE b.created_at >= ? AND b.created_at <= ?
     GROUP BY b.user_id, u.name, u.phone
     ORDER BY bet_amount DESC`
  ).all(from, to);
  const marketReports = sqlite.prepare(
    `SELECT
       market,
       COUNT(*) AS bets_count,
       COALESCE(SUM(points), 0) AS bets_amount,
       COALESCE(SUM(payout), 0) AS payout_amount
     FROM bids
     WHERE created_at >= ? AND created_at <= ?
     GROUP BY market
     ORDER BY bets_amount DESC`
  ).all(from, to);
  const collectionSeries = sqlite.prepare(
    `SELECT substr(created_at, 1, 10) AS date, COALESCE(SUM(points), 0) AS collection
     FROM bids
     WHERE created_at >= ? AND created_at <= ?
     GROUP BY substr(created_at, 1, 10)`
  ).all(from, to);
  const payoutSeries = sqlite.prepare(
    `SELECT substr(created_at, 1, 10) AS date, COALESCE(SUM(amount), 0) AS payout
     FROM wallet_entries
     WHERE type = 'BID_WIN'
       AND created_at >= ?
       AND created_at <= ?
     GROUP BY substr(created_at, 1, 10)`
  ).all(from, to);

  const dailySeriesMap = new Map();
  for (const row of collectionSeries) {
    dailySeriesMap.set(row.date, { date: row.date, collection: Number(row.collection ?? 0), payout: 0 });
  }
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

export async function getWalletEntriesForUser(userId, limit = 50) {
  const normalizedLimit = Math.max(1, Math.min(500, Number(limit) || 50));
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT id, user_id, type, status, amount, before_balance, after_balance, reference_id, proof_url, note, created_at
         FROM wallet_entries
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
      [userId, normalizedLimit]
    );
    return result.rows.map((row) => mapWalletEntryRow(row));
  }

  const rows = getSqlite()
    .prepare(
      `SELECT id, user_id, type, status, amount, before_balance, after_balance, reference_id, proof_url, note, created_at
       FROM wallet_entries
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(userId, normalizedLimit);

  return rows.map((row) => mapWalletEntryRow(row));
}

function getWalletEntryBalanceDelta(entry) {
  if (String(entry.status || "") !== "SUCCESS") {
    return 0;
  }

  const amount = Number(entry.amount ?? 0);
  const type = String(entry.type || "").toUpperCase();
  const creditTypes = new Set(["DEPOSIT", "REFERRAL_COMMISSION", "BID_WIN", "SIGNUP_BONUS", "ADMIN_CREDIT"]);
  const debitTypes = new Set(["WITHDRAW", "BID_PLACED", "BID_WIN_REVERSAL", "ADMIN_DEBIT"]);

  if (creditTypes.has(type)) return amount;
  if (debitTypes.has(type)) return -amount;
  return 0;
}

export async function rebalanceWalletEntriesForUser(userId) {
  const entries = await getWalletEntriesForUser(userId);
  const orderedEntries = [...entries].sort((left, right) => {
    const timeDiff = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return String(left.id).localeCompare(String(right.id));
  });

  let runningBalance = 0;

  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    for (const entry of orderedEntries) {
      const beforeBalance = runningBalance;
      const afterBalance = beforeBalance + getWalletEntryBalanceDelta(entry);
      await pool.query(
        `UPDATE wallet_entries
         SET before_balance = $2, after_balance = $3
         WHERE id = $1`,
        [entry.id, beforeBalance, afterBalance]
      );
      runningBalance = afterBalance;
    }
    return runningBalance;
  }

  const db = getSqlite();
  const update = db.prepare(
    `UPDATE wallet_entries
     SET before_balance = ?, after_balance = ?
     WHERE id = ?`
  );
  for (const entry of orderedEntries) {
    const beforeBalance = runningBalance;
    const afterBalance = beforeBalance + getWalletEntryBalanceDelta(entry);
    update.run(beforeBalance, afterBalance, entry.id);
    runningBalance = afterBalance;
  }
  return runningBalance;
}

export async function clearWalletEntriesForUser(userId, types = []) {
  const normalizedTypes = Array.from(
    new Set((Array.isArray(types) ? types : []).map((item) => String(item || "").trim().toUpperCase()).filter(Boolean))
  );

  if (!normalizedTypes.length) {
    return { deletedCount: 0, balance: await getUserBalance(userId) };
  }

  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `DELETE FROM wallet_entries
       WHERE user_id = $1 AND type = ANY($2::text[])`,
      [userId, normalizedTypes]
    );
    const balance = await rebalanceWalletEntriesForUser(userId);
    return { deletedCount: Number(result.rowCount || 0), balance };
  }

  const db = getSqlite();
  const placeholders = normalizedTypes.map(() => "?").join(", ");
  const result = db
    .prepare(`DELETE FROM wallet_entries WHERE user_id = ? AND type IN (${placeholders})`)
    .run(userId, ...normalizedTypes);
  const balance = await rebalanceWalletEntriesForUser(userId);
  return { deletedCount: Number(result.changes || 0), balance };
}

export async function getReferralOverview(userId) {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const [referredUsersResult, referralIncomeResult] = await Promise.all([
      pool.query(
        `SELECT id, name, phone, joined_at
         FROM users
         WHERE referred_by_user_id = $1
         ORDER BY joined_at DESC, id DESC`,
        [userId]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM wallet_entries
         WHERE user_id = $1
           AND type = 'REFERRAL_COMMISSION'
           AND status = 'SUCCESS'`,
        [userId]
      )
    ]);

    return {
      referredCount: referredUsersResult.rows.length,
      referralIncomeTotal: roundMoney(referralIncomeResult.rows[0]?.total ?? 0),
      referredUsers: referredUsersResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        joinedAt: toIso(row.joined_at)
      }))
    };
  }

  const db = getSqlite();
  const referredUsers = db
    .prepare(
      `SELECT id, name, phone, joined_at
       FROM users
       WHERE referred_by_user_id = ?
       ORDER BY joined_at DESC, id DESC`
    )
    .all(userId)
    .map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      joinedAt: toIso(row.joined_at)
    }));

  const referralIncomeRow = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM wallet_entries
       WHERE user_id = ?
         AND type = 'REFERRAL_COMMISSION'
         AND status = 'SUCCESS'`
    )
    .get(userId);

  return {
    referredCount: referredUsers.length,
    referralIncomeTotal: roundMoney(referralIncomeRow?.total ?? 0),
    referredUsers
  };
}

export async function getBidsForUser(userId, limit = 50) {
  const normalizedLimit = Math.max(1, Math.min(500, Number(limit) || 50));
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT id, market, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at
       FROM bids
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2`,
      [userId, normalizedLimit]
    );
    return result.rows.map((row) => ({
      id: row.id,
      market: row.market,
      boardLabel: row.board_label,
      gameType: row.game_type ?? row.board_label,
      sessionType: row.session_type,
      digit: row.digit,
      points: Number(row.points),
      status: row.status,
      payout: Number(row.payout ?? 0),
      settledAt: row.settled_at ? (row.settled_at instanceof Date ? row.settled_at.toISOString() : String(row.settled_at)) : null,
      settledResult: row.settled_result ?? null,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
    }));
  }

  const rows = getSqlite()
    .prepare(
      `SELECT id, market, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at
       FROM bids
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT ?`
    )
    .all(userId, normalizedLimit);

  return rows.map((row) => ({
    id: row.id,
    market: row.market,
    boardLabel: row.board_label,
    gameType: row.game_type ?? row.board_label,
    sessionType: row.session_type,
    digit: row.digit,
    points: Number(row.points),
    status: row.status,
    payout: Number(row.payout ?? 0),
    settledAt: row.settled_at ?? null,
    settledResult: row.settled_result ?? null,
    createdAt: row.created_at
  }));
}

export async function getBankAccountsForUser(userId) {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT id, account_number, holder_name, ifsc, created_at
       FROM bank_accounts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      accountNumber: row.account_number,
      holderName: row.holder_name,
      ifsc: row.ifsc,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
    }));
  }

  const rows = getSqlite()
    .prepare(
      `SELECT id, account_number, holder_name, ifsc, created_at
       FROM bank_accounts
       WHERE user_id = ?
       ORDER BY created_at DESC`
    )
    .all(userId);

  return rows.map((row) => ({
    id: row.id,
    accountNumber: row.account_number,
    holderName: row.holder_name,
    ifsc: row.ifsc,
    createdAt: row.created_at
  }));
}

export async function addBankAccount({ userId, accountNumber, holderName, ifsc }) {
  const id = `bank_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = nowIso();

  if (isStandalonePostgresEnabled()) {
      const pool = await getReadyPgPool();
    await pool.query(
      `INSERT INTO bank_accounts (id, user_id, account_number, holder_name, ifsc, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, userId, accountNumber, holderName, ifsc, createdAt]
    );
  } else {
    getSqlite()
      .prepare(
        `INSERT INTO bank_accounts (id, user_id, account_number, holder_name, ifsc, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, userId, accountNumber, holderName, ifsc, createdAt);
  }

  return { id, accountNumber, holderName, ifsc, createdAt };
}

export async function addWalletEntry({ userId, type, status, amount, beforeBalance, afterBalance, referenceId = "", proofUrl = "", note = "" }) {
  const id = `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = nowIso();

  if (isStandalonePostgresEnabled()) {
    const pool = getPgPool();
    await pool.query(
      `INSERT INTO wallet_entries (id, user_id, type, status, amount, before_balance, after_balance, reference_id, proof_url, note, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, userId, type, status, amount, beforeBalance, afterBalance, referenceId || null, proofUrl || null, note || null, createdAt]
    );
  } else {
    getSqlite()
      .prepare(
        `INSERT INTO wallet_entries (id, user_id, type, status, amount, before_balance, after_balance, reference_id, proof_url, note, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, userId, type, status, amount, beforeBalance, afterBalance, referenceId || null, proofUrl || null, note || null, createdAt);
  }

  return { id, userId, type, status, amount, beforeBalance, afterBalance, referenceId, proofUrl, note, createdAt };
}

export async function applyReferralLossCommission({ userId, lostAmount, bidId, market = "", boardLabel = "" }) {
  const player = await findUserById(userId);
  if (!player?.referredByUserId) {
    return null;
  }

  const referrer = await findUserById(player.referredByUserId);
  if (!referrer) {
    return null;
  }

  const commissionAmount = roundMoney(Number(lostAmount || 0) * (referralLossCommissionRate / 100));
  if (commissionAmount <= 0) {
    return null;
  }

  const referralReferenceId = `referral-loss:${bidId}`;

  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const existingResult = await pool.query(
      `SELECT id
       FROM wallet_entries
       WHERE user_id = $1
         AND type = 'REFERRAL_COMMISSION'
         AND reference_id = $2
       LIMIT 1`,
      [referrer.id, referralReferenceId]
    );

    if (existingResult.rows[0]) {
      return null;
    }
  } else {
    const existing = getSqlite()
      .prepare(
        `SELECT id
         FROM wallet_entries
         WHERE user_id = ?
           AND type = 'REFERRAL_COMMISSION'
           AND reference_id = ?
         LIMIT 1`
      )
      .get(referrer.id, referralReferenceId);

    if (existing?.id) {
      return null;
    }
  }

  const beforeBalance = await getUserBalance(referrer.id);
  const note = `${player.name} loss referral income${market ? ` | ${market}` : ""}${boardLabel ? ` | ${boardLabel}` : ""}`;
  const entry = await addWalletEntry({
    userId: referrer.id,
    type: "REFERRAL_COMMISSION",
    status: "SUCCESS",
    amount: commissionAmount,
    beforeBalance,
    afterBalance: beforeBalance + commissionAmount,
    referenceId: referralReferenceId,
    note
  });

  await createNotification({
    userId: referrer.id,
    title: "Referral income credited",
    body: `Rs ${commissionAmount.toFixed(2)} referral income added from ${player.name}.`,
    channel: "wallet"
  });

  return entry;
}

export async function addBid({ userId, market, boardLabel, gameType, sessionType, digit, points, status, payout, settledAt, settledResult }) {
  const id = `bid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = nowIso();

  if (isStandalonePostgresEnabled()) {
    const pool = getPgPool();
    await pool.query(
      `INSERT INTO bids (id, user_id, market, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [id, userId, market, boardLabel, gameType, sessionType, digit, points, status, payout, settledAt, settledResult, createdAt]
    );
  } else {
    getSqlite()
      .prepare(
        `INSERT INTO bids (id, user_id, market, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, userId, market, boardLabel, gameType, sessionType, digit, points, status, payout, settledAt, settledResult, createdAt);
  }

  return { id, userId, market, boardLabel, gameType, sessionType, digit, points, status, payout, settledAt, settledResult, createdAt };
}

export async function listMarkets() {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT id, slug, name, result, status, action, open_time, close_time, category, result_locked_at, result_locked_by_user_id
       FROM markets
       ORDER BY id ASC`
    );
    return sortMarketsByOpenTime(result.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      result: row.result,
      status: row.status,
      action: row.action,
      open: row.open_time,
      close: row.close_time,
      category: row.category,
      resultLockedAt: row.result_locked_at ? (row.result_locked_at instanceof Date ? row.result_locked_at.toISOString() : String(row.result_locked_at)) : null,
      resultLockedByUserId: row.result_locked_by_user_id ?? null
    })));
  }

  const rows = getSqlite()
    .prepare(
      `SELECT id, slug, name, result, status, action, open_time, close_time, category, result_locked_at, result_locked_by_user_id
       FROM markets
       ORDER BY id ASC`
    )
    .all();
  return sortMarketsByOpenTime(rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    result: row.result,
    status: row.status,
    action: row.action,
    open: row.open_time,
    close: row.close_time,
    category: row.category,
    resultLockedAt: row.result_locked_at || null,
    resultLockedByUserId: row.result_locked_by_user_id || null
  })));
}

export async function findMarketBySlug(slug) {
  const markets = await listMarkets();
  return markets.find((item) => item.slug === slug) ?? null;
}

export async function getChartRecord(slug, chartType) {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT market_slug, chart_type, rows_json
       FROM charts
       WHERE market_slug = $1 AND chart_type = $2
       LIMIT 1`,
      [slug, chartType]
    );
    const row = result.rows[0];
    return row
      ? { marketSlug: row.market_slug, chartType: row.chart_type, rows: normalizeChartRowsForStorage(chartType, toChartRows(row.rows_json)) }
      : null;
  }

  const row = getSqlite()
    .prepare(
      `SELECT market_slug, chart_type, rows_json
       FROM charts
       WHERE market_slug = ? AND chart_type = ?
       LIMIT 1`
    )
    .get(slug, chartType);
  return row
    ? { marketSlug: row.market_slug, chartType: row.chart_type, rows: normalizeChartRowsForStorage(chartType, toChartRows(row.rows_json)) }
    : null;
}

export async function upsertChartRecord(marketSlug, chartType, rows) {
  const normalizedRows = normalizeChartRowsForStorage(chartType, rows);
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `INSERT INTO charts (market_slug, chart_type, rows_json)
       VALUES ($1, $2, $3)
       ON CONFLICT (market_slug, chart_type) DO UPDATE SET rows_json = EXCLUDED.rows_json
       RETURNING market_slug, chart_type, rows_json`,
      [marketSlug, chartType, JSON.stringify(normalizedRows)]
    );
    const row = result.rows[0];
    return row
      ? { marketSlug: row.market_slug, chartType: row.chart_type, rows: normalizeChartRowsForStorage(chartType, toChartRows(row.rows_json)) }
      : null;
  }

  const db = getSqlite();
  db.prepare(
    `INSERT INTO charts (market_slug, chart_type, rows_json)
     VALUES (?, ?, ?)
     ON CONFLICT(market_slug, chart_type) DO UPDATE SET rows_json = excluded.rows_json`
  ).run(marketSlug, chartType, JSON.stringify(normalizedRows));

  return getChartRecord(marketSlug, chartType);
}

export async function updateMarketRecord(slug, updates) {
  const current = await findMarketBySlug(slug);
  if (!current) {
    return null;
  }

  const next = {
    result: updates.result?.trim() || current.result,
    status: updates.status?.trim() || current.status,
    action: updates.action?.trim() || current.action,
    open: updates.open?.trim() || current.open,
    close: updates.close?.trim() || current.close,
    category: updates.category || current.category,
    resultLockedAt: Object.hasOwn(updates, "resultLockedAt") ? (updates.resultLockedAt || null) : (current.resultLockedAt || null),
    resultLockedByUserId: Object.hasOwn(updates, "resultLockedByUserId") ? (updates.resultLockedByUserId || null) : (current.resultLockedByUserId || null)
  };

  if (isStandalonePostgresEnabled()) {
    const pool = getPgPool();
    await pool.query(
      `UPDATE markets
       SET result = $1, status = $2, action = $3, open_time = $4, close_time = $5, category = $6, result_locked_at = $7, result_locked_by_user_id = $8
       WHERE slug = $9`,
      [next.result, next.status, next.action, next.open, next.close, next.category, next.resultLockedAt, next.resultLockedByUserId, slug]
    );
  } else {
    getSqlite()
      .prepare(
        `UPDATE markets
         SET result = ?, status = ?, action = ?, open_time = ?, close_time = ?, category = ?, result_locked_at = ?, result_locked_by_user_id = ?
         WHERE slug = ?`
      )
      .run(next.result, next.status, next.action, next.open, next.close, next.category, next.resultLockedAt, next.resultLockedByUserId, slug);
  }

  return findMarketBySlug(slug);
}

export async function getBidsForMarket(marketName) {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT id, user_id, market, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at
       FROM bids
       WHERE market = $1
       ORDER BY created_at ASC, id ASC`,
      [marketName]
    );
    return result.rows.map((row) => mapBidRow(row));
  }

  return getSqlite()
    .prepare(
      `SELECT id, user_id, market, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at
       FROM bids
       WHERE market = ?
       ORDER BY created_at ASC, id ASC`
    )
    .all(marketName)
    .map((row) => mapBidRow(row));
}

export async function updateBidSettlement(bidId, status, payout, settledResult) {
  const settledAt = status === "Pending" ? null : nowIso();
  const normalizedResult = status === "Pending" ? null : settledResult;

  if (isStandalonePostgresEnabled()) {
    const pool = getPgPool();
    const result = await pool.query(
      `UPDATE bids
       SET status = $1, payout = $2, settled_at = $3, settled_result = $4
       WHERE id = $5
       RETURNING id, user_id, market, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at`,
      [status, payout, settledAt, normalizedResult, bidId]
    );
    return mapBidRow(result.rows[0]);
  }

  const db = getSqlite();
  db.prepare(`UPDATE bids SET status = ?, payout = ?, settled_at = ?, settled_result = ? WHERE id = ?`).run(
    status,
    payout,
    settledAt,
    normalizedResult,
    bidId
  );
  return mapBidRow(
    db.prepare(
      `SELECT id, user_id, market, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at
       FROM bids WHERE id = ? LIMIT 1`
    ).get(bidId)
  );
}

export async function listNotificationsForUser(userId) {
  if (isStandalonePostgresEnabled()) {
    const pool = getPgPool();
    const result = await pool.query(
      `SELECT id, title, body, channel, read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      channel: row.channel,
      read: Boolean(row.read),
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
    }));
  }

  const rows = getSqlite()
    .prepare(
      `SELECT id, title, body, channel, read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC`
    )
    .all(userId);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    channel: row.channel,
    read: Boolean(row.read),
    createdAt: row.created_at
  }));
}

export async function registerNotificationDevice(userId, platform, token) {
  const createdAt = nowIso();
  const updatedAt = createdAt;

  if (isStandalonePostgresEnabled()) {
    const pool = getPgPool();
    const existing = await pool.query(
      `SELECT id, user_id, platform, token, enabled, created_at, updated_at
       FROM notification_devices
       WHERE user_id = $1 AND token = $2
       LIMIT 1`,
      [userId, token]
    );
    const current = mapNotificationDeviceRow(existing.rows[0]);
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
  }

  const existing = mapNotificationDeviceRow(
    getSqlite()
      .prepare(
        `SELECT id, user_id, platform, token, enabled, created_at, updated_at
         FROM notification_devices
         WHERE user_id = ? AND token = ?
         LIMIT 1`
      )
      .get(userId, token)
  );
  if (existing) {
    getSqlite()
      .prepare(
        `UPDATE notification_devices
         SET platform = ?, enabled = 1, updated_at = ?
         WHERE id = ?`
      )
      .run(platform, updatedAt, existing.id);
    return { ...existing, platform, enabled: true, updatedAt };
  }

  const id = `device_${Date.now()}`;
  getSqlite()
    .prepare(
      `INSERT INTO notification_devices (id, user_id, platform, token, enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`
    )
    .run(id, userId, platform, token, createdAt, updatedAt);

  return { id, userId, platform, token, enabled: true, createdAt, updatedAt };
}

export async function createNotification({ userId, title, body, channel = "general" }) {
  const id = `notification_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = nowIso();

  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    await pool.query(
      `INSERT INTO notifications (id, user_id, title, body, channel, read, created_at)
       VALUES ($1, $2, $3, $4, $5, FALSE, $6)`,
      [id, userId, title, body, channel, createdAt]
    );
  } else {
    getSqlite()
      .prepare(
        `INSERT INTO notifications (id, user_id, title, body, channel, read, created_at)
         VALUES (?, ?, ?, ?, ?, 0, ?)`
      )
      .run(id, userId, title, body, channel, createdAt);
  }

  return { id, userId, title, body, channel, read: false, createdAt };
}

export async function listEnabledNotificationDevicesByUserIds(userIds) {
  const uniqueUserIds = [...new Set((userIds || []).map((value) => String(value || "").trim()).filter(Boolean))];
  if (!uniqueUserIds.length) {
    return [];
  }

  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const placeholders = uniqueUserIds.map((_, index) => `$${index + 1}`).join(", ");
    const result = await pool.query(
      `SELECT id, user_id, platform, token, enabled, created_at, updated_at
       FROM notification_devices
       WHERE enabled = TRUE
         AND user_id IN (${placeholders})
       ORDER BY created_at DESC, id DESC`,
      uniqueUserIds
    );
    return result.rows.map((row) => mapNotificationDeviceRow(row)).filter(Boolean);
  }

  const placeholders = uniqueUserIds.map(() => "?").join(", ");
  return getSqlite()
    .prepare(
      `SELECT id, user_id, platform, token, enabled, created_at, updated_at
       FROM notification_devices
       WHERE enabled = 1
         AND user_id IN (${placeholders})
       ORDER BY created_at DESC, id DESC`
    )
    .all(...uniqueUserIds)
    .map((row) => mapNotificationDeviceRow(row))
    .filter(Boolean);
}

async function findChatConversationByUserId(userId) {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT id, user_id, status, created_at, updated_at, last_message_at, resolved_at
       FROM chat_conversations
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );
    return mapChatConversationRow(result.rows[0]);
  }

  return mapChatConversationRow(
    getSqlite()
      .prepare(
        `SELECT id, user_id, status, created_at, updated_at, last_message_at, resolved_at
         FROM chat_conversations
         WHERE user_id = ?
         LIMIT 1`
      )
      .get(userId)
  );
}

async function findChatConversationById(conversationId) {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT id, user_id, status, created_at, updated_at, last_message_at, resolved_at
       FROM chat_conversations
       WHERE id = $1
       LIMIT 1`,
      [conversationId]
    );
    return mapChatConversationRow(result.rows[0]);
  }

  return mapChatConversationRow(
    getSqlite()
      .prepare(
        `SELECT id, user_id, status, created_at, updated_at, last_message_at, resolved_at
         FROM chat_conversations
         WHERE id = ?
         LIMIT 1`
      )
      .get(conversationId)
  );
}

async function touchChatConversation(conversationId, timestamp) {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    await pool.query(
      `UPDATE chat_conversations
       SET updated_at = $1, last_message_at = $1
       WHERE id = $2`,
      [timestamp, conversationId]
    );
    return;
  }

  getSqlite()
    .prepare(
      `UPDATE chat_conversations
       SET updated_at = ?, last_message_at = ?
       WHERE id = ?`
    )
    .run(timestamp, timestamp, conversationId);
}

export async function updateSupportConversationStatus(conversationId, status) {
  const nextStatus = String(status || "").trim().toUpperCase();
  if (!conversationId || !["OPEN", "PENDING", "RESOLVED"].includes(nextStatus)) {
    throw new Error("Valid conversationId and status are required");
  }

  const updatedAt = nowIso();
  const resolvedAt = nextStatus === "RESOLVED" ? updatedAt : null;

  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `UPDATE chat_conversations
       SET status = $1, updated_at = $2, resolved_at = $3
       WHERE id = $4
       RETURNING id, user_id, status, created_at, updated_at, last_message_at, resolved_at`,
      [nextStatus, updatedAt, resolvedAt, conversationId]
    );
    return mapChatConversationRow(result.rows[0]);
  }

  const sqlite = getSqlite();
  sqlite
    .prepare(
      `UPDATE chat_conversations
       SET status = ?, updated_at = ?, resolved_at = ?
       WHERE id = ?`
    )
    .run(nextStatus, updatedAt, resolvedAt, conversationId);

  return findChatConversationById(conversationId);
}

export async function getOrCreateSupportConversation(userId) {
  const existing = await findChatConversationByUserId(userId);
  if (existing) {
    return existing;
  }

  const timestamp = nowIso();
  const conversation = {
    id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    status: "OPEN",
    createdAt: timestamp,
    updatedAt: timestamp,
    lastMessageAt: timestamp,
    resolvedAt: null
  };

  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    await pool.query(
      `INSERT INTO chat_conversations (id, user_id, status, created_at, updated_at, last_message_at, resolved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [conversation.id, conversation.userId, conversation.status, conversation.createdAt, conversation.updatedAt, conversation.lastMessageAt, conversation.resolvedAt]
    );
  } else {
    getSqlite()
      .prepare(
        `INSERT INTO chat_conversations (id, user_id, status, created_at, updated_at, last_message_at, resolved_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(conversation.id, conversation.userId, conversation.status, conversation.createdAt, conversation.updatedAt, conversation.lastMessageAt, conversation.resolvedAt);
  }

  await addSupportChatMessage({
    conversationId: conversation.id,
    senderRole: "support",
    senderUserId: await findSupportSenderUserId(),
    text: "Namaste. Wallet, withdraw, market result, bonus, ya bid issue ke liye yahan message bhejiye. Support team jaldi reply karegi.",
    readByUser: true,
    readByAdmin: true
  });

  return findChatConversationById(conversation.id);
}

export async function cleanupResolvedSupportConversations() {
  const cutoffIso = new Date(Date.now() - supportChatResolvedRetentionMs).toISOString();

  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
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
    return;
  }

  const sqlite = getSqlite();
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

  const createdAt = nowIso();
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

  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    await pool.query(
      `INSERT INTO chat_messages (id, conversation_id, sender_role, sender_user_id, text, read_by_user, read_by_admin, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [message.id, message.conversationId, message.senderRole, message.senderUserId, message.text, message.readByUser, message.readByAdmin, message.createdAt]
    );
  } else {
    getSqlite()
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

export async function getSupportMessages(conversationId) {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT id, conversation_id, sender_role, sender_user_id, text, read_by_user, read_by_admin, created_at
       FROM chat_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC, id ASC`,
      [conversationId]
    );
    return result.rows.map((row) => mapChatMessageRow(row));
  }

  return getSqlite()
    .prepare(
      `SELECT id, conversation_id, sender_role, sender_user_id, text, read_by_user, read_by_admin, created_at
       FROM chat_messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC, id ASC`
    )
    .all(conversationId)
    .map((row) => mapChatMessageRow(row));
}

export async function markSupportMessagesReadByUser(conversationId) {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    await pool.query(
      `UPDATE chat_messages
       SET read_by_user = TRUE
       WHERE conversation_id = $1
         AND sender_role = 'support'
         AND read_by_user = FALSE`,
      [conversationId]
    );
    return;
  }

  getSqlite()
    .prepare(
      `UPDATE chat_messages
       SET read_by_user = 1
       WHERE conversation_id = ?
         AND sender_role = 'support'
         AND read_by_user = 0`
    )
    .run(conversationId);
}

export async function markSupportMessagesReadByAdmin(conversationId) {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    await pool.query(
      `UPDATE chat_messages
       SET read_by_admin = TRUE
       WHERE conversation_id = $1
         AND sender_role = 'user'
         AND read_by_admin = FALSE`,
      [conversationId]
    );
    return;
  }

  getSqlite()
    .prepare(
      `UPDATE chat_messages
       SET read_by_admin = 1
       WHERE conversation_id = ?
         AND sender_role = 'user'
         AND read_by_admin = 0`
    )
    .run(conversationId);
}

export async function getSupportConversationBundleForUser(userId) {
  await cleanupResolvedSupportConversations();
  const conversation = await getOrCreateSupportConversation(userId);
  const messages = await getSupportMessages(conversation.id);
  return { conversation, messages };
}

export async function listSupportConversations() {
  await cleanupResolvedSupportConversations();
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
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
         COALESCE(uc.unread_for_admin, 0) AS unread_for_admin
       FROM chat_conversations c
       JOIN users u ON u.id = c.user_id
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
       ORDER BY c.last_message_at DESC, c.id DESC`
    );
    return result.rows.map((row) => ({
      ...mapChatConversationRow(row),
      userName: row.user_name,
      userPhone: row.user_phone,
      lastMessagePreview: row.last_message_text ?? "",
      lastMessageText: row.last_message_text ?? "",
      unreadForAdmin: Number(row.unread_for_admin ?? 0)
    }));
  }

  return getSqlite()
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
       JOIN users u ON u.id = c.user_id
       ORDER BY c.last_message_at DESC, c.id DESC`
    )
    .all()
    .map((row) => ({
      ...mapChatConversationRow(row),
      userName: row.user_name,
      userPhone: row.user_phone,
      lastMessagePreview: row.last_message_text ?? "",
      lastMessageText: row.last_message_text ?? "",
      unreadForAdmin: Number(row.unread_for_admin ?? 0)
    }));
}

export async function getSupportConversationSummary() {
  await cleanupResolvedSupportConversations();
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
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
  }

  const row = getSqlite()
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

export async function getSupportConversationDetailsForAdmin(conversationId) {
  await cleanupResolvedSupportConversations();
  const conversation = await findChatConversationById(conversationId);
  if (!conversation) {
    return null;
  }

  const user = await findUserById(conversation.userId);
  const messages = await getSupportMessages(conversation.id);

  return {
    conversation,
    user: user
      ? {
          id: user.id,
          name: user.name,
          phone: user.phone
        }
      : null,
    messages
  };
}

export async function listAllNotifications(limit = 200) {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT id, user_id, title, body, channel, read, created_at
       FROM notifications
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      body: row.body,
      channel: row.channel,
      read: Boolean(row.read),
      createdAt: toIso(row.created_at)
    }));
  }

  return getSqlite()
    .prepare(
      `SELECT id, user_id, title, body, channel, read, created_at
       FROM notifications
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(limit)
    .map((row) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      body: row.body,
      channel: row.channel,
      read: Boolean(row.read),
      createdAt: toIso(row.created_at)
    }));
}

export async function getAppSettings() {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(`SELECT setting_key, setting_value, updated_at FROM app_settings ORDER BY setting_key ASC`);
    return result.rows.map((row) => mapAppSettingRow(row));
  }

  return getSqlite()
    .prepare(`SELECT setting_key, setting_value, updated_at FROM app_settings ORDER BY setting_key ASC`)
    .all()
    .map((row) => mapAppSettingRow(row));
}

export async function upsertAppSetting(settingKey, settingValue) {
  const updatedAt = nowIso();

  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `INSERT INTO app_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = EXCLUDED.updated_at
       RETURNING setting_key, setting_value, updated_at`,
      [settingKey, settingValue, updatedAt]
    );
    return mapAppSettingRow(result.rows[0]);
  }

  getSqlite()
    .prepare(
      `INSERT INTO app_settings (setting_key, setting_value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at`
    )
    .run(settingKey, settingValue, updatedAt);

  return mapAppSettingRow(
    getSqlite().prepare(`SELECT setting_key, setting_value, updated_at FROM app_settings WHERE setting_key = ? LIMIT 1`).get(settingKey)
  );
}

export async function updateUserAccountStatus(userId, action, note = "") {
  const user = await findUserById(userId);
  if (!user) {
    return null;
  }

  const blockedAt = action === "block" ? nowIso() : action === "unblock" ? null : user.blockedAt;
  const deactivatedAt = action === "deactivate" ? nowIso() : action === "activate" ? null : user.deactivatedAt;
  const statusNote = note.trim();

  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `UPDATE users
       SET blocked_at = $2,
           deactivated_at = $3,
           status_note = $4
       WHERE id = $1
       RETURNING id, phone, password_hash, mpin_hash, name, joined_at, referral_code, role, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id`,
      [userId, blockedAt, deactivatedAt, statusNote]
    );
    return mapUserRow(result.rows[0]);
  }

  getSqlite()
    .prepare(
      `UPDATE users
       SET blocked_at = ?, deactivated_at = ?, status_note = ?
       WHERE id = ?`
    )
    .run(blockedAt, deactivatedAt, statusNote, userId);

  return findUserById(userId);
}

export async function listAllBids(limit = 300) {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT id, user_id, market, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at
       FROM bids
       ORDER BY created_at DESC, id DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map((row) => mapBidRow(row));
  }

  return getSqlite()
    .prepare(
      `SELECT id, user_id, market, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at
       FROM bids
       ORDER BY created_at DESC, id DESC
       LIMIT ?`
    )
    .all(limit)
    .map((row) => mapBidRow(row));
}

export async function getDashboardSummaryData(startOfToday, dateKeys = []) {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const [
      totalsResult,
      todayWalletResult,
      todayBidsResult,
      todaySessionsResult,
      todayActiveUsersResult,
      topUsersResult,
      recentBidsResult,
      recentRequestsResult,
      collectionSeriesResult,
      payoutSeriesResult,
      activeTrendResult,
      supportSummary
    ] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*)::int AS users,
           COUNT(*) FILTER (WHERE approval_status = 'Approved')::int AS approved_users,
           COUNT(*) FILTER (WHERE approval_status = 'Pending')::int AS pending_users
         FROM users
         WHERE role = 'user'`
      ),
      pool.query(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'DEPOSIT' AND status = ANY(ARRAY['SUCCESS', 'BACKOFFICE']) THEN amount ELSE 0 END), 0) AS deposit_amount,
           COUNT(*) FILTER (WHERE type = 'DEPOSIT' AND status = 'INITIATED')::int AS deposit_requests,
           COALESCE(SUM(CASE WHEN type = 'WITHDRAW' AND status = ANY(ARRAY['SUCCESS', 'BACKOFFICE']) THEN amount ELSE 0 END), 0) AS withdraw_amount,
           COUNT(*) FILTER (WHERE type = 'WITHDRAW' AND status = 'INITIATED')::int AS withdraw_requests,
           COALESCE(SUM(CASE WHEN type = 'SIGNUP_BONUS' AND status = 'SUCCESS' THEN amount ELSE 0 END), 0) AS signup_bonus_amount,
           COUNT(*) FILTER (WHERE status = 'INITIATED' AND type IN ('DEPOSIT', 'WITHDRAW'))::int AS pending_wallet_requests,
           COUNT(*) FILTER (WHERE status = 'INITIATED' AND type = 'DEPOSIT')::int AS pending_deposits,
           COUNT(*) FILTER (WHERE status = 'INITIATED' AND type = 'WITHDRAW')::int AS pending_withdraws
         FROM wallet_entries
         WHERE created_at >= $1`,
        [startOfToday]
      ),
      pool.query(
        `SELECT
           COUNT(*)::int AS bets_count,
           COALESCE(SUM(points), 0) AS bets_amount
         FROM bids
         WHERE created_at >= $1`,
        [startOfToday]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS login_count
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.created_at >= $1
           AND u.role = 'user'`,
        [startOfToday]
      ),
      pool.query(
        `SELECT COUNT(DISTINCT user_id)::int AS active_users
         FROM (
          SELECT s.user_id
          FROM sessions s
          JOIN users u ON u.id = s.user_id
          WHERE s.created_at >= $1
            AND u.role = 'user'
           UNION
          SELECT b.user_id
          FROM bids b
          JOIN users u ON u.id = b.user_id
          WHERE b.created_at >= $1
            AND u.role = 'user'
           UNION
          SELECT we.user_id
          FROM wallet_entries we
          JOIN users u ON u.id = we.user_id
          WHERE we.created_at >= $1
            AND u.role = 'user'
         ) active_users`,
        [startOfToday]
      ),
      pool.query(
        `SELECT
           u.id,
           u.name,
           u.phone,
           COALESCE(balance.after_balance, 0) AS balance
         FROM users u
         LEFT JOIN LATERAL (
           SELECT after_balance
         FROM wallet_entries
         WHERE user_id = u.id
         ORDER BY created_at DESC, id DESC
         LIMIT 1
         ) balance ON TRUE
         WHERE u.approval_status = 'Approved'
           AND u.role = 'user'
         ORDER BY u.joined_at DESC, u.id DESC
         LIMIT 5`
      ),
      pool.query(
        `SELECT
           b.id,
           b.market,
           b.board_label,
           b.digit,
           b.points,
           b.status,
           b.created_at,
           u.name AS user_name,
           u.phone AS user_phone
         FROM bids b
         LEFT JOIN users u ON u.id = b.user_id
         ORDER BY b.created_at DESC, b.id DESC
         LIMIT 8`
      ),
      pool.query(
        `SELECT
           we.id,
           we.type,
           we.amount,
           we.created_at,
           u.name AS user_name,
           u.phone AS user_phone
         FROM wallet_entries we
         LEFT JOIN users u ON u.id = we.user_id
         WHERE we.status = 'INITIATED'
           AND we.type IN ('DEPOSIT', 'WITHDRAW')
         ORDER BY we.created_at DESC, we.id DESC
         LIMIT 8`
      ),
      pool.query(
        `SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, COALESCE(SUM(points), 0) AS collection
         FROM bids
         WHERE created_at >= $1
         GROUP BY 1`,
        [dateKeys[0] ? `${dateKeys[0]}T00:00:00.000Z` : startOfToday]
      ),
      pool.query(
        `SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, COALESCE(SUM(amount), 0) AS payout
         FROM wallet_entries
         WHERE created_at >= $1
           AND type = 'BID_WIN'
           AND status = ANY(ARRAY['SUCCESS', 'BACKOFFICE'])
         GROUP BY 1`,
        [dateKeys[0] ? `${dateKeys[0]}T00:00:00.000Z` : startOfToday]
      ),
      pool.query(
        `SELECT date, COUNT(DISTINCT user_id)::int AS users
         FROM (
          SELECT to_char(s.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, s.user_id
          FROM sessions s
          JOIN users u ON u.id = s.user_id
          WHERE s.created_at >= $1
            AND u.role = 'user'
           UNION
          SELECT to_char(b.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, b.user_id
          FROM bids b
          JOIN users u ON u.id = b.user_id
          WHERE b.created_at >= $1
            AND u.role = 'user'
           UNION
          SELECT to_char(we.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, we.user_id
          FROM wallet_entries we
          JOIN users u ON u.id = we.user_id
          WHERE we.created_at >= $1
            AND u.role = 'user'
         ) activity
         GROUP BY date`,
        [dateKeys[0] ? `${dateKeys[0]}T00:00:00.000Z` : startOfToday]
      ),
      getSupportConversationSummary()
    ]);

    const marketsResult = await pool.query(
      `SELECT
         COUNT(*)::int AS markets,
         COUNT(*) FILTER (WHERE LOWER(action) NOT LIKE '%closed%')::int AS live_markets,
         COUNT(*) FILTER (WHERE result = '***-**-***')::int AS placeholder_results
       FROM markets`
    );
    const devicesResult = await pool.query(`SELECT COUNT(*)::int AS device_registrations FROM notification_devices`);

    const totals = totalsResult.rows[0] ?? {};
    const todayWallet = todayWalletResult.rows[0] ?? {};
    const todayBids = todayBidsResult.rows[0] ?? {};
    const todaySessions = todaySessionsResult.rows[0] ?? {};
    const todayActiveUsers = todayActiveUsersResult.rows[0] ?? {};
    const markets = marketsResult.rows[0] ?? {};
    const devices = devicesResult.rows[0] ?? {};

    const collectionMap = new Map(collectionSeriesResult.rows.map((row) => [row.date, Number(row.collection ?? 0)]));
    const payoutMap = new Map(payoutSeriesResult.rows.map((row) => [row.date, Number(row.payout ?? 0)]));
    const activeMap = new Map(activeTrendResult.rows.map((row) => [row.date, Number(row.users ?? 0)]));

    return {
      totals: {
        users: Number(totals.users ?? 0),
        approvedUsers: Number(totals.approved_users ?? 0),
        pendingUsers: Number(totals.pending_users ?? 0),
        pendingWalletRequests: Number(todayWallet.pending_wallet_requests ?? 0),
        markets: Number(markets.markets ?? 0),
        liveMarkets: Number(markets.live_markets ?? 0),
        deviceRegistrations: Number(devices.device_registrations ?? 0),
        supportConversations: Number(supportSummary.conversationsCount ?? 0)
      },
      today: {
        depositAmount: Number(todayWallet.deposit_amount ?? 0),
        depositRequests: Number(todayWallet.deposit_requests ?? 0),
        withdrawAmount: Number(todayWallet.withdraw_amount ?? 0),
        withdrawRequests: Number(todayWallet.withdraw_requests ?? 0),
        signupBonusAmount: Number(todayWallet.signup_bonus_amount ?? 0),
        betsCount: Number(todayBids.bets_count ?? 0),
        betsAmount: Number(todayBids.bets_amount ?? 0),
        loginCount: Number(todaySessions.login_count ?? 0),
        activeUsers: Number(todayActiveUsers.active_users ?? 0)
      },
      trends: {
        collectionVsPayout: dateKeys.map((date) => ({
          date,
          collection: collectionMap.get(date) ?? 0,
          payout: payoutMap.get(date) ?? 0
        })),
        activeUsersTrend: dateKeys.map((date) => ({
          date,
          users: activeMap.get(date) ?? 0
        }))
      },
      pendingWork: {
        userApprovals: Number(totals.pending_users ?? 0),
        walletApprovals: Number(todayWallet.pending_wallet_requests ?? 0),
        pendingDeposits: Number(todayWallet.pending_deposits ?? 0),
        pendingWithdraws: Number(todayWallet.pending_withdraws ?? 0),
        supportUnread: Number(supportSummary.unreadForAdmin ?? 0)
      },
      topUsers: topUsersResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        balance: Number(row.balance ?? 0)
      })),
      recentBids: recentBidsResult.rows.map((row) => ({
        id: row.id,
        market: row.market,
        boardLabel: row.board_label,
        digit: row.digit,
        points: Number(row.points ?? 0),
        status: row.status,
        createdAt: toIso(row.created_at),
        userName: row.user_name ?? "Unknown",
        userPhone: row.user_phone ?? ""
      })),
      recentRequests: recentRequestsResult.rows.map((row) => ({
        id: row.id,
        type: row.type,
        amount: Number(row.amount ?? 0),
        createdAt: toIso(row.created_at),
        userName: row.user_name ?? "Unknown",
        userPhone: row.user_phone ?? ""
      })),
      placeholderResults: Number(markets.placeholder_results ?? 0)
    };
  }

  const sqlite = getSqlite();
  const seriesFrom = dateKeys[0] ? `${dateKeys[0]}T00:00:00.000Z` : startOfToday;
  const totals = sqlite.prepare(
    `SELECT
       COUNT(*) AS users,
       SUM(CASE WHEN approval_status = 'Approved' THEN 1 ELSE 0 END) AS approved_users,
       SUM(CASE WHEN approval_status = 'Pending' THEN 1 ELSE 0 END) AS pending_users
     FROM users
     WHERE role = 'user'`
  ).get();
  const todayWallet = sqlite.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'DEPOSIT' AND status IN ('SUCCESS', 'BACKOFFICE') THEN amount ELSE 0 END), 0) AS deposit_amount,
       SUM(CASE WHEN type = 'DEPOSIT' AND status = 'INITIATED' THEN 1 ELSE 0 END) AS deposit_requests,
       COALESCE(SUM(CASE WHEN type = 'WITHDRAW' AND status IN ('SUCCESS', 'BACKOFFICE') THEN amount ELSE 0 END), 0) AS withdraw_amount,
       SUM(CASE WHEN type = 'WITHDRAW' AND status = 'INITIATED' THEN 1 ELSE 0 END) AS withdraw_requests,
       COALESCE(SUM(CASE WHEN type = 'SIGNUP_BONUS' AND status = 'SUCCESS' THEN amount ELSE 0 END), 0) AS signup_bonus_amount,
       SUM(CASE WHEN status = 'INITIATED' AND type IN ('DEPOSIT', 'WITHDRAW') THEN 1 ELSE 0 END) AS pending_wallet_requests,
       SUM(CASE WHEN status = 'INITIATED' AND type = 'DEPOSIT' THEN 1 ELSE 0 END) AS pending_deposits,
       SUM(CASE WHEN status = 'INITIATED' AND type = 'WITHDRAW' THEN 1 ELSE 0 END) AS pending_withdraws
     FROM wallet_entries
     WHERE created_at >= ?`
  ).get(startOfToday);
  const todayBids = sqlite.prepare(
    `SELECT COUNT(*) AS bets_count, COALESCE(SUM(points), 0) AS bets_amount
     FROM bids
     WHERE created_at >= ?`
  ).get(startOfToday);
  const todaySessions = sqlite.prepare(
    `SELECT COUNT(*) AS login_count
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.created_at >= ?
       AND u.role = 'user'`
  ).get(startOfToday);
  const todayActiveUsers = sqlite.prepare(
    `SELECT COUNT(DISTINCT user_id) AS active_users
     FROM (
       SELECT s.user_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.created_at >= ?
         AND u.role = 'user'
       UNION
       SELECT b.user_id
       FROM bids b
       JOIN users u ON u.id = b.user_id
       WHERE b.created_at >= ?
         AND u.role = 'user'
       UNION
       SELECT we.user_id
       FROM wallet_entries we
       JOIN users u ON u.id = we.user_id
       WHERE we.created_at >= ?
         AND u.role = 'user'
     ) active_users`
  ).get(startOfToday, startOfToday, startOfToday);
  const markets = sqlite.prepare(
    `SELECT
       COUNT(*) AS markets,
       SUM(CASE WHEN LOWER(action) NOT LIKE '%closed%' THEN 1 ELSE 0 END) AS live_markets,
       SUM(CASE WHEN result = '***-**-***' THEN 1 ELSE 0 END) AS placeholder_results
     FROM markets`
  ).get();
  const devices = sqlite.prepare(`SELECT COUNT(*) AS device_registrations FROM notification_devices`).get();
  const topUsers = sqlite.prepare(
    `SELECT
       u.id,
       u.name,
       u.phone,
       COALESCE((
         SELECT after_balance
         FROM wallet_entries we
         WHERE we.user_id = u.id
         ORDER BY created_at DESC, id DESC
         LIMIT 1
       ), 0) AS balance
     FROM users u
     WHERE u.approval_status = 'Approved'
       AND u.role = 'user'
     ORDER BY u.joined_at DESC, u.id DESC
     LIMIT 5`
  ).all();
  const recentBids = sqlite.prepare(
    `SELECT
       b.id,
       b.market,
       b.board_label,
       b.digit,
       b.points,
       b.status,
       b.created_at,
       u.name AS user_name,
       u.phone AS user_phone
     FROM bids b
     LEFT JOIN users u ON u.id = b.user_id
     ORDER BY b.created_at DESC, b.id DESC
     LIMIT 8`
  ).all();
  const recentRequests = sqlite.prepare(
    `SELECT
       we.id,
       we.type,
       we.amount,
       we.created_at,
       u.name AS user_name,
       u.phone AS user_phone
     FROM wallet_entries we
     LEFT JOIN users u ON u.id = we.user_id
     WHERE we.status = 'INITIATED'
       AND we.type IN ('DEPOSIT', 'WITHDRAW')
     ORDER BY we.created_at DESC, we.id DESC
     LIMIT 8`
  ).all();
  const collectionSeries = sqlite.prepare(
    `SELECT substr(created_at, 1, 10) AS date, COALESCE(SUM(points), 0) AS collection
     FROM bids
     WHERE created_at >= ?
     GROUP BY substr(created_at, 1, 10)`
  ).all(seriesFrom);
  const payoutSeries = sqlite.prepare(
    `SELECT substr(created_at, 1, 10) AS date, COALESCE(SUM(amount), 0) AS payout
     FROM wallet_entries
     WHERE created_at >= ?
       AND type = 'BID_WIN'
       AND status IN ('SUCCESS', 'BACKOFFICE')
     GROUP BY substr(created_at, 1, 10)`
  ).all(seriesFrom);
  const activeTrend = sqlite.prepare(
    `SELECT date, COUNT(DISTINCT user_id) AS users
     FROM (
       SELECT substr(s.created_at, 1, 10) AS date, s.user_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.created_at >= ?
         AND u.role = 'user'
       UNION
       SELECT substr(b.created_at, 1, 10) AS date, b.user_id
       FROM bids b
       JOIN users u ON u.id = b.user_id
       WHERE b.created_at >= ?
         AND u.role = 'user'
       UNION
       SELECT substr(we.created_at, 1, 10) AS date, we.user_id
       FROM wallet_entries we
       JOIN users u ON u.id = we.user_id
       WHERE we.created_at >= ?
         AND u.role = 'user'
     ) activity
     GROUP BY date`
  ).all(seriesFrom, seriesFrom, seriesFrom);
  const supportSummary = await getSupportConversationSummary();

  const collectionMap = new Map(collectionSeries.map((row) => [row.date, Number(row.collection ?? 0)]));
  const payoutMap = new Map(payoutSeries.map((row) => [row.date, Number(row.payout ?? 0)]));
  const activeMap = new Map(activeTrend.map((row) => [row.date, Number(row.users ?? 0)]));

  return {
    totals: {
      users: Number(totals?.users ?? 0),
      approvedUsers: Number(totals?.approved_users ?? 0),
      pendingUsers: Number(totals?.pending_users ?? 0),
      pendingWalletRequests: Number(todayWallet?.pending_wallet_requests ?? 0),
      markets: Number(markets?.markets ?? 0),
      liveMarkets: Number(markets?.live_markets ?? 0),
      deviceRegistrations: Number(devices?.device_registrations ?? 0),
      supportConversations: Number(supportSummary.conversationsCount ?? 0)
    },
    today: {
      depositAmount: Number(todayWallet?.deposit_amount ?? 0),
      depositRequests: Number(todayWallet?.deposit_requests ?? 0),
      withdrawAmount: Number(todayWallet?.withdraw_amount ?? 0),
      withdrawRequests: Number(todayWallet?.withdraw_requests ?? 0),
      signupBonusAmount: Number(todayWallet?.signup_bonus_amount ?? 0),
      betsCount: Number(todayBids?.bets_count ?? 0),
      betsAmount: Number(todayBids?.bets_amount ?? 0),
      loginCount: Number(todaySessions?.login_count ?? 0),
      activeUsers: Number(todayActiveUsers?.active_users ?? 0)
    },
    trends: {
      collectionVsPayout: dateKeys.map((date) => ({ date, collection: collectionMap.get(date) ?? 0, payout: payoutMap.get(date) ?? 0 })),
      activeUsersTrend: dateKeys.map((date) => ({ date, users: activeMap.get(date) ?? 0 }))
    },
    pendingWork: {
      userApprovals: Number(totals?.pending_users ?? 0),
      walletApprovals: Number(todayWallet?.pending_wallet_requests ?? 0),
      pendingDeposits: Number(todayWallet?.pending_deposits ?? 0),
      pendingWithdraws: Number(todayWallet?.pending_withdraws ?? 0),
      supportUnread: Number(supportSummary.unreadForAdmin ?? 0)
    },
    topUsers: topUsers.map((row) => ({ id: row.id, name: row.name, phone: row.phone, balance: Number(row.balance ?? 0) })),
    recentBids: recentBids.map((row) => ({
      id: row.id,
      market: row.market,
      boardLabel: row.board_label,
      digit: row.digit,
      points: Number(row.points ?? 0),
      status: row.status,
      createdAt: toIso(row.created_at),
      userName: row.user_name ?? "Unknown",
      userPhone: row.user_phone ?? ""
    })),
    recentRequests: recentRequests.map((row) => ({
      id: row.id,
      type: row.type,
      amount: Number(row.amount ?? 0),
      createdAt: toIso(row.created_at),
      userName: row.user_name ?? "Unknown",
      userPhone: row.user_phone ?? ""
    })),
    placeholderResults: Number(markets?.placeholder_results ?? 0)
  };
}

export async function getMonitoringSummaryData() {
  const [supportSummary, auditLogs] = await Promise.all([getSupportConversationSummary(), getAuditLogs(50)]);

  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const [usersResult, walletResult, marketsResult] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE blocked_at IS NOT NULL)::int AS blocked_users,
           COUNT(*) FILTER (WHERE deactivated_at IS NOT NULL)::int AS deactivated_users
         FROM users
         WHERE role = 'user'`
      ),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE type = 'WITHDRAW' AND status = 'INITIATED')::int AS pending_withdraws,
           COUNT(*) FILTER (WHERE type = 'DEPOSIT' AND status = 'INITIATED')::int AS pending_deposits
         FROM wallet_entries`
      ),
      pool.query(
        `SELECT COUNT(*) FILTER (WHERE result = '***-**-***')::int AS placeholder_results
         FROM markets`
      )
    ]);

    return {
      blockedUsers: Number(usersResult.rows[0]?.blocked_users ?? 0),
      deactivatedUsers: Number(usersResult.rows[0]?.deactivated_users ?? 0),
      pendingWithdraws: Number(walletResult.rows[0]?.pending_withdraws ?? 0),
      pendingDeposits: Number(walletResult.rows[0]?.pending_deposits ?? 0),
      placeholderResults: Number(marketsResult.rows[0]?.placeholder_results ?? 0),
      supportUnread: Number(supportSummary.unreadForAdmin ?? 0),
      supportConversations: Number(supportSummary.conversationsCount ?? 0),
      auditEvents: auditLogs.length,
      recentAuditFlags: auditLogs.filter((item) => item.action.includes("REJECTED") || item.action.includes("RESET")).slice(0, 12)
    };
  }

  const sqlite = getSqlite();
  const users = sqlite.prepare(
    `SELECT
       SUM(CASE WHEN blocked_at IS NOT NULL THEN 1 ELSE 0 END) AS blocked_users,
       SUM(CASE WHEN deactivated_at IS NOT NULL THEN 1 ELSE 0 END) AS deactivated_users
     FROM users
     WHERE role = 'user'`
  ).get();
  const wallet = sqlite.prepare(
    `SELECT
       SUM(CASE WHEN type = 'WITHDRAW' AND status = 'INITIATED' THEN 1 ELSE 0 END) AS pending_withdraws,
       SUM(CASE WHEN type = 'DEPOSIT' AND status = 'INITIATED' THEN 1 ELSE 0 END) AS pending_deposits
     FROM wallet_entries`
  ).get();
  const markets = sqlite.prepare(
    `SELECT SUM(CASE WHEN result = '***-**-***' THEN 1 ELSE 0 END) AS placeholder_results
     FROM markets`
  ).get();

  return {
    blockedUsers: Number(users?.blocked_users ?? 0),
    deactivatedUsers: Number(users?.deactivated_users ?? 0),
    pendingWithdraws: Number(wallet?.pending_withdraws ?? 0),
    pendingDeposits: Number(wallet?.pending_deposits ?? 0),
    placeholderResults: Number(markets?.placeholder_results ?? 0),
    supportUnread: Number(supportSummary.unreadForAdmin ?? 0),
    supportConversations: Number(supportSummary.conversationsCount ?? 0),
    auditEvents: auditLogs.length,
    recentAuditFlags: auditLogs.filter((item) => item.action.includes("REJECTED") || item.action.includes("RESET")).slice(0, 12)
  };
}

async function findPaymentOrderById(paymentOrderId) {
  if (isStandalonePostgresEnabled()) {
    const pool = getPgPool();
    const result = await pool.query(
      `SELECT id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, gateway_payment_id, gateway_signature, verified_at, redirect_url, created_at, updated_at
       FROM payment_orders
       WHERE id = $1
       LIMIT 1`,
      [paymentOrderId]
    );
    return mapPaymentOrderRow(result.rows[0]);
  }

  return mapPaymentOrderRow(
    getSqlite()
      .prepare(
        `SELECT id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, gateway_payment_id, gateway_signature, verified_at, redirect_url, created_at, updated_at
         FROM payment_orders
         WHERE id = ?
         LIMIT 1`
      )
      .get(paymentOrderId)
  );
}

async function findPaymentOrderByReference(reference) {
  if (!reference) {
    return null;
  }

  if (isStandalonePostgresEnabled()) {
    const pool = getPgPool();
    const result = await pool.query(
      `SELECT id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, gateway_payment_id, gateway_signature, verified_at, redirect_url, created_at, updated_at
       FROM payment_orders
       WHERE reference = $1
       LIMIT 1`,
      [reference]
    );
    return mapPaymentOrderRow(result.rows[0]);
  }

  return mapPaymentOrderRow(
    getSqlite()
      .prepare(
        `SELECT id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, gateway_payment_id, gateway_signature, verified_at, redirect_url, created_at, updated_at
         FROM payment_orders
         WHERE reference = ?
         LIMIT 1`
      )
      .get(reference)
  );
}

export async function findPaymentOrderByReferenceForUser(userId, reference) {
  const order = await findPaymentOrderByReference(reference);
  if (!order || order.userId !== userId) {
    return null;
  }
  return order;
}

export async function findPaymentOrderForCheckout(paymentOrderId, checkoutToken) {
  const order = await findPaymentOrderById(paymentOrderId);
  if (!order || !checkoutToken || order.checkoutToken !== checkoutToken) {
    return null;
  }
  return order;
}

export async function createPaymentOrder({
  id = `payment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  userId,
  amount,
  provider = "manual",
  reference = `RM${Date.now()}`,
  checkoutToken = null,
  gatewayOrderId = null,
  redirectUrl = null
}) {
  const createdAt = nowIso();
  const status = "PENDING";

  if (isStandalonePostgresEnabled()) {
    const pool = getPgPool();
    await pool.query(
      `INSERT INTO payment_orders (id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, redirect_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
      [id, userId, provider, amount, status, reference, checkoutToken, gatewayOrderId, redirectUrl, createdAt]
    );
  } else {
    getSqlite()
      .prepare(
        `INSERT INTO payment_orders (id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, redirect_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, userId, provider, amount, status, reference, checkoutToken, gatewayOrderId, redirectUrl, createdAt, createdAt);
  }

  return findPaymentOrderById(id);
}

export async function completePaymentOrder({ paymentOrderId, gatewayOrderId, gatewayPaymentId, gatewaySignature }) {
  const verifiedAt = nowIso();

  if (isStandalonePostgresEnabled()) {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existingResult = await client.query(
        `SELECT id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, gateway_payment_id, gateway_signature, verified_at, redirect_url, created_at, updated_at
         FROM payment_orders
         WHERE id = $1
         FOR UPDATE`,
        [paymentOrderId]
      );
      const existing = existingResult.rows[0];
      if (!existing) {
        await client.query("ROLLBACK");
        return null;
      }
      if (existing.gateway_order_id && existing.gateway_order_id !== gatewayOrderId) {
        throw new Error("Gateway order mismatch");
      }
      if (existing.status !== "SUCCESS") {
        const currentBalance = Number(
          (
            await client.query(
              `SELECT COALESCE(
                 (
                   SELECT after_balance
                   FROM wallet_entries
                   WHERE user_id = $1
                   ORDER BY created_at DESC, id DESC
                   LIMIT 1
                 ),
                 0
               ) AS balance`,
              [existing.user_id]
            )
          ).rows[0]?.balance ?? 0
        );
        const nextBalance = currentBalance + Number(existing.amount);
        await client.query(
          `UPDATE payment_orders
           SET status = 'SUCCESS',
               gateway_order_id = $2,
               gateway_payment_id = $3,
               gateway_signature = $4,
               verified_at = $5,
               updated_at = $5
           WHERE id = $1`,
          [paymentOrderId, gatewayOrderId, gatewayPaymentId, gatewaySignature, verifiedAt]
        );
        await client.query(
          `INSERT INTO wallet_entries (id, user_id, type, status, amount, before_balance, after_balance, reference_id, note, created_at)
           VALUES ($1, $2, 'DEPOSIT', 'SUCCESS', $3, $4, $5, $6, $7, $8)`,
          [
            `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            existing.user_id,
            Number(existing.amount),
            currentBalance,
            nextBalance,
            gatewayPaymentId,
            `Razorpay payment ${gatewayPaymentId}`,
            verifiedAt
          ]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return findPaymentOrderById(paymentOrderId);
  }

  const db = getSqlite();
  db.exec("BEGIN");
  try {
    const existing = db
      .prepare(
        `SELECT id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, gateway_payment_id, gateway_signature, verified_at, redirect_url, created_at, updated_at
         FROM payment_orders
         WHERE id = ?
         LIMIT 1`
      )
      .get(paymentOrderId);
    if (!existing) {
      db.exec("ROLLBACK");
      return null;
    }
    if (existing.gateway_order_id && existing.gateway_order_id !== gatewayOrderId) {
      throw new Error("Gateway order mismatch");
    }
    if (existing.status !== "SUCCESS") {
      const currentBalance = Number(
        db
          .prepare(
            `SELECT COALESCE(
               (
                 SELECT after_balance
                 FROM wallet_entries
                 WHERE user_id = ?
                 ORDER BY created_at DESC, id DESC
                 LIMIT 1
               ),
               0
             ) AS balance`
          )
          .get(existing.user_id)?.balance ?? 0
      );
      const nextBalance = currentBalance + Number(existing.amount);
      db.prepare(
        `UPDATE payment_orders
         SET status = 'SUCCESS',
             gateway_order_id = ?,
             gateway_payment_id = ?,
             gateway_signature = ?,
             verified_at = ?,
             updated_at = ?
         WHERE id = ?`
      ).run(gatewayOrderId, gatewayPaymentId, gatewaySignature, verifiedAt, verifiedAt, paymentOrderId);
      db.prepare(
        `INSERT INTO wallet_entries (id, user_id, type, status, amount, before_balance, after_balance, reference_id, note, created_at)
         VALUES (?, ?, 'DEPOSIT', 'SUCCESS', ?, ?, ?, ?, ?, ?)`
      ).run(
        `wallet_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        existing.user_id,
        Number(existing.amount),
        currentBalance,
        nextBalance,
        gatewayPaymentId,
        `Razorpay payment ${gatewayPaymentId}`,
        verifiedAt
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return findPaymentOrderById(paymentOrderId);
}

export async function completePaymentLinkOrder({ reference, gatewayOrderId, gatewayPaymentId, gatewaySignature = "payment_link_webhook" }) {
  if (!reference) {
    return null;
  }

  const existingOrder = await findPaymentOrderByReference(reference);
  if (!existingOrder) {
    return null;
  }

  return completePaymentOrder({
    paymentOrderId: existingOrder.id,
    gatewayOrderId: gatewayOrderId || existingOrder.gatewayOrderId || `plink_${reference}`,
    gatewayPaymentId: gatewayPaymentId || existingOrder.gatewayPaymentId || `plinkpay_${reference}`,
    gatewaySignature
  });
}

export async function handlePaymentWebhook(reference, status) {
  if (isStandalonePostgresEnabled()) {
    const pool = getPgPool();
    const result = await pool.query(
      `UPDATE payment_orders
       SET status = $2, updated_at = $3
       WHERE reference = $1
       RETURNING id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, gateway_payment_id, gateway_signature, verified_at, redirect_url, created_at, updated_at`,
      [reference, status, nowIso()]
    );
    return mapPaymentOrderRow(result.rows[0]);
  }

  const db = getSqlite();
  db.prepare(`UPDATE payment_orders SET status = ?, updated_at = ? WHERE reference = ?`).run(status, nowIso(), reference);
  return mapPaymentOrderRow(
    db
      .prepare(
        `SELECT id, user_id, provider, amount, status, reference, checkout_token, gateway_order_id, gateway_payment_id, gateway_signature, verified_at, redirect_url, created_at, updated_at
         FROM payment_orders
         WHERE reference = ?
         LIMIT 1`
      )
      .get(reference)
  );
}

async function findWalletEntryById(entryId) {
  if (isStandalonePostgresEnabled()) {
    const pool = getPgPool();
    const result = await pool.query(
      `SELECT id, user_id, type, status, amount, before_balance, after_balance, reference_id, proof_url, note, created_at
         FROM wallet_entries
         WHERE id = $1
         LIMIT 1`,
      [entryId]
    );
    return mapWalletEntryRow(result.rows[0]);
  }

    return mapWalletEntryRow(
      getSqlite()
        .prepare(
          `SELECT id, user_id, type, status, amount, before_balance, after_balance, reference_id, proof_url, note, created_at
           FROM wallet_entries
           WHERE id = ?
           LIMIT 1`
        )
      .get(entryId)
  );
}

export async function findWalletEntryByReferenceId(userId, referenceId) {
  if (!referenceId) {
    return null;
  }

  if (isStandalonePostgresEnabled()) {
    const pool = getPgPool();
    const result = await pool.query(
      `SELECT id, user_id, type, status, amount, before_balance, after_balance, reference_id, proof_url, note, created_at
       FROM wallet_entries
       WHERE user_id = $1 AND reference_id = $2
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [userId, referenceId]
    );
    return mapWalletEntryRow(result.rows[0]);
  }

  return mapWalletEntryRow(
    getSqlite()
      .prepare(
        `SELECT id, user_id, type, status, amount, before_balance, after_balance, reference_id, proof_url, note, created_at
         FROM wallet_entries
         WHERE user_id = ? AND reference_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 1`
      )
      .get(userId, referenceId)
  );
}

async function updateWalletEntryStatus(entryId, status) {
  if (isStandalonePostgresEnabled()) {
    const pool = getPgPool();
    await pool.query(`UPDATE wallet_entries SET status = $1 WHERE id = $2`, [status, entryId]);
  } else {
    getSqlite().prepare(`UPDATE wallet_entries SET status = ? WHERE id = ?`).run(status, entryId);
  }

  return findWalletEntryById(entryId);
}

export async function updateWalletEntryAdmin(entryId, updates = {}) {
  const current = await findWalletEntryById(entryId);
  if (!current) {
    return null;
  }

  const nextStatus = String(updates.status ?? current.status).trim() || current.status;
  const nextReferenceId = String(updates.referenceId ?? current.referenceId ?? "").trim();
  const nextProofUrl = String(updates.proofUrl ?? current.proofUrl ?? "").trim();
  const nextNote = String(updates.note ?? current.note ?? "").trim();
  const nextBeforeBalance = Number.isFinite(Number(updates.beforeBalance))
    ? Number(updates.beforeBalance)
    : Number(current.beforeBalance ?? 0);
  const nextAfterBalance = Number.isFinite(Number(updates.afterBalance))
    ? Number(updates.afterBalance)
    : Number(current.afterBalance ?? 0);

  if (isStandalonePostgresEnabled()) {
    const pool = getPgPool();
    const result = await pool.query(
      `UPDATE wallet_entries
       SET status = $2,
           before_balance = $3,
           after_balance = $4,
           reference_id = $5,
           proof_url = $6,
           note = $7
       WHERE id = $1
       RETURNING id, user_id, type, status, amount, before_balance, after_balance, reference_id, proof_url, note, created_at`,
      [entryId, nextStatus, nextBeforeBalance, nextAfterBalance, nextReferenceId || null, nextProofUrl || null, nextNote || null]
    );
    return mapWalletEntryRow(result.rows[0]);
  }

  getSqlite()
    .prepare(
      `UPDATE wallet_entries
       SET status = ?, before_balance = ?, after_balance = ?, reference_id = ?, proof_url = ?, note = ?
       WHERE id = ?`
    )
    .run(nextStatus, nextBeforeBalance, nextAfterBalance, nextReferenceId || null, nextProofUrl || null, nextNote || null, entryId);

  return findWalletEntryById(entryId);
}

export async function getWalletApprovalRequests() {
  const filters = ["DEPOSIT", "WITHDRAW"];

  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT id, user_id, type, status, amount, before_balance, after_balance, reference_id, proof_url, note, created_at
         FROM wallet_entries
         WHERE (type = 'DEPOSIT' AND status = 'INITIATED')
            OR (type = 'WITHDRAW' AND status = ANY($1::text[]))
         ORDER BY created_at DESC, id DESC`,
      [["INITIATED", "BACKOFFICE"]]
    );
    return result.rows.map((row) => mapWalletEntryRow(row));
  }

    return getSqlite()
      .prepare(
        `SELECT id, user_id, type, status, amount, before_balance, after_balance, reference_id, proof_url, note, created_at
         FROM wallet_entries
         WHERE (type = ? AND status = ?)
            OR (type = ? AND status IN (?, ?))
         ORDER BY created_at DESC, id DESC`
    )
    .all("DEPOSIT", "INITIATED", "WITHDRAW", "INITIATED", "BACKOFFICE")
    .map((row) => mapWalletEntryRow(row));
}

export async function getWalletRequestHistory() {
  const filters = ["DEPOSIT", "WITHDRAW"];

  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT id, user_id, type, status, amount, before_balance, after_balance, reference_id, proof_url, note, created_at
         FROM wallet_entries
         WHERE type = ANY($1::text[])
         ORDER BY created_at DESC, id DESC`,
      [filters]
    );
    return result.rows.map((row) => mapWalletEntryRow(row));
  }

    return getSqlite()
      .prepare(
        `SELECT id, user_id, type, status, amount, before_balance, after_balance, reference_id, proof_url, note, created_at
         FROM wallet_entries
         WHERE type IN (?, ?)
         ORDER BY created_at DESC, id DESC`
    )
    .all(filters[0], filters[1])
    .map((row) => mapWalletEntryRow(row));
}

export async function getWalletAdminRequestItems({ history = false } = {}) {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const params = history ? [["DEPOSIT", "WITHDRAW"]] : [["INITIATED", "BACKOFFICE"]];
    const query = history
      ? `SELECT
           we.id,
           we.user_id,
           we.type,
           we.status,
           we.amount,
           we.before_balance,
           we.after_balance,
           we.reference_id,
           we.proof_url,
           we.note,
           we.created_at,
           u.phone AS user_phone,
           u.name AS user_name,
           u.approval_status AS user_approval_status,
           COALESCE(balance.after_balance, 0) AS live_balance,
           bank.id AS bank_id,
           bank.account_number AS bank_account_number,
           bank.holder_name AS bank_holder_name,
           bank.ifsc AS bank_ifsc,
           bank.created_at AS bank_created_at
         FROM wallet_entries we
         LEFT JOIN users u ON u.id = we.user_id
         LEFT JOIN LATERAL (
           SELECT after_balance
           FROM wallet_entries
           WHERE user_id = we.user_id
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         ) balance ON TRUE
         LEFT JOIN LATERAL (
           SELECT id, account_number, holder_name, ifsc, created_at
           FROM bank_accounts
           WHERE user_id = we.user_id
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         ) bank ON TRUE
         WHERE we.type = ANY($1::text[])
         ORDER BY we.created_at DESC, we.id DESC`
      : `SELECT
           we.id,
           we.user_id,
           we.type,
           we.status,
           we.amount,
           we.before_balance,
           we.after_balance,
           we.reference_id,
           we.proof_url,
           we.note,
           we.created_at,
           u.phone AS user_phone,
           u.name AS user_name,
           u.approval_status AS user_approval_status,
           COALESCE(balance.after_balance, 0) AS live_balance,
           bank.id AS bank_id,
           bank.account_number AS bank_account_number,
           bank.holder_name AS bank_holder_name,
           bank.ifsc AS bank_ifsc,
           bank.created_at AS bank_created_at
         FROM wallet_entries we
         LEFT JOIN users u ON u.id = we.user_id
         LEFT JOIN LATERAL (
           SELECT after_balance
           FROM wallet_entries
           WHERE user_id = we.user_id
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         ) balance ON TRUE
         LEFT JOIN LATERAL (
           SELECT id, account_number, holder_name, ifsc, created_at
           FROM bank_accounts
           WHERE user_id = we.user_id
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         ) bank ON TRUE
         WHERE (we.type = 'DEPOSIT' AND we.status = 'INITIATED')
            OR (we.type = 'WITHDRAW' AND we.status = ANY($1::text[]))
         ORDER BY we.created_at DESC, we.id DESC`;
    const result = await pool.query(query, params);
    return result.rows.map((row) => ({
      ...mapWalletEntryRow(row),
      user: row.user_phone || row.user_name || row.user_approval_status
        ? {
            id: row.user_id,
            phone: row.user_phone ?? "",
            name: row.user_name ?? "",
            approvalStatus: row.user_approval_status ?? "Approved"
          }
        : null,
      liveBalance: Number(row.live_balance ?? 0),
      primaryBankAccount: row.bank_id
        ? {
            id: row.bank_id,
            accountNumber: row.bank_account_number,
            holderName: row.bank_holder_name,
            ifsc: row.bank_ifsc,
            createdAt: toIso(row.bank_created_at)
          }
        : null,
      referenceId: row.reference_id ?? "",
      proofUrl: row.proof_url ?? "",
      note: row.note ?? ""
    }));
  }

  const sqlite = getSqlite();
  const query = history
    ? `SELECT
         we.id,
         we.user_id,
         we.type,
         we.status,
         we.amount,
         we.before_balance,
         we.after_balance,
         we.reference_id,
         we.proof_url,
         we.note,
         we.created_at,
         u.phone AS user_phone,
         u.name AS user_name,
         u.approval_status AS user_approval_status,
         COALESCE((
           SELECT after_balance
           FROM wallet_entries latest
           WHERE latest.user_id = we.user_id
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         ), 0) AS live_balance,
         (
           SELECT id
           FROM bank_accounts bank
           WHERE bank.user_id = we.user_id
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         ) AS bank_id,
         (
           SELECT account_number
           FROM bank_accounts bank
           WHERE bank.user_id = we.user_id
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         ) AS bank_account_number,
         (
           SELECT holder_name
           FROM bank_accounts bank
           WHERE bank.user_id = we.user_id
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         ) AS bank_holder_name,
         (
           SELECT ifsc
           FROM bank_accounts bank
           WHERE bank.user_id = we.user_id
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         ) AS bank_ifsc,
         (
           SELECT created_at
           FROM bank_accounts bank
           WHERE bank.user_id = we.user_id
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         ) AS bank_created_at
       FROM wallet_entries we
       LEFT JOIN users u ON u.id = we.user_id
       WHERE we.type IN (?, ?)
       ORDER BY we.created_at DESC, we.id DESC`
    : `SELECT
         we.id,
         we.user_id,
         we.type,
         we.status,
         we.amount,
         we.before_balance,
         we.after_balance,
         we.reference_id,
         we.proof_url,
         we.note,
         we.created_at,
         u.phone AS user_phone,
         u.name AS user_name,
         u.approval_status AS user_approval_status,
         COALESCE((
           SELECT after_balance
           FROM wallet_entries latest
           WHERE latest.user_id = we.user_id
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         ), 0) AS live_balance,
         (
           SELECT id
           FROM bank_accounts bank
           WHERE bank.user_id = we.user_id
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         ) AS bank_id,
         (
           SELECT account_number
           FROM bank_accounts bank
           WHERE bank.user_id = we.user_id
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         ) AS bank_account_number,
         (
           SELECT holder_name
           FROM bank_accounts bank
           WHERE bank.user_id = we.user_id
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         ) AS bank_holder_name,
         (
           SELECT ifsc
           FROM bank_accounts bank
           WHERE bank.user_id = we.user_id
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         ) AS bank_ifsc,
         (
           SELECT created_at
           FROM bank_accounts bank
           WHERE bank.user_id = we.user_id
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         ) AS bank_created_at
       FROM wallet_entries we
       LEFT JOIN users u ON u.id = we.user_id
       WHERE (we.type = ? AND we.status = ?)
          OR (we.type = ? AND we.status IN (?, ?))
       ORDER BY we.created_at DESC, we.id DESC`;
  const params = history
    ? ["DEPOSIT", "WITHDRAW"]
    : ["DEPOSIT", "INITIATED", "WITHDRAW", "INITIATED", "BACKOFFICE"];

  return sqlite
    .prepare(query)
    .all(...params)
    .map((row) => ({
      ...mapWalletEntryRow(row),
      user: row.user_phone || row.user_name || row.user_approval_status
        ? {
            id: row.user_id,
            phone: row.user_phone ?? "",
            name: row.user_name ?? "",
            approvalStatus: row.user_approval_status ?? "Approved"
          }
        : null,
      liveBalance: Number(row.live_balance ?? 0),
      primaryBankAccount: row.bank_id
        ? {
            id: row.bank_id,
            accountNumber: row.bank_account_number,
            holderName: row.bank_holder_name,
            ifsc: row.bank_ifsc,
            createdAt: toIso(row.bank_created_at)
          }
        : null,
      referenceId: row.reference_id ?? "",
      proofUrl: row.proof_url ?? "",
      note: row.note ?? ""
    }));
}

export async function resolveWalletApprovalRequest(entryId, action) {
  const request = await findWalletEntryById(entryId);
  if (!request || request.status !== "INITIATED" || !["DEPOSIT", "WITHDRAW"].includes(request.type)) {
    return null;
  }

  if (action === "reject") {
    return {
      request: await updateWalletEntryStatus(entryId, "REJECTED"),
      settlementEntry: null
    };
  }

  const beforeBalance = await getUserBalance(request.userId);
  if (request.type === "WITHDRAW" && request.amount > beforeBalance) {
    throw new Error("User has insufficient live balance for withdraw approval");
  }

  if (request.type === "DEPOSIT") {
    return {
      request: await updateWalletEntryAdmin(entryId, {
        status: "SUCCESS",
        beforeBalance,
        afterBalance: beforeBalance + request.amount
      }),
      settlementEntry: null
    };
  }

  return {
    request: await updateWalletEntryStatus(entryId, "BACKOFFICE"),
    settlementEntry: null
  };
}

export async function completeWalletRequest(entryId) {
  const request = await findWalletEntryById(entryId);
  if (!request || !["DEPOSIT", "WITHDRAW"].includes(request.type)) {
    return null;
  }

  if (request.status === "SUCCESS") {
    return request;
  }

  const beforeBalance = await getUserBalance(request.userId);
  if (request.type === "WITHDRAW" && request.amount > beforeBalance) {
    throw new Error("User has insufficient live balance for withdraw completion");
  }

  return updateWalletEntryAdmin(entryId, {
    status: "SUCCESS",
    beforeBalance,
    afterBalance: request.type === "DEPOSIT" ? beforeBalance + request.amount : beforeBalance - request.amount
  });
}

export async function rejectWalletRequest(entryId) {
  const request = await findWalletEntryById(entryId);
  if (!request || !["DEPOSIT", "WITHDRAW"].includes(request.type)) {
    return null;
  }

  if (!["INITIATED", "BACKOFFICE"].includes(String(request.status || ""))) {
    return null;
  }

  return updateWalletEntryAdmin(entryId, {
    status: "REJECTED",
    beforeBalance: request.beforeBalance ?? 0,
    afterBalance: request.afterBalance ?? request.beforeBalance ?? 0
  });
}

export async function updateUserApprovalStatus(userId, status) {
  const current = await findUserById(userId);
  if (!current) {
    return null;
  }

  const approvedAt = status === "Approved" ? nowIso() : null;
  const rejectedAt = status === "Rejected" ? nowIso() : null;
  const signupBonusGranted = status === "Approved" ? current.signupBonusGranted || true : current.signupBonusGranted;

  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    await pool.query(
      `UPDATE users
       SET approval_status = $1, approved_at = $2, rejected_at = $3, signup_bonus_granted = $4
       WHERE id = $5`,
      [status, approvedAt, rejectedAt, signupBonusGranted, userId]
    );
  } else {
    getSqlite()
      .prepare(
        `UPDATE users
         SET approval_status = ?, approved_at = ?, rejected_at = ?, signup_bonus_granted = ?
         WHERE id = ?`
      )
      .run(status, approvedAt, rejectedAt, signupBonusGranted ? 1 : 0, userId);
  }

  if (status === "Approved" && !current.signupBonusGranted) {
    const beforeBalance = await getUserBalance(userId);
    await addWalletEntry({
      userId,
      type: "SIGNUP_BONUS",
      status: "SUCCESS",
      amount: signupBonusAmount,
      beforeBalance,
      afterBalance: beforeBalance + signupBonusAmount
    });
  }

  return findUserById(userId);
}

export async function addAuditLog(entry) {
  const id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = nowIso();

  if (isStandalonePostgresEnabled()) {
    const pool = getPgPool();
    await pool.query(
      `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, entry.actorUserId, entry.action, entry.entityType, entry.entityId, entry.details, createdAt]
    );
  } else {
    getSqlite()
      .prepare(
        `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, entry.actorUserId, entry.action, entry.entityType, entry.entityId, entry.details, createdAt);
  }

  return { id, createdAt, ...entry };
}

export async function getAuditLogs(limit = 100) {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const result = await pool.query(
      `SELECT id, actor_user_id, action, entity_type, entity_id, details, created_at
       FROM audit_logs
       ORDER BY created_at DESC, id DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map((row) => mapAuditLogRow(row));
  }

  return getSqlite()
    .prepare(
      `SELECT id, actor_user_id, action, entity_type, entity_id, details, created_at
       FROM audit_logs
       ORDER BY created_at DESC, id DESC
       LIMIT ?`
    )
    .all(limit)
    .map((row) => mapAuditLogRow(row));
}

export async function getAdminSnapshot() {
  if (isStandalonePostgresEnabled()) {
    const pool = await getReadyPgPool();
    const [usersResult, sessionsResult, walletResult, bidsResult, marketsResult, devicesResult] = await Promise.all([
      pool.query(`SELECT id, phone, password_hash, mpin_hash, mpin_configured, name, joined_at, referral_code, role, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id FROM users ORDER BY joined_at DESC, id DESC`),
      pool.query(`SELECT token_hash, user_id, created_at FROM sessions ORDER BY created_at DESC, token_hash DESC`),
      pool.query(`SELECT id, user_id, type, status, amount, before_balance, after_balance, created_at FROM wallet_entries ORDER BY created_at DESC, id DESC`),
      pool.query(`SELECT id, user_id, market, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at FROM bids ORDER BY created_at DESC, id DESC`),
      pool.query(`SELECT id, slug, name, result, status, action, open_time, close_time, category FROM markets ORDER BY id ASC`),
      pool.query(`SELECT id, user_id, platform, token, enabled, created_at, updated_at FROM notification_devices ORDER BY created_at DESC, id DESC`)
    ]);

    return {
      users: usersResult.rows.map((row) => mapUserRow(row)),
      sessions: sessionsResult.rows.map((row) => ({ tokenHash: row.token_hash, userId: row.user_id, createdAt: toIso(row.created_at) })),
      walletEntries: walletResult.rows.map((row) => mapWalletEntryRow(row)),
      bids: bidsResult.rows.map((row) => mapBidRow(row)),
      markets: marketsResult.rows.map((row) => mapMarketRow(row)),
      notificationDevices: devicesResult.rows.map((row) => mapNotificationDeviceRow(row))
    };
  }

  const db = getSqlite();
  return {
    users: db
      .prepare(`SELECT id, phone, password_hash, mpin_hash, mpin_configured, name, joined_at, referral_code, role, approval_status, approved_at, rejected_at, blocked_at, deactivated_at, status_note, signup_bonus_granted, referred_by_user_id FROM users ORDER BY joined_at DESC, id DESC`)
      .all()
      .map((row) => mapUserRow(row)),
    sessions: db
      .prepare(`SELECT token_hash, user_id, created_at FROM sessions ORDER BY created_at DESC, token_hash DESC`)
      .all()
      .map((row) => ({ tokenHash: row.token_hash, userId: row.user_id, createdAt: toIso(row.created_at) })),
    walletEntries: db
      .prepare(`SELECT id, user_id, type, status, amount, before_balance, after_balance, created_at FROM wallet_entries ORDER BY created_at DESC, id DESC`)
      .all()
      .map((row) => mapWalletEntryRow(row)),
    bids: db
      .prepare(`SELECT id, user_id, market, board_label, game_type, session_type, digit, points, status, payout, settled_at, settled_result, created_at FROM bids ORDER BY created_at DESC, id DESC`)
      .all()
      .map((row) => mapBidRow(row)),
    markets: db
      .prepare(`SELECT id, slug, name, result, status, action, open_time, close_time, category FROM markets ORDER BY id ASC`)
      .all()
      .map((row) => mapMarketRow(row)),
    notificationDevices: db
      .prepare(`SELECT id, user_id, platform, token, enabled, created_at, updated_at FROM notification_devices ORDER BY created_at DESC, id DESC`)
      .all()
      .map((row) => mapNotificationDeviceRow(row))
  };
}

export { hashCredential, verifyCredential };
