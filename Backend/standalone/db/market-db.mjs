import { isStandalonePostgresEnabled } from "../config.mjs";
import {
  __internalGetPgPool,
  __internalGetReadyPgPool,
  __internalGetSqlite,
  __internalToIso
} from "../db.mjs";

function toChartRows(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return JSON.parse(value);
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
    if (!Array.isArray(sourceRow) || sourceRow.length === 0) continue;
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

function parseClockTimeToMinutes(value) {
  if (typeof value !== "string") return Number.MAX_SAFE_INTEGER;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) return Number.MAX_SAFE_INTEGER;
  let hours = Number(match[1]) % 12;
  const minutes = Number(match[2]);
  if (match[3].toUpperCase() === "PM") hours += 12;
  return hours * 60 + minutes;
}

function sortMarketsByOpenTime(markets) {
  return [...markets].sort((left, right) => {
    const openDiff = parseClockTimeToMinutes(left.open) - parseClockTimeToMinutes(right.open);
    if (openDiff !== 0) return openDiff;
    const closeDiff = parseClockTimeToMinutes(left.close) - parseClockTimeToMinutes(right.close);
    if (closeDiff !== 0) return closeDiff;
    return left.name.localeCompare(right.name);
  });
}

export async function listMarkets() {
  if (isStandalonePostgresEnabled()) {
    const pool = await __internalGetReadyPgPool();
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
      resultLockedAt: __internalToIso(row.result_locked_at),
      resultLockedByUserId: row.result_locked_by_user_id ?? null
    })));
  }

  const rows = __internalGetSqlite()
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
    const pool = await __internalGetReadyPgPool();
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

  const row = __internalGetSqlite()
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

export async function getChartRecordsForMarkets(slugs, chartTypes = ["jodi", "panna"]) {
  const normalizedSlugs = Array.from(new Set((Array.isArray(slugs) ? slugs : []).map((value) => String(value ?? "").trim()).filter(Boolean)));
  const normalizedChartTypes = Array.from(new Set((Array.isArray(chartTypes) ? chartTypes : []).map((value) => String(value ?? "").trim()).filter(Boolean)));
  if (!normalizedSlugs.length || !normalizedChartTypes.length) return [];

  if (isStandalonePostgresEnabled()) {
    const pool = await __internalGetReadyPgPool();
    const result = await pool.query(
      `SELECT market_slug, chart_type, rows_json
       FROM charts
       WHERE market_slug = ANY($1::text[]) AND chart_type = ANY($2::text[])`,
      [normalizedSlugs, normalizedChartTypes]
    );
    return result.rows.map((row) => ({
      marketSlug: row.market_slug,
      chartType: row.chart_type,
      rows: normalizeChartRowsForStorage(row.chart_type, toChartRows(row.rows_json))
    }));
  }

  const slugPlaceholders = normalizedSlugs.map(() => "?").join(", ");
  const chartTypePlaceholders = normalizedChartTypes.map(() => "?").join(", ");
  const rows = __internalGetSqlite()
    .prepare(
      `SELECT market_slug, chart_type, rows_json
       FROM charts
       WHERE market_slug IN (${slugPlaceholders}) AND chart_type IN (${chartTypePlaceholders})`
    )
    .all(...normalizedSlugs, ...normalizedChartTypes);

  return rows.map((row) => ({
    marketSlug: row.market_slug,
    chartType: row.chart_type,
    rows: normalizeChartRowsForStorage(row.chart_type, toChartRows(row.rows_json))
  }));
}

export async function upsertChartRecord(marketSlug, chartType, rows) {
  const normalizedRows = normalizeChartRowsForStorage(chartType, rows);
  if (isStandalonePostgresEnabled()) {
    const pool = await __internalGetReadyPgPool();
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

  const db = __internalGetSqlite();
  db.prepare(
    `INSERT INTO charts (market_slug, chart_type, rows_json)
     VALUES (?, ?, ?)
     ON CONFLICT(market_slug, chart_type) DO UPDATE SET rows_json = excluded.rows_json`
  ).run(marketSlug, chartType, JSON.stringify(normalizedRows));

  return getChartRecord(marketSlug, chartType);
}

export async function updateMarketRecord(slug, updates) {
  const current = await findMarketBySlug(slug);
  if (!current) return null;

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
    const pool = __internalGetPgPool();
    await pool.query(
      `UPDATE markets
       SET result = $1, status = $2, action = $3, open_time = $4, close_time = $5, category = $6, result_locked_at = $7, result_locked_by_user_id = $8
       WHERE slug = $9`,
      [next.result, next.status, next.action, next.open, next.close, next.category, next.resultLockedAt, next.resultLockedByUserId, slug]
    );
  } else {
    __internalGetSqlite()
      .prepare(
        `UPDATE markets
         SET result = ?, status = ?, action = ?, open_time = ?, close_time = ?, category = ?, result_locked_at = ?, result_locked_by_user_id = ?
         WHERE slug = ?`
      )
      .run(next.result, next.status, next.action, next.open, next.close, next.category, next.resultLockedAt, next.resultLockedByUserId, slug);
  }

  return findMarketBySlug(slug);
}
