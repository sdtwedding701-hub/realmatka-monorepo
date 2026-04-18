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

function formatPannaRowsForResponse(rows, market) {
  const parsed = parseResult(market?.result);
  const currentWeekLabel = normalizeWeekLabel(getWeekChartLabel(new Date()));
  const currentDayIndex = getWeekdayIndex(new Date());

  const formattedRows = (Array.isArray(rows) ? rows : []).map((row, rowIndex) => {
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

  return filterEmptyChartRows(formattedRows);
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

  const items = charts.map((chart) => {
    if (chart.chartType === "panna") {
      return {
        ...chart,
        rows: formatPannaRowsForResponse(chart.rows, marketMap.get(chart.marketSlug) ?? null)
      };
    }
    return {
      ...chart,
      rows: filterEmptyChartRows(chart.rows)
    };
  });

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
  const chartType = new URL(request.url).searchParams.get("type") === "panna" ? "panna" : "jodi";
  const market = await findMarketBySlug(params.slug);
  if (!market) {
    return fail("Market not found", 404, request);
  }
  const chart = (await getChartRecord(params.slug, chartType)) ?? {
    marketSlug: params.slug,
    chartType,
    rows: buildEmptyChartRows(chartType)
  };
  if (chartType === "panna") {
    return ok({ ...chart, rows: formatPannaRowsForResponse(chart.rows, market) }, request);
  }
  return ok({ ...chart, rows: filterEmptyChartRows(chart.rows) }, request);
}
