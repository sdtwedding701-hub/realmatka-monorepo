import Link from "next/link";
import { chartMarkets } from "@/lib/market-links";

type ChartType = "jodi" | "panna";

type ChartPayload = {
  marketSlug: string;
  chartType: ChartType;
  rows: string[][];
};

type LiveMarket = {
  slug: string;
  name?: string;
  result?: string;
  open?: string;
  close?: string;
};

type PannaCell = {
  open: string;
  jodi: string;
  close: string;
};

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.realmatka.in").replace(/\/$/, "");
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function getChartMarket(slug: string) {
  return chartMarkets.find((market) => market.slug === slug);
}

export function getChartMarketLabel(slug: string) {
  return getChartMarket(slug)?.label ?? slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export async function ChartRecordPage({ slug, chartType }: { slug: string; chartType: ChartType }) {
  const marketLabel = getChartMarketLabel(slug);
  const upperLabel = marketLabel.toUpperCase();
  const chartLabel = chartType === "panna" ? "Panel Chart" : "Jodi Chart";
  const chartRecordLabel = chartType === "panna" ? "PANEL CHART RECORD" : "JODI CHART RECORD";
  const keywordText = buildKeywordText(marketLabel, chartType);
  const faqItems = buildFaqItems(marketLabel, chartType);
  const structuredData = buildStructuredData(slug, marketLabel, chartType, faqItems);
  const [chart, market] = await Promise.all([fetchChart(slug, chartType), fetchMarket(slug)]);
  const rows = chartType === "panna" ? normalizePannaRows(chart?.rows ?? []) : normalizeJodiRows(chart?.rows ?? []);
  const hasRows = rows.length > 0;
  const currentResult = String(market?.result || "***-**-***").trim() || "***-**-***";
  const marketTiming = `${String(market?.open || getChartMarket(slug)?.open || "--:--").trim()} - ${String(market?.close || getChartMarket(slug)?.close || "--:--").trim()}`;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07101d_0%,#08111f_36%,#060a14_100%)] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-5 px-2 py-4 sm:px-4 sm:py-6 xl:px-5">
        <section className="px-2 py-3 text-center sm:px-3 sm:py-4">
          <div className="flex flex-col items-center gap-4">
            <img src="/header-logo.png" alt="Real Matka" className="h-12 w-auto object-contain sm:h-16" />
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">{chartRecordLabel}</div>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl">
                {upperLabel} {chartRecordLabel} MATKA BAZAR
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
                {upperLabel} {chartLabel} satta matka record old history, daily result, bracket, open close chart aur online live market details yahan dekho.
              </p>
              <p className="mx-auto mt-4 max-w-5xl text-xs leading-6 text-slate-400 sm:text-sm sm:leading-7">
                {keywordText}
              </p>
              <div className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-orange-200 sm:text-sm">
                Result {currentResult} | Time {marketTiming}
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href={`/jodi-chart-record/${slug}`} className={chartType === "jodi" ? "action-primary" : "action-secondary"}>
                Jodi Chart Record
              </Link>
              <Link href={`/panel-chart-record/${slug}`} className={chartType === "panna" ? "action-primary" : "action-secondary"}>
                Panel Chart Record
              </Link>
              <Link href={`/charts/${slug}?type=${chartType}&label=${encodeURIComponent(marketLabel)}`} className="action-secondary">
                Live Chart
              </Link>
            </div>
          </div>
        </section>

        <section className="overflow-hidden px-1 py-2 sm:px-2 sm:py-3">
          {!hasRows ? (
            <div className="py-12 text-center text-slate-300">Chart data abhi available nahi hai. Thoda baad retry karo.</div>
          ) : null}

          {hasRows && chartType === "jodi" ? (
            <div className="overflow-hidden">
              <table className="w-full table-fixed border-collapse text-center">
                <thead>
                  <tr>
                    <th className="w-[86px] border border-white/10 bg-white/5 px-1 py-2 text-[10px] font-extrabold text-slate-100 sm:w-[140px] sm:px-3 sm:py-3 sm:text-[13px]">
                      Date
                    </th>
                    {WEEK_DAYS.map((day) => (
                      <th key={day} className="border border-white/10 bg-white/5 px-1 py-2 text-[10px] font-extrabold text-slate-100 sm:px-3 sm:py-3 sm:text-[13px]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(rows as { label: string; cells: string[] }[]).map((row, rowIndex) => (
                    <tr key={`jodi-${row.label}-${rowIndex}`}>
                      <td className="border border-white/10 bg-white/[0.04] px-1 py-2 text-[9px] font-bold leading-tight text-slate-200 sm:px-3 sm:py-3 sm:text-[12px]">
                        {compactWeekLabel(row.label)}
                      </td>
                      {row.cells.map((cell, cellIndex) => (
                        <td key={`jodi-${rowIndex}-${cellIndex}`} className="border border-white/10 px-1 py-2 text-[11px] font-extrabold leading-none text-slate-100 sm:px-3 sm:py-3 sm:text-[14px]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {hasRows && chartType === "panna" ? (
            <div className="overflow-hidden">
              <table className="w-full table-fixed border-collapse text-center">
                <thead>
                  <tr>
                    <th className="w-[72px] border border-white/10 bg-white/5 px-1 py-2 text-[10px] font-extrabold text-slate-100 sm:w-[140px] sm:px-3 sm:py-3 sm:text-[13px]">
                      Date
                    </th>
                    {WEEK_DAYS.map((day) => (
                      <th key={day} className="border border-white/10 bg-white/5 px-1 py-2 text-[9px] font-extrabold text-slate-100 sm:px-3 sm:py-3 sm:text-[13px]">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(rows as { label: string; cells: PannaCell[] }[]).map((row, rowIndex) => (
                    <tr key={`panna-${row.label}-${rowIndex}`}>
                      <td className="border border-white/10 bg-white/[0.04] px-1 py-2 text-[9px] font-bold leading-tight text-slate-200 sm:px-3 sm:py-3 sm:text-[12px]">
                        {compactWeekLabel(row.label)}
                      </td>
                      {row.cells.map((cell, cellIndex) => (
                        <td key={`panna-${rowIndex}-${cellIndex}`} className="border border-white/10 px-1 py-2 sm:px-3 sm:py-3">
                          <div className="text-[8px] font-bold leading-tight text-slate-400 sm:text-[12px]">{cell.open}</div>
                          <div className="text-[11px] font-extrabold leading-none text-slate-100 sm:text-[14px]">{cell.jodi}</div>
                          <div className="text-[8px] font-bold leading-tight text-slate-400 sm:text-[12px]">{cell.close}</div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/matka-chart" className="action-secondary">All Matka Charts</Link>
            <Link href="/jodi-chart" className="action-secondary">Jodi Chart</Link>
            <Link href="/panna-chart" className="action-secondary">Panna Chart</Link>
          </div>

          <section className="mx-auto mt-6 max-w-5xl border border-white/10 bg-white/[0.03] px-5 py-6 text-left sm:px-7">
            <h2 className="text-2xl font-extrabold text-slate-100">
              {upperLabel} {chartLabel} records on Real Matka
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
              Real Matka par {marketLabel} {chartLabel.toLowerCase()} records ko clean aur mobile-friendly format me
              rakha gaya hai. Is section ka purpose users ko {marketLabel} old history, weekly chart, result movement,
              open close reference aur market timing ek hi jagah par samajhne me help karna hai.
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
              {marketLabel} {chartType === "panna" ? "panel chart records" : "jodi chart records"} trend review ke liye
              useful hote hain, kyunki users previous weeks ke numbers, current result aur market-wise movement ko
              compare kar sakte hain. Real Matka is data ko simple table layout me show karta hai taki small mobile screen
              par bhi chart easily read ho.
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base">
              Yahan diya gaya {marketLabel} chart record informational reference ke liye hai. Result, jodi, panel, pana
              patti, final ank aur bracket related searches ke liye dedicated page structure banaya gaya hai, jisse users
              direct {marketLabel} {chartLabel.toLowerCase()} page open kar saken.
            </p>

            <h2 className="mt-7 text-2xl font-extrabold text-slate-100">
              Frequently Asked Questions for {marketLabel} {chartLabel}
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {faqItems.map((item) => (
                <article key={item.question} className="border border-white/10 bg-black/10 px-4 py-4">
                  <h3 className="text-base font-extrabold text-slate-100">{item.question}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{item.answer}</p>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function buildKeywordText(marketLabel: string, chartType: ChartType) {
  if (chartType === "panna") {
    return [
      `Real Matka ${marketLabel} panel chart`,
      `${marketLabel} panel chart`,
      `old ${marketLabel} panel chart`,
      `${marketLabel} pana patti chart`,
      `${marketLabel} panel record`,
      `${marketLabel} panel chart 2015`,
      `${marketLabel} panel chart 2012`,
      `${marketLabel} panel chart 2012 to 2026`,
      `${marketLabel} final ank`,
      `${marketLabel} panel chart matka`,
      `${marketLabel} panel chart book`,
      `${marketLabel} matka chart`,
      `matka panel chart ${marketLabel}`,
      `satta ${marketLabel} chart panel`,
      `${marketLabel} chart result`,
      "satta chart",
      "satta matka panel chart",
      `${marketLabel} matka panel chart`
    ].join(", ");
  }

  return [
    `Real Matka ${marketLabel} jodi chart`,
    `${marketLabel} jodi chart`,
    `old ${marketLabel} jodi chart`,
    `${marketLabel} jodi chart record`,
    `${marketLabel} jodi record`,
    `${marketLabel} jodi chart 2015`,
    `${marketLabel} jodi chart 2012`,
    `${marketLabel} jodi chart 2012 to 2026`,
    `${marketLabel} final ank`,
    `${marketLabel} jodi chart matka`,
    `${marketLabel} matka chart`,
    `matka jodi chart ${marketLabel}`,
    `satta ${marketLabel} chart jodi`,
    `${marketLabel} chart result`,
    "satta chart",
    "satta matka jodi chart",
    `${marketLabel} matka jodi chart`
  ].join(", ");
}

function buildFaqItems(marketLabel: string, chartType: ChartType) {
  const chartLabel = chartType === "panna" ? "Panel Chart" : "Jodi Chart";
  const recordLabel = chartType === "panna" ? "panel records" : "jodi records";
  return [
    {
      question: `How often are ${marketLabel} ${chartLabel} records updated?`,
      answer: `Real Matka updates ${marketLabel} ${recordLabel} regularly with market result and chart history data so users can review recent weekly movement.`
    },
    {
      question: `Is the ${marketLabel} ${chartLabel} page mobile friendly?`,
      answer: `Yes, the ${marketLabel} ${chartLabel} page is designed for mobile users with compact table spacing and direct access to related jodi, panel and matka chart pages.`
    },
    {
      question: `What can users check in ${marketLabel} ${chartLabel}?`,
      answer: `Users can check ${marketLabel} old history, weekly record, result movement, open close reference, final ank related details and market timing.`
    },
    {
      question: `Does ${marketLabel} ${chartLabel} guarantee future results?`,
      answer: `No. ${marketLabel} ${chartLabel} is only an informational record and trend reference. It should not be treated as a guaranteed future result.`
    }
  ];
}

function buildStructuredData(slug: string, marketLabel: string, chartType: ChartType, faqItems: ReturnType<typeof buildFaqItems>) {
  const chartLabel = chartType === "panna" ? "Panel Chart Record" : "Jodi Chart Record";
  const path = chartType === "panna" ? `/panel-chart-record/${slug}` : `/jodi-chart-record/${slug}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://realmatka.in/"
        },
        {
          "@type": "ListItem",
          position: 2,
          name: `${marketLabel} ${chartLabel}`,
          item: `https://realmatka.in${path}`
        }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer
        }
      }))
    }
  ];
}

async function fetchChart(slug: string, chartType: ChartType): Promise<ChartPayload | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/charts/${encodeURIComponent(slug)}?type=${chartType}`, {
      next: { revalidate: 60 }
    });
    const payload = await response.json();
    return response.ok && payload?.ok ? payload.data as ChartPayload : null;
  } catch {
    return null;
  }
}

async function fetchMarket(slug: string): Promise<LiveMarket | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/markets/list`, {
      next: { revalidate: 60 }
    });
    const payload = await response.json() as { data?: LiveMarket[] };
    return Array.isArray(payload?.data) ? payload.data.find((item) => item.slug === slug) ?? null : null;
  } catch {
    return null;
  }
}

function normalizeJodiRows(rows: string[][]) {
  return rows
    .filter((row) => hasMeaningfulRow(row))
    .map((row, index) => {
      const label = String(row[0] ?? `Week ${index + 1}`).trim();
      const cells = row.slice(1, 8).map(normalizeJodiValue);
      while (cells.length < 7) cells.push("--");
      return { label, cells };
    });
}

function normalizePannaRows(rows: string[][]) {
  return rows
    .filter((row) => hasMeaningfulRow(row))
    .map((row, index) => {
      const label = String(row[0] ?? `Week ${index + 1}`).trim();
      const rawCells = row.slice(1).map((value) => String(value ?? "").trim());
      const cells: PannaCell[] = [];
      for (let cellIndex = 0; cellIndex < 7; cellIndex += 1) {
        cells.push(parsePannaCellValue(rawCells[cellIndex]));
      }
      return { label, cells };
    });
}

function hasMeaningfulRow(row: string[]) {
  return Array.isArray(row) && row.slice(1).some((cell) => {
    const value = String(cell ?? "").trim();
    return value && value !== "--" && value !== "---" && value !== "**" && value !== "***";
  });
}

function normalizeJodiValue(value: string) {
  const cleaned = String(value ?? "").trim();
  if (/^[0-9]{2,3}$/.test(cleaned)) return cleaned.slice(-2);
  if (/^[0-9]\*$/.test(cleaned)) return cleaned;
  return "--";
}

function parsePannaCellValue(value: string | undefined): PannaCell {
  const cleaned = String(value ?? "").trim();
  const full = cleaned.match(/^([0-9]{3})[-\s/]([0-9]{2})[-\s/]([0-9]{3})$/);
  if (full) {
    return { open: full[1], jodi: full[2], close: full[3] };
  }
  return { open: "---", jodi: normalizeJodiValue(cleaned), close: "---" };
}

function compactWeekLabel(label: string) {
  return String(label ?? "")
    .replace(/\s+to\s+/i, "\n")
    .replace(/\bJan\b/g, "JAN")
    .replace(/\bFeb\b/g, "FEB")
    .replace(/\bMar\b/g, "MAR")
    .replace(/\bApr\b/g, "APR")
    .replace(/\bMay\b/g, "MAY")
    .replace(/\bJun\b/g, "JUN")
    .replace(/\bJul\b/g, "JUL")
    .replace(/\bAug\b/g, "AUG")
    .replace(/\bSep\b/g, "SEP")
    .replace(/\bOct\b/g, "OCT")
    .replace(/\bNov\b/g, "NOV")
    .replace(/\bDec\b/g, "DEC")
    .split("\n")
    .map((line) => line.trim())
    .join(" - ");
}
