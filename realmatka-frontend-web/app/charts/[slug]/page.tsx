"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ChartPayload = {
  marketSlug: string;
  chartType: "jodi" | "panna";
  rows: string[][];
};

type PannaCell = {
  open: string;
  jodi: string;
  close: string;
};

type PannaRow = {
  label: string;
  cells: PannaCell[];
};

const API_BASE_URL = "https://realmatka-backend.onrender.com";
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export default function PublicChartPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams?: { type?: string; label?: string };
}) {
  const chartType = searchParams?.type === "panna" ? "panna" : "jodi";
  const label = searchParams?.label ?? params.slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  const upperLabel = label.toUpperCase();
  const [chart, setChart] = useState<ChartPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadChart() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_BASE_URL}/api/charts/${params.slug}?type=${chartType}`, {
          cache: "no-store"
        });
        const payload = await response.json();
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error ?? "Unable to load chart");
        }
        if (active) {
          setChart(payload.data as ChartPayload);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load chart");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadChart();
    return () => {
      active = false;
    };
  }, [params.slug, chartType]);

  const jodiRows = useMemo(() => normalizeJodiRows(chart?.rows ?? []), [chart]);
  const pannaRows = useMemo(() => normalizePannaRows(chart?.rows ?? []), [chart]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#07101d_0%,#08111f_36%,#060a14_100%)] text-white">
      <main className="mx-auto flex w-full max-w-[1620px] flex-col gap-6 px-3 py-6 sm:px-5 sm:py-8 xl:px-6">
        <section className="section-shell px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="metric-pill">{chartType === "panna" ? "Panna Chart" : "Jodi Chart"}</div>
              <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">{upperLabel}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                {chartType === "panna"
                  ? `${upperLabel} Panel Chart Patti Panna Panel Pana Single Double Triple Patta Record Old History Historical Data Results Old Chart Online Live Book`
                  : `${upperLabel} Jodi Chart Satta Matka Record Old History Historical Data Bracket Results Chart Online Live Book Digits Numbers`}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/charts/${params.slug}?type=jodi&label=${encodeURIComponent(label)}`} className={chartType === "jodi" ? "action-primary" : "action-secondary"}>
                Jodi Chart
              </Link>
              <Link href={`/charts/${params.slug}?type=panna&label=${encodeURIComponent(label)}`} className={chartType === "panna" ? "action-primary" : "action-secondary"}>
                Panna Chart
              </Link>
              <Link href="/#markets" className="action-secondary">
                Back to Markets
              </Link>
            </div>
          </div>
        </section>

        <section className="section-shell overflow-hidden px-3 py-4 sm:px-5 sm:py-5">
          <div className="mb-5 flex justify-center">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
              className="action-secondary"
            >
              Go to Bottom
            </button>
          </div>
          {loading ? <div className="py-12 text-center text-slate-300">Loading chart...</div> : null}
          {!loading && error ? <div className="py-12 text-center font-semibold text-rose-300">{error}</div> : null}

          {!loading && !error && chartType === "jodi" ? (
            <div className="overflow-x-auto rounded-[22px] border border-white/10 bg-white/[0.02]">
              <table className="w-full min-w-[720px] border-collapse text-center">
                <thead>
                  <tr>
                    {WEEK_DAYS.map((day) => (
                      <th key={day} className="border border-white/10 bg-white/5 px-3 py-3 text-[13px] font-extrabold text-slate-100">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jodiRows.map((row, rowIndex) => (
                    <tr key={`jodi-${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <td key={`jodi-${rowIndex}-${cellIndex}`} className="border border-white/10 px-3 py-3 text-[14px] font-extrabold text-slate-100">
                          <span className={highlightCell(cell) ? "text-rose-300" : undefined}>{cell}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {!loading && !error && chartType === "panna" ? (
            <div className="overflow-x-auto rounded-[22px] border border-white/10 bg-white/[0.02]">
              <table className="w-full min-w-[980px] border-collapse text-center">
                <thead>
                  <tr>
                    <th className="border border-white/10 bg-white/5 px-3 py-3 text-[13px] font-extrabold text-slate-100">Date</th>
                    {WEEK_DAYS.map((day) => (
                      <th key={day} className="border border-white/10 bg-white/5 px-3 py-3 text-[13px] font-extrabold text-slate-100">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pannaRows.map((row, rowIndex) => {
                    const dateBlock = buildDateBlock(row.label);
                    return (
                      <tr key={`panna-${rowIndex}`}>
                        <td className="border border-white/10 bg-white/[0.04] px-3 py-3 text-slate-200">
                          <div className="text-[12px] font-bold text-slate-400">{dateBlock.year}</div>
                          <div className="text-[13px] font-bold text-slate-100">{dateBlock.start}</div>
                          <div className="text-[13px] font-bold text-slate-100">{dateBlock.end}</div>
                        </td>
                        {row.cells.map((cell, cellIndex) => (
                          <td key={`panna-${rowIndex}-${cellIndex}`} className="border border-white/10 px-3 py-3">
                            <div className={`text-[12px] font-bold ${highlightCell(cell.jodi) ? "text-rose-300" : "text-slate-400"}`}>{cell.open}</div>
                            <div className={`text-[14px] font-extrabold ${highlightCell(cell.jodi) ? "text-rose-300" : "text-slate-100"}`}>{cell.jodi}</div>
                            <div className={`text-[12px] font-bold ${highlightCell(cell.jodi) ? "text-rose-300" : "text-slate-400"}`}>{cell.close}</div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          {!loading && !error ? (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="action-secondary"
              >
                Go to Top
              </button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function normalizeJodiRows(rows: string[][]) {
  return rows.map((row) => {
    const values = row.length >= 8 ? row.slice(1) : row;
    const trimmed = values.slice(0, 7).map((value) => normalizeJodiValue(value));
    while (trimmed.length < 7) {
      trimmed.push("--");
    }
    return trimmed;
  });
}

function normalizePannaRows(rows: string[][]): PannaRow[] {
  return rows.map((row, index) => {
    const label = String(row[0] ?? `Week ${index + 1}`);
    const rawCells = row.slice(1).map((value) => String(value ?? "").trim());
    const hasPackedCells = rawCells.length >= 7 && rawCells.slice(0, 7).some((value) => value.includes("/") || /^[0-9]{3}[-\s/][0-9]{2}[-\s/][0-9]{3}$/.test(value));
    const cells: PannaCell[] = [];

    if (hasPackedCells) {
      for (let cellIndex = 0; cellIndex < 7; cellIndex += 1) {
        cells.push(parsePannaCellValue(rawCells[cellIndex]));
      }
      return { label, cells };
    }

    const values = rawCells.filter(Boolean);
    for (let cellIndex = 0; cellIndex < 7; cellIndex += 1) {
      const open = normalizePannaValue(values[cellIndex * 2]);
      const rawClose = String(values[cellIndex * 2 + 1] ?? "").trim();
      const close = normalizePannaValue(rawClose);
      cells.push({
        open,
        jodi: deriveJodi(open, rawClose || close),
        close: /^[0-9]\*\*$/.test(rawClose) ? "***" : close
      });
    }

    return { label, cells };
  });
}

function normalizeJodiValue(value: string) {
  const cleaned = String(value ?? "").trim();
  if (/^[0-9]{2,3}$/.test(cleaned)) return cleaned.slice(-2);
  if (/^[0-9]\*$/.test(cleaned)) return cleaned;
  return "--";
}

function normalizePannaValue(value: string | undefined) {
  const cleaned = String(value ?? "").trim();
  return /^[0-9]{3}$/.test(cleaned) ? cleaned : "---";
}

function deriveOpenStageJodi(close: string) {
  return /^[0-9]\*\*$/.test(close) ? `${close[0]}*` : "--";
}

function deriveJodi(open: string, close: string) {
  if (!/^[0-9]{3}$/.test(open) || !/^[0-9]{3}$/.test(close)) {
    return deriveOpenStageJodi(close);
  }
  return `${sumDigits(open) % 10}${sumDigits(close) % 10}`;
}

function parsePannaCellValue(value: string | undefined): PannaCell {
  const cleaned = String(value ?? "").trim();
  const full = cleaned.match(/^([0-9]{3})[-\s/]([0-9]{2})[-\s/]([0-9]{3})$/);
  if (full) {
    return { open: full[1], jodi: full[2], close: full[3] };
  }

  const pair = cleaned.match(/^([0-9]{3})[\/\s-]([0-9]{3})$/);
  if (pair) {
    const open = normalizePannaValue(pair[1]);
    const close = normalizePannaValue(pair[2]);
    return { open, jodi: deriveJodi(open, close), close };
  }

  const partial = cleaned.match(/^([0-9]{3})[\/\s-]([0-9])\*\*$/);
  if (partial) {
    return { open: partial[1], jodi: `${partial[2]}*`, close: "***" };
  }

  if (cleaned === "***") {
    return { open: "---", jodi: "--", close: "---" };
  }

  const single = normalizePannaValue(cleaned);
  return { open: single, jodi: "--", close: "---" };
}

function sumDigits(value: string) {
  return value.split("").reduce((total, digit) => total + Number(digit), 0);
}

function buildDateBlock(label: string) {
  const weekMatch = label.trim().match(/^(\d{4})\s+([A-Za-z]{3}\s+\d{2})\s+to\s+([A-Za-z]{3}\s+\d{2})$/);
  if (weekMatch) {
    return {
      year: weekMatch[1],
      start: weekMatch[2],
      end: weekMatch[3]
    };
  }

  const shortMatch = label.trim().match(/^(\d{2})-([A-Za-z]{3})$/);
  if (shortMatch) {
    return {
      year: String(new Date().getFullYear()),
      start: `${shortMatch[2]} ${shortMatch[1]}`,
      end: "--"
    };
  }

  return {
    year: "",
    start: label,
    end: "--"
  };
}

function highlightCell(value: string) {
  return ["77", "88", "72", "05", "00", "49", "***", "**", "16", "50"].some((token) => value.includes(token));
}
