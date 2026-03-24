import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

function parseCSV(raw: string): Record<string, string>[] {
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] ?? "").trim();
    });
    return row;
  });
}

function sanitizeJodi(value: string): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.length === 1 ? digits.padStart(2, "0") : digits.slice(-2);
  return /^\d{2}$/.test(normalized) ? normalized : null;
}

function collectJodis(row: Record<string, string>) {
  const values: string[] = [];
  for (const [key, value] of Object.entries(row)) {
    const lower = key.toLowerCase();
    if (["jodi", "open", "close", "morning", "day", "night", "result"].some((item) => lower.includes(item))) {
      const jodi = sanitizeJodi(value);
      if (jodi) values.push(jodi);
    }
  }
  return [...new Set(values)];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const market = (searchParams.get("market") || "sita").toLowerCase();
    const filePath = path.join(process.cwd(), "data", `${market}_chart_cleaned.csv`);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `CSV not found for market "${market}"` }, { status: 404 });
    }

    const rows = parseCSV(fs.readFileSync(filePath, "utf8"));
    const entries = rows.map((row) => collectJodis(row)).filter((row) => row.length > 0);

    if (entries.length === 0) {
      return NextResponse.json({ error: `No usable jodi data found for market "${market}"` }, { status: 422 });
    }

    const freq: Record<string, number> = {};
    const recentFreq: Record<string, number> = {};
    const recent = entries.slice(-7).flat();

    entries.flat().forEach((jodi) => {
      freq[jodi] = (freq[jodi] || 0) + 1;
    });

    recent.forEach((jodi) => {
      recentFreq[jodi] = (recentFreq[jodi] || 0) + 1;
    });

    const GH10 = Object.entries(freq)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([jodi]) => jodi);

    const RH5 = Object.entries(recentFreq)
      .filter(([jodi]) => !GH10.includes(jodi))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([jodi]) => jodi);

    const B5 = Object.entries(freq)
      .filter(([jodi]) => !recent.includes(jodi) && !GH10.includes(jodi) && !RH5.includes(jodi))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([jodi]) => jodi);

    const final20 = [...new Set([...GH10, ...RH5, ...B5])].slice(0, 20);

    return NextResponse.json({ GH10, RH5, B5, final20 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
