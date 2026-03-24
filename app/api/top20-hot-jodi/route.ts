import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

/** ---------- CSV Helpers ---------- */

/** Clean/simple CSV parse (comma-separated, no quotes handling). */
function parseCSV(raw: string): Record<string, string>[] {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => (row[h] = (cells[idx] ?? "").trim()));
    out.push(row);
  }
  return out;
}

/** जौड़ी normalize: "8" → "08", "04" ok, strictly 00-99 */
function sanitizeJodi(s: string): string | null {
  const only = (s || "").toString().trim().replace(/\D/g, "");
  if (!only) return null;
  const two = only.length === 1 ? only.padStart(2, "0") : only.slice(-2);
  return /^\d{2}$/.test(two) ? two : null;
}

/** किसी row से सभी संभावित जौड़ी/सेशन वैल्यू उठा लो (unique) */
function collectJodisFromRow(row: Record<string, any>): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(row)) {
    const key = k.toLowerCase();
    if (
      ["jodi", "open", "close", "morning", "day", "night", "result"].some((x) =>
        key.includes(x)
      )
    ) {
      const val = sanitizeJodi(String(v ?? ""));
      if (val) out.push(val);
    }
  }
  return [...new Set(out)];
}

/** Frequency sort (desc by count, then by key) */
function freqSorted(map: Map<string, number>): string[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([j]) => j);
}

/** midnight normalize (so we can compare dates safely) */
function atMidnight(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Row date parse from common columns */
function parseRowDate(row: Record<string, string>): Date | null {
  const dateCols = ["date", "dt", "day", "Day", "Date"];
  for (const c of dateCols) {
    const raw = row[c];
    if (raw && String(raw).trim()) {
      const d = new Date(String(raw).trim());
      if (!Number.isNaN(d.getTime())) return atMidnight(d);
    }
  }
  return null;
}

/** ---------- Main Handler ---------- */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const market = (searchParams.get("market") || "sita").toLowerCase();
    const dateStr = searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const target = atMidnight(new Date(dateStr));

    // CSV path (project root /data/<market>_chart_cleaned.csv)
    const file = path.join(process.cwd(), "data", `${market}_chart_cleaned.csv`);
    if (!fs.existsSync(file)) {
      return NextResponse.json(
        {
          predictions: [],
          matched: false,
          matchedSessions: [],
          actualOfDate: null,
          info: [],
          error: `CSV not found for market "${market}". Expected at: ${file}`,
        },
        { status: 404 }
      );
    }

    const csvRaw = fs.readFileSync(file, "utf8");
    const rows = parseCSV(csvRaw);

    // Parse/attach dates
    const parsed = rows
      .map((r) => {
        const d = parseRowDate(r);
        return d ? { ...r, __date: d } : null;
      })
      .filter(Boolean) as Array<Record<string, any> & { __date: Date }>;

    // कोई usable row ही नहीं
    if (parsed.length === 0) {
      return NextResponse.json(
        {
          predictions: [],
          matched: false,
          matchedSessions: [],
          actualOfDate: null,
          info: [],
          error: `No parsable rows in CSV for market "${market}".`,
        },
        { status: 422 }
      );
    }

    // अगर target दिन का row मौजूद ही नहीं है → error (जैसा तुमने बोला)
    const actualRow =
      parsed.find((r) => r.__date.getTime() === target.getTime()) || null;
    if (!actualRow) {
      return NextResponse.json(
        {
          predictions: [],
          matched: false,
          matchedSessions: [],
          actualOfDate: null,
          info: [],
          error: `इस तारीख (${dateStr}) का data update नहीं किया गया है। कृपया CSV अपडेट करें।`,
        },
        { status: 409 }
      );
    }

    // History & last7 (target से strictly पहले)
    const history = parsed.filter((r) => r.__date < target);
    if (history.length === 0) {
      return NextResponse.json(
        {
          predictions: [],
          matched: false,
          matchedSessions: [],
          actualOfDate: null,
          info: [],
          error:
            "Not enough history before selected date. कम से कम 1 दिन का past data चाहिए।",
        },
        { status: 422 }
      );
    }

    const last7start = new Date(target.getTime() - 7 * 86400000);
    const last7 = parsed.filter((r) => r.__date >= last7start && r.__date < target);

    // Build frequencies
    const histFreq = new Map<string, number>();
    const last7Freq = new Map<string, number>();

    for (const r of history) {
      for (const j of collectJodisFromRow(r)) {
        histFreq.set(j, (histFreq.get(j) || 0) + 1);
      }
    }
    for (const r of last7) {
      for (const j of collectJodisFromRow(r)) {
        last7Freq.set(j, (last7Freq.get(j) || 0) + 1);
      }
    }

    /** ---------- Balanced Top20 Logic ----------
     * GH10 monopoly रोकने के लिए quota:
     * - GH10: max 7
     * - RH5:  max 7  (recent hot in last 7 days, excluding GH10)
     * - B5:   max 6  (absent in last 7 days, but historically strong, excluding GH10/RH5)
     * फिर कम पड़े तो बची लिस्ट से fill कर दें।
     */

    // First: candidate pools a bit bigger so rotation possible
    const ghCand = freqSorted(histFreq).slice(0, 15);
    const rhCand = freqSorted(
      new Map([...histFreq.entries()].filter(([j]) => !ghCand.includes(j)))
    ).filter((j) => (last7Freq.get(j) || 0) > 0); // recently hot
    const bCand = freqSorted(
      new Map(
        [...histFreq.entries()].filter(
          ([j]) => (last7Freq.get(j) || 0) === 0 && !ghCand.includes(j) && !rhCand.includes(j)
        )
      )
    );

    const gh10 = ghCand.slice(0, 10); // informational (Top of history)
    const rh5 = rhCand.slice(0, 10);  // informational (recent hot)
    const b5  = bCand.slice(0, 10);   // informational (bounce candidates)

    const finalSet: string[] = [];
    const pushUnique = (j: string, limit: number) => {
      if (finalSet.length >= limit) return;
      if (!finalSet.includes(j)) finalSet.push(j);
    };

    gh10.slice(0, 7).forEach((j) => pushUnique(j, 20));
    rh5.slice(0, 7).forEach((j) => pushUnique(j, 20));
    b5.slice(0, 6).forEach((j) => pushUnique(j, 20));

    // Fill if still < 20 (mix of remaining pools)
    const remainder = [...ghCand, ...rhCand, ...bCand].filter((j) => !finalSet.includes(j));
    for (const j of remainder) {
      if (finalSet.length >= 20) break;
      finalSet.push(j);
    }

    // Label for badges
    const labeled = finalSet.slice(0, 20).map((j) => ({
      jodi: j,
      set: gh10.includes(j) ? ("GH10" as const) : rh5.includes(j) ? ("RH5" as const) : ("B5" as const),
    }));

    const predictions = labeled.map((x) => x.jodi);

    // actualOfDate (for the selected target date)
    let actualOfDate: Record<string, string | null> | null = null;
    let matched = false;
    const matchedSessions: string[] = [];

    if (actualRow) {
      const sessionCols = Object.keys(actualRow).filter((k) =>
        ["jodi", "open", "close", "morning", "day", "night", "result"].some((x) =>
          k.toLowerCase().includes(x)
        )
      );
      actualOfDate = {};
      for (const c of sessionCols) {
        const val = sanitizeJodi(String((actualRow as any)[c] ?? ""));
        actualOfDate[c] = val;
        if (val && predictions.includes(val)) {
          matched = true;
          matchedSessions.push(c);
        }
      }
      if (Object.keys(actualOfDate).length === 0) actualOfDate = null;
    }

    const info = [
      `Market: ${market}`,
      `Date: ${dateStr}`,
      `GH10 (hist top): ${gh10.join(", ")}`,
      `RH5 (recent): ${rh5.join(", ")}`,
      `B5 (bounce): ${b5.join(", ")}`,
      `Final(20): ${finalSet.slice(0, 20).join(", ")}`,
    ];

    return NextResponse.json({
      predictions,
      labeled,
      matched,
      matchedSessions,
      actualOfDate,
      info,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        predictions: [],
        matched: false,
        matchedSessions: [],
        actualOfDate: null,
        info: [],
        error: e?.message || "Internal error",
      },
      { status: 500 }
    );
  }
}
