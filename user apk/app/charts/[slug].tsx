import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader, AppScreen, SurfaceCard } from "@/components/ui";
import { api } from "@/lib/api";
import { getCachedChart, setCachedChart } from "@/lib/content-cache";
import { colors } from "@/theme/colors";

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

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export default function ChartDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ slug: string; chartType?: string; label?: string }>();
  const title = params.label ?? (params.slug ?? "chart").split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  const chartType = params.chartType === "panna" ? "panna" : "jodi";
  const [chart, setChart] = useState<ChartPayload | null>(() => (params.slug ? getCachedChart(String(params.slug), chartType) : null));
  const [loading, setLoading] = useState(() => !(params.slug && getCachedChart(String(params.slug), chartType)));
  const [error, setError] = useState("");
  const [showAllRows, setShowAllRows] = useState(false);
  const pageScrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!params.slug) {
      return;
    }
    setShowAllRows(false);
    const cachedChart = getCachedChart(String(params.slug), chartType);
    if (cachedChart) {
      setChart(cachedChart);
      setLoading(false);
      void load(false);
      return;
    }
    void load(true);
  }, [params.slug, chartType]);

  const rawRows = useMemo(() => chart?.rows ?? [], [chart]);
  const recentRawRows = useMemo(() => rawRows.slice(-26), [rawRows]);
  const olderRawRows = useMemo(() => rawRows.slice(0, Math.max(rawRows.length - 26, 0)), [rawRows]);
  const visibleRawRows = showAllRows ? rawRows : recentRawRows;
  const jodiRows = useMemo(() => normalizeJodiRows(visibleRawRows), [visibleRawRows]);
  const pannaRows = useMemo(() => normalizePannaRows(visibleRawRows), [visibleRawRows]);
  const chartBottomPadding = Platform.OS === "web" ? Math.max(insets.bottom + 104, 104) : Math.max(insets.bottom + 24, 24);

  return (
    <View style={styles.page}>
      <AppHeader title="Charts" subtitle={undefined} />
      <AppScreen bottomInsetMinPadding={0} bottomInsetOffset={0} padded={false} scroll={false} showPromo={false}>
        <ScrollView
          ref={pageScrollRef}
          contentContainerStyle={[styles.screenContent, { paddingBottom: chartBottomPadding }]}
          style={styles.scrollView}
        >
        <Text style={styles.title}>{title.toUpperCase()}</Text>
        <View style={styles.topActions}>
          {!showAllRows && olderRawRows.length > 0 ? (
            <Pressable onPress={() => setShowAllRows(true)} style={[styles.topActionButton, styles.secondaryTopAction]}>
              <Text style={[styles.topActionText, styles.secondaryTopActionText]}>View Full Chart</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => pageScrollRef.current?.scrollToEnd({ animated: true })} style={styles.topActionButton}>
              <Text style={styles.topActionText}>Go to Bottom</Text>
            </Pressable>
          )}

          {showAllRows ? (
            <Pressable onPress={() => setShowAllRows(false)} style={styles.topActionButton}>
              <Text style={styles.topActionText}>Back To Latest</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => pageScrollRef.current?.scrollToEnd({ animated: true })} style={[styles.topActionButton, styles.secondaryTopAction]}>
              <Text style={[styles.topActionText, styles.secondaryTopActionText]}>Go to Bottom</Text>
            </Pressable>
          )}
        </View>

        <SurfaceCard style={styles.chartSurface}>
          <View style={styles.chartCard}>
          {loading ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : chartType === "jodi" ? (
              <View>
                <View style={styles.jodiHeaderRow}>
                  {WEEK_DAYS.map((day) => (
                    <Text key={day} style={[styles.jodiHeaderCell, styles.jodiCell]}>
                      {day}
                    </Text>
                  ))}
                </View>
                {jodiRows.map((row, rowIndex) => (
                  <View key={`jodi-${rowIndex}`} style={styles.jodiDataRow}>
                    {row.map((cell, cellIndex) => (
                      <View key={`jodi-${rowIndex}-${cellIndex}`} style={styles.jodiCellWrap}>
                        <Text style={[styles.jodiCell, highlightCell(cell) && styles.highlightCell]}>{cell}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
          ) : (
              <View>
                <View style={styles.pannaHeaderRow}>
                  <Text style={[styles.pannaDateHeader, styles.pannaDateCell]}>Date</Text>
                  {WEEK_DAYS.map((day) => (
                    <Text key={day} style={[styles.pannaHeaderCell, styles.pannaDayCell]}>
                      {day}
                    </Text>
                  ))}
                </View>
                {pannaRows.map((row, rowIndex) => {
                  const dateBlock = buildDateBlock(row.label);
                  return (
                    <View key={`panna-${rowIndex}`} style={styles.pannaDataRow}>
                      <View style={[styles.pannaDateWrap, styles.pannaDateCell]}>
                        <Text style={styles.dateYear}>{dateBlock.year}</Text>
                        <Text style={styles.dateLine}>{dateBlock.start}</Text>
                        <Text style={styles.dateLine}>{dateBlock.end}</Text>
                      </View>
                      {row.cells.map((cell, cellIndex) => (
                        <View key={`panna-${rowIndex}-${cellIndex}`} style={[styles.pannaDayWrap, styles.pannaDayCell]}>
                          <Text style={styles.pannaTop}>{cell.open}</Text>
                          <Text style={[styles.pannaMiddle, highlightCell(cell.jodi) && styles.highlightCell]}>{cell.jodi}</Text>
                          <Text style={styles.pannaBottom}>{cell.close}</Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
          )}
          </View>
        </SurfaceCard>

        <View style={styles.bottomActions}>
          <Pressable onPress={() => router.back()} style={[styles.jumpButton, styles.secondaryActionButton]}>
            <Text style={[styles.jumpButtonText, styles.secondaryActionText]}>Go Back</Text>
          </Pressable>
          <Pressable
            onPress={() => pageScrollRef.current?.scrollTo({ animated: true, y: 0 })}
            style={[styles.jumpButton, styles.topButton]}
          >
            <Text style={styles.jumpButtonText}>Go to Top</Text>
          </Pressable>
        </View>
        </ScrollView>
      </AppScreen>
    </View>
  );

  async function load(showLoader = true) {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError("");
      const payload = await api.getChart(String(params.slug), chartType);
      setChart(payload);
      setCachedChart(String(params.slug), chartType, payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load chart");
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }
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

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  scrollView: {
    flex: 1
  },
  screenContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 16
  },
  title: { color: "#111827", textAlign: "center", fontSize: 22, fontWeight: "900" },
  topActions: {
    flexDirection: "row",
    gap: 10
  },
  topActionButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: "#273caa",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12
  },
  secondaryTopAction: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary
  },
  topActionText: {
    color: colors.surface,
    fontWeight: "800",
    textAlign: "center"
  },
  secondaryTopActionText: {
    color: colors.primary
  },
  jumpButton: {
    alignSelf: "center",
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: "#273caa",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  jumpButtonText: {
    color: colors.surface,
    fontWeight: "800"
  },
  bottomActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    marginBottom: 2
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary
  },
  secondaryActionText: {
    color: colors.primary
  },
  topButton: {
    flex: 1,
    marginTop: 0,
    marginBottom: 0
  },
  previewButton: {
    alignSelf: "center",
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  previewButtonText: {
    color: colors.primary,
    fontWeight: "800"
  },
  chartSurface: {
    padding: 0
  },
  chartCard: {
    gap: 0,
    paddingHorizontal: 0
  },
  jodiHeaderRow: { flexDirection: "row" },
  jodiDataRow: { flexDirection: "row" },
  jodiCellWrap: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
    backgroundColor: colors.surface
  },
  jodiCell: {
    flex: 1,
    minHeight: 38,
    paddingVertical: 6,
    paddingHorizontal: 0,
    color: "#111827",
    textAlign: "center",
    fontSize: 9,
    fontWeight: "700",
    textAlignVertical: "center"
  },
  jodiHeaderCell: {
    color: "#1f2937",
    fontWeight: "800",
    backgroundColor: "#f8fafc"
  },
  pannaHeaderRow: {
    flexDirection: "row"
  },
  pannaDataRow: {
    flexDirection: "row"
  },
  pannaDateCell: {
    width: 38
  },
  pannaDayCell: {
    flex: 1
  },
  pannaDateHeader: {
    minHeight: 38,
    paddingHorizontal: 2,
    paddingVertical: 7,
    textAlign: "center",
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    fontSize: 9,
    fontWeight: "800",
    borderWidth: 0.5,
    borderColor: "#e5e7eb"
  },
  pannaHeaderCell: {
    minHeight: 38,
    paddingHorizontal: 1,
    paddingVertical: 7,
    textAlign: "center",
    color: "#1f2937",
    backgroundColor: "#f8fafc",
    fontSize: 8,
    fontWeight: "800",
    borderWidth: 0.5,
    borderColor: "#e5e7eb"
  },
  pannaDateWrap: {
    minHeight: 68,
    paddingHorizontal: 1,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
    backgroundColor: "#f3f4f6"
  },
  dateYear: {
    color: "#6b7280",
    fontSize: 8,
    fontWeight: "700"
  },
  dateLine: {
    color: "#111827",
    fontSize: 8,
    fontWeight: "700"
  },
  pannaDayWrap: {
    flex: 1,
    minHeight: 68,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
    backgroundColor: colors.surface,
    gap: 1
  },
  pannaTop: {
    color: "#98a2b3",
    fontSize: 8,
    fontWeight: "700"
  },
  pannaMiddle: {
    color: "#111827",
    fontSize: 9,
    fontWeight: "900"
  },
  pannaBottom: {
    color: "#98a2b3",
    fontSize: 8,
    fontWeight: "700"
  },
  highlightCell: { color: "#ef4444" },
  errorText: { color: "#dc2626", textAlign: "center", fontWeight: "600" }
});
