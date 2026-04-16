import { findMarketBySlug, getChartRecord, listMarkets } from "../db.mjs";
import { corsPreflight, fail, ok } from "../http.mjs";

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

function isPlaceholderResult(result) {
  return !String(result ?? "").trim() || String(result ?? "").trim() === "***-**-***";
}

function packPannaCell(open, close) {
  const normalizedOpen = String(open ?? "").trim();
  const normalizedClose = String(close ?? "").trim();
  if (normalizedOpen && normalizedClose) {
    return `${normalizedOpen}/${normalizedClose}`;
  }
  return normalizedOpen || normalizedClose || "";
}

function formatPannaRowsForResponse(rows, market) {
  const parsed = parseResult(market?.result);
  const currentWeekLabel = normalizeWeekLabel(getWeekChartLabel(new Date()));
  const currentDayIndex = getWeekdayIndex(new Date());

  return (Array.isArray(rows) ? rows : []).map((row, rowIndex) => {
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
}

function getCurrentChartRow(rows) {
  const label = normalizeWeekLabel(getWeekChartLabel(new Date()));
  return (Array.isArray(rows) ? rows : []).find((row) => normalizeWeekLabel(row?.[0]) === label) ?? null;
}

function deriveTodayResultFromCharts(market, jodiChart, pannaChart) {
  if (!isPlaceholderResult(market?.result)) {
    return String(market.result).trim();
  }

  const currentDayIndex = getWeekdayIndex(new Date());
  const jodiRow = getCurrentChartRow(jodiChart?.rows);
  const pannaRow = getCurrentChartRow(pannaChart?.rows);
  if (!jodiRow || !pannaRow) {
    return String(market?.result ?? "").trim();
  }

  const jodi = String(jodiRow[currentDayIndex + 1] ?? "").trim();
  const openPanna = String(pannaRow[1 + currentDayIndex * 2] ?? "").trim();
  const closePanna = String(pannaRow[2 + currentDayIndex * 2] ?? "").trim();

  if (/^[0-9]{3}$/.test(openPanna) && /^[0-9*]{2}$/.test(jodi) && /^[0-9]{3}$/.test(closePanna)) {
    return `${openPanna}-${jodi}-${closePanna}`;
  }
  if (/^[0-9]{3}$/.test(openPanna) && /^[0-9*]{2}$/.test(jodi)) {
    return `${openPanna}-${jodi}-***`;
  }

  return String(market?.result ?? "").trim();
}

async function decorateMarketWithTodayResult(market) {
  if (!market || !isPlaceholderResult(market.result)) {
    return market;
  }

  const [jodiChart, pannaChart] = await Promise.all([
    getChartRecord(market.slug, "jodi"),
    getChartRecord(market.slug, "panna")
  ]);

  return {
    ...market,
    result: deriveTodayResultFromCharts(market, jodiChart, pannaChart)
  };
}

export async function list(request) {
  const markets = await listMarkets();
  return ok(await Promise.all(markets.map((market) => decorateMarketWithTodayResult(market))), request);
}

export async function detail(request, params) {
  const market = await findMarketBySlug(params.slug);
  if (!market) {
    return fail("Market not found", 404, request);
  }
  return ok(await decorateMarketWithTodayResult(market), request);
}

export async function chart(request, params) {
  const chartType = new URL(request.url).searchParams.get("type") === "panna" ? "panna" : "jodi";
  const market = await findMarketBySlug(params.slug);
  if (!market) {
    return fail("Market not found", 404, request);
  }
  const chart = await getChartRecord(params.slug, chartType);
  if (!chart) {
    return fail("Chart not found", 404, request);
  }
  if (chartType === "panna") {
    return ok({ ...chart, rows: formatPannaRowsForResponse(chart.rows, market) }, request);
  }
  return ok(chart, request);
}
