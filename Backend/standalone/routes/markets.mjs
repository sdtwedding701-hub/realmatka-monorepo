import { findMarketBySlug, getChartRecord, getChartRecordsForMarkets } from "../stores/market-store.mjs";
import { corsPreflight, fail, ok } from "../http.mjs";
import { getDecoratedMarketBySlug, getMarketListSnapshot } from "../services/market-snapshot-service.mjs";

export function options(request) {
  return corsPreflight(request);
}

function parseResult(result) {
  const parts = String(result ?? "").trim().split("-");
  return {
    openPanna: /^[0-9]{3}$/.test(parts[0] ?? "") ? parts[0] : "",
    jodi: /^[0-9]{2}$/.test(parts[1] ?? "") ? parts[1] : "",
    closePanna: /^[0-9]{3}$/.test(parts[2] ?? "") ? parts[2] : ""
  };
}

function getWeekStart(date) {
  const value = new Date(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  value.setHours(0, 0, 0, 0);
  return value;
}

function formatChartDay(date) {
  const value = new Date(date);
  const month = value.toLocaleDateString("en-US", { month: "short" });
  const day = String(value.getDate()).padStart(2, "0");
  return `${month} ${day}`;
}

function getWeekChartLabel(date) {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.getFullYear()} ${formatChartDay(start)} to ${formatChartDay(end)}`;
}

function getWeekdayIndex(date) {
  const day = new Date(date).getDay();
  return day === 0 ? 6 : day - 1;
}

function normalizeWeekLabel(label) {
  return String(label ?? "").trim().replace(/\s+/g, " ");
}

function packPannaCell(open, close) {
  const normalizedOpen = String(open ?? "").trim();
  const normalizedClose = String(close ?? "").trim();
  if (normalizedOpen && normalizedClose) {
    return `${normalizedOpen}/${normalizedClose}`;
  }
  return normalizedOpen || normalizedClose || "";
}

function isPlaceholderChartCell(value) {
  const normalized = String(value ?? "").trim();
  return !normalized || normalized === "--" || normalized === "---" || normalized === "**" || normalized === "***";
}

function hasMeaningfulChartValue(value) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return false;
  }
  if (/^[0-9]{2}$/.test(normalized)) {
    return true;
  }
  if (/^[0-9]{3}-[0-9]{2}-[0-9]{3}$/.test(normalized)) {
    return true;
  }
  if (/^[0-9]{3}\/[0-9]{3}$/.test(normalized)) {
    return true;
  }
  return !isPlaceholderChartCell(normalized);
}

function filterEmptyChartRows(rows) {
  return (Array.isArray(rows) ? rows : []).filter((row) =>
    Array.isArray(row) && row.slice(1).some((cell) => hasMeaningfulChartValue(cell))
  );
}

function sortChartRowsChronologically(rows) {
  return [...(Array.isArray(rows) ? rows : [])].sort((left, right) => {
    const leftDate = parseWeekLabelStartDate(left?.[0]);
    const rightDate = parseWeekLabelStartDate(right?.[0]);
    const leftTime = leftDate ? leftDate.getTime() : Number.MAX_SAFE_INTEGER;
    const rightTime = rightDate ? rightDate.getTime() : Number.MAX_SAFE_INTEGER;
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return String(left?.[0] ?? "").localeCompare(String(right?.[0] ?? ""));
  });
}

function parseWeekLabelStartDate(label) {
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

function ensureCurrentWeekChartRow(chartType, rows, date = new Date()) {
  const currentWeekLabel = normalizeWeekLabel(getWeekChartLabel(date));
  const rowSize = chartType === "panna" ? 15 : 8;
  const placeholder = chartType === "panna" ? "---" : "--";
  const normalizedRows = (Array.isArray(rows) ? rows : []).map((row) => {
    const nextRow = Array.isArray(row) ? row.slice(0, rowSize).map((cell) => String(cell ?? "").trim()) : [];
    const label = normalizeWeekLabel(nextRow[0] || "");
    const normalized = [label || currentWeekLabel, ...nextRow.slice(1)];
    while (normalized.length < rowSize) {
      normalized.push(placeholder);
    }
    return normalized;
  });

  if (!normalizedRows.some((row) => normalizeWeekLabel(row?.[0]) === currentWeekLabel)) {
    normalizedRows.push([currentWeekLabel, ...Array.from({ length: rowSize - 1 }, () => placeholder)]);
  }

  return sortChartRowsChronologically(normalizedRows);
}

function getNonEmptyRows(rows) {
  return (Array.isArray(rows) ? rows : []).filter((row) =>
    Array.isArray(row) && row.length > 1 && String(row[0] ?? "").trim()
  );
}

function isValidJodiCell(value) {
  const normalized = String(value ?? "").trim();
  return /^[0-9]{2}$/.test(normalized) || normalized === "--" || normalized === "**";
}

function isValidPannaCell(value) {
  const normalized = String(value ?? "").trim();
  return (
    /^[0-9]{3}\/[0-9]{3}$/.test(normalized) ||
    /^[0-9]{3}-[0-9]{2}-[0-9]{3}$/.test(normalized) ||
    /^[0-9]{3}\/[0-9]\*\*$/.test(normalized) ||
    normalized === "---" ||
    normalized === "***"
  );
}

function isStructurallyValidChartRow(chartType, row) {
  if (!Array.isArray(row) || row.length < 2) {
    return false;
  }

  const label = String(row[0] ?? "").trim();
  if (!label) {
    return false;
  }

  const cells = row.slice(1).map((value) => String(value ?? "").trim());
  if (chartType === "jodi") {
    return cells.length >= 7 && cells.slice(0, 7).every(isValidJodiCell);
  }

  if (cells.length >= 7 && cells.slice(0, 7).every(isValidPannaCell)) {
    return true;
  }

  return cells.length >= 14 && cells.slice(0, 14).every((value) => /^[0-9]{3}$/.test(value) || value === "---");
}

function getStructuredChartRows(chartType, rows) {
  return (Array.isArray(rows) ? rows : []).filter((row) => isStructurallyValidChartRow(chartType, row));
}

function getStoredChartRows(chartType, rows) {
  const structuredRows = getStructuredChartRows(chartType, rows);
  const meaningfulRows = filterEmptyChartRows(structuredRows);
  if (meaningfulRows.length > 0) {
    return meaningfulRows;
  }
  if (structuredRows.length > 0) {
    return structuredRows;
  }
  return getNonEmptyRows(rows);
}

function getPreferredChartRows(chartType, rows) {
  const storedRows = getStoredChartRows(chartType, rows);
  if (storedRows.length > 0) {
    return storedRows;
  }

  return buildEmptyChartRows(chartType);
}

function formatPannaRowsForResponse(rows, market) {
  const parsed = parseResult(market?.result);
  const currentWeekLabel = normalizeWeekLabel(getWeekChartLabel(new Date()));
  const currentDayIndex = getWeekdayIndex(new Date());
  const sourceRows = ensureCurrentWeekChartRow("panna", rows);

  const formattedRows = sourceRows.map((row, rowIndex) => {
    const label = String(row?.[0] ?? `Week ${rowIndex + 1}`).trim();
    const normalizedRow = Array.isArray(row) ? row.map((cell) => String(cell ?? "").trim()) : [];

    if (normalizedRow.length === 8) {
      const nextRow = normalizedRow.slice(0, 8);
      if (
        normalizeWeekLabel(label) === currentWeekLabel &&
        parsed.openPanna &&
        parsed.jodi &&
        parsed.closePanna
      ) {
        nextRow[currentDayIndex + 1] = `${parsed.openPanna}-${parsed.jodi}-${parsed.closePanna}`;
      }
      return nextRow;
    }

    const nextRow = [label];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const open = normalizedRow[1 + dayIndex * 2] ?? "";
      const close = normalizedRow[2 + dayIndex * 2] ?? "";
      const isCurrentMarketCell = normalizeWeekLabel(label) === currentWeekLabel && dayIndex === currentDayIndex;
      if (isCurrentMarketCell && parsed.openPanna && parsed.jodi && parsed.closePanna) {
        nextRow.push(`${parsed.openPanna}-${parsed.jodi}-${parsed.closePanna}`);
      } else {
        nextRow.push(packPannaCell(open, close));
      }
    }
    return nextRow;
  });

  const usableRows = getNonEmptyRows(formattedRows);
  return usableRows.length > 0 ? usableRows : buildEmptyChartRows("panna");
}

function normalizeChartBatchTypes(value) {
  return Array.from(
    new Set(
      String(value || "jodi,panna")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter((item) => item === "jodi" || item === "panna")
    )
  );
}

function buildEmptyChartRows(chartType, weeks = 8) {
  const rowSize = chartType === "panna" ? 15 : 8;
  const placeholder = chartType === "panna" ? "---" : "--";
  const rows = [];

  for (let index = 0; index < weeks; index += 1) {
    const date = new Date();
    date.setDate(date.getDate() - index * 7);
    rows.push([
      getWeekChartLabel(date),
      ...Array.from({ length: rowSize - 1 }, () => placeholder)
    ]);
  }

  return rows.reverse();
}

export async function list(request) {
  return ok(await getMarketListSnapshot(), request);
}

export async function chartBatch(request) {
  const url = new URL(request.url);
  const marketSlugs = Array.from(
    new Set(
      String(url.searchParams.get("markets") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, 12);
  const chartTypes = normalizeChartBatchTypes(url.searchParams.get("types"));

  if (!marketSlugs.length) {
    return fail("markets query is required", 400, request);
  }
  if (!chartTypes.length) {
    return fail("At least one valid chart type is required", 400, request);
  }

  const [charts, markets] = await Promise.all([
    getChartRecordsForMarkets(marketSlugs, chartTypes),
    Promise.all(marketSlugs.map((slug) => findMarketBySlug(slug)))
  ]);

  const marketMap = new Map(
    markets
      .filter(Boolean)
      .map((market) => [market.slug, market])
  );

  const chartMap = new Map(charts.map((item) => [`${item.marketSlug}:${item.chartType}`, item]));
  const items = [];

  for (const marketSlug of marketSlugs) {
    for (const chartType of chartTypes) {
      const chart =
        chartMap.get(`${marketSlug}:${chartType}`) ?? {
          marketSlug,
          chartType,
          rows: buildEmptyChartRows(chartType)
        };

      if (chartType === "panna") {
        const preferredRows = getPreferredChartRows("panna", chart.rows);
        items.push({
          ...chart,
          rows: formatPannaRowsForResponse(
            preferredRows.length ? preferredRows : buildEmptyChartRows("panna"),
            marketMap.get(marketSlug) ?? null
          )
        });
        continue;
      }

      const preferredRows = getPreferredChartRows("jodi", chart.rows);
      items.push({
        ...chart,
        rows: ensureCurrentWeekChartRow("jodi", preferredRows.length ? preferredRows : buildEmptyChartRows("jodi"))
      });
    }
  }

  return ok({
    items,
    markets: marketSlugs,
    types: chartTypes
  }, request);
}

export async function detail(request, params) {
  const market = await getDecoratedMarketBySlug(params.slug);
  if (!market) {
    return fail("Market not found", 404, request);
  }
  return ok(market, request);
}

export async function chart(request, params) {
  const url = new URL(request.url);
  const chartType = url.searchParams.get("type") === "panna" ? "panna" : "jodi";
  const market = await findMarketBySlug(params.slug);
  if (!market) {
    return fail("Market not found", 404, request);
  }

  const storedChart = await getChartRecord(params.slug, chartType);
  const chart = storedChart ?? {
    marketSlug: params.slug,
    chartType,
    rows: buildEmptyChartRows(chartType)
  };

  const preferredRows = getPreferredChartRows(chartType, chart.rows);

  if (chartType === "panna") {
    return ok(
      {
        ...chart,
        rows: formatPannaRowsForResponse(preferredRows.length ? preferredRows : buildEmptyChartRows("panna"), market)
      },
      request
    );
  }

  return ok(
    {
      ...chart,
      rows: ensureCurrentWeekChartRow("jodi", preferredRows.length ? preferredRows : buildEmptyChartRows("jodi"))
    },
    request
  );
}
