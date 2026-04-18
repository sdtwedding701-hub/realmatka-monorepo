import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppHeader, AppScreen } from "@/components/ui";
import { api, formatApiError } from "@/lib/api";
import { getCachedChart, getCachedMarkets, setCachedChart, setCachedMarkets } from "@/lib/content-cache";
import { colors } from "@/theme/colors";

type MarketItem = {
  id: string;
  slug: string;
  name: string;
  result: string;
  status: string;
  action: string;
  open: string;
  close: string;
  category: "starline" | "games" | "jackpot";
};

export default function ChartsScreen() {
  const [markets, setMarkets] = useState<MarketItem[]>(() => getCachedMarkets() ?? []);
  const [loading, setLoading] = useState(() => !getCachedMarkets());
  const [error, setError] = useState("");

  useEffect(() => {
    void load(!getCachedMarkets());
  }, []);

  useEffect(() => {
    if (!markets.length) {
      return;
    }
    void prefetchVisibleCharts(markets.slice(0, 6));
  }, [markets]);

  const sections = useMemo(
    () => [
      { title: "Starline Charts", items: markets.filter((item) => item.category === "starline") },
      { title: "Jackpot Charts", items: markets.filter((item) => item.category === "jackpot") },
      { title: "Panna Charts", items: markets.filter((item) => item.category === "games") }
    ],
    [markets]
  );

  return (
    <View style={styles.page}>
      <AppHeader title="Charts" />
      <AppScreen>
        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.items.map((item) => (
                <Link
                  asChild
                  href={{
                    pathname: "/charts/[slug]",
                    params: { slug: item.slug, label: item.name }
                  }}
                  key={item.slug}
                >
                  <Pressable style={styles.item}>
                    <Text style={styles.itemText}>{item.name}</Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          ))
        )}
      </AppScreen>
    </View>
  );

  async function load(showLoader = true) {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError("");
      const nextMarkets = await api.listMarkets();
      setMarkets(nextMarkets);
      setCachedMarkets(nextMarkets);
      void prefetchVisibleCharts(nextMarkets.slice(0, 6));
    } catch (loadError) {
      setError(formatApiError(loadError, "Unable to load charts"));
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }

  async function prefetchVisibleCharts(items: MarketItem[]) {
    const targets = items.filter((item) => item?.slug).slice(0, 6);
    const uncachedTargets = targets.filter(
      (item) => !getCachedChart(item.slug, "jodi", 15 * 60_000) || !getCachedChart(item.slug, "panna", 15 * 60_000)
    );
    if (!uncachedTargets.length) {
      return;
    }

    try {
      const payload = await api.getChartBatch(
        uncachedTargets.map((item) => item.slug),
        ["jodi", "panna"]
      );
      for (const chart of payload.items) {
        setCachedChart(chart.marketSlug, chart.chartType, chart);
      }
    } catch {
      // Silent prefetch failure should not block chart list rendering.
    }
  }
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  section: { gap: 10 },
  sectionTitle: { color: "#111827", textAlign: "center", fontSize: 16, fontWeight: "800", textTransform: "uppercase" },
  item: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: "#7279cd", backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  itemText: { color: "#111827", fontSize: 16, fontWeight: "700", textTransform: "uppercase", textAlign: "center" },
  errorBox: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 10, alignItems: "center" },
  errorText: { color: "#dc2626", textAlign: "center", fontWeight: "600" },
  retryButton: { minHeight: 38, borderRadius: 999, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  retryText: { color: colors.surface, fontWeight: "700" }
});
