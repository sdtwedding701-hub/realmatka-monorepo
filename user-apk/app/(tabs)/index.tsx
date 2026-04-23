import { Ionicons } from "@expo/vector-icons";
import { Link, router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { AppHeader, AppScreen, SurfaceCard } from "@/components/ui";
import { marketCatalog } from "../../data/mock";
import { api, formatApiError } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import {
  getCachedChart,
  getCachedMarkets,
  getCachedSettings,
  hydrateCachedMarkets,
  hydrateCachedSettings,
  setCachedChart,
  setCachedMarkets,
  setCachedSettings
} from "@/lib/content-cache";
import { colors } from "@/theme/colors";

type MarketItem = {
  id: string;
  slug: string;
  name: string;
  result: string;
  phase?: "open-running" | "close-running" | "closed" | "upcoming";
  label?: string;
  canPlaceBet?: boolean;
  blockedBoardLabels?: string[];
  status: string;
  action: string;
  open: string;
  close: string;
  category: "starline" | "games" | "jackpot";
};

const HOME_SOFT_REFRESH_INTERVAL_MS = 120_000;
const FALLBACK_MARKETS: MarketItem[] = marketCatalog.map((fallback) => ({
  id: fallback.slug,
  slug: fallback.slug,
  name: fallback.name,
  result: "",
  status: "Active",
  action: "Open",
  open: fallback.open,
  close: fallback.close,
  category: fallback.category
}));

function isMarketForcedClosed(market: Pick<MarketItem, "status" | "action">) {
  const status = String(market.status ?? "").toLowerCase();
  const action = String(market.action ?? "").toLowerCase();
  return status.includes("weekly off") || status.includes("closed for today") || action === "closed";
}

function getPhaseDisplayLabel(phase: MarketItem["phase"], isClosed: boolean) {
  if (phase === "close-running") {
    return "Betting is Running for Close";
  }
  if (phase === "closed" || isClosed) {
    return "Betting is Closed for Today";
  }
  return "Betting Running Now";
}

function getMarketDisplayMeta(market: Pick<MarketItem, "status" | "action" | "phase" | "label">) {
  const isClosed = isMarketForcedClosed(market);
  const normalizedLabel = String(market.label ?? "").trim();
  const normalizedAction = String(market.action ?? "").trim();
  const normalizedPhase = String(market.phase ?? "").trim().toLowerCase();
  const canPlaceBetFromBackend = typeof (market as MarketItem).canPlaceBet === "boolean" ? (market as MarketItem).canPlaceBet : null;
  const resolvedPhase =
    normalizedPhase === "open-running" || normalizedPhase === "close-running" || normalizedPhase === "upcoming" || normalizedPhase === "closed"
      ? normalizedPhase
      : isClosed
        ? "closed"
        : "open-running";

  return {
    label: normalizedLabel || getPhaseDisplayLabel(resolvedPhase as MarketItem["phase"], isClosed),
    isClosed,
    canPlaceBet: canPlaceBetFromBackend ?? (!isClosed && normalizedAction.toLowerCase() !== "closed"),
    phase: resolvedPhase
  } as const;
}

export default function HomeScreen() {
  const { walletBalance } = useAppState();
  const { height } = useWindowDimensions();
  const [markets, setMarkets] = useState<MarketItem[]>(() => getCachedMarkets() ?? FALLBACK_MARKETS);
  const lastGoodMarketsRef = useRef<MarketItem[]>([]);
  const lastSoftRefreshAtRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [noticeText, setNoticeText] = useState("Notice: Market open-close time change ho sakta hai, bet place karne se pehle check karein.");
  const [selectedChartMarket, setSelectedChartMarket] = useState<Pick<MarketItem, "slug" | "name"> | null>(null);
  useEffect(() => {
    const cachedMarkets = getCachedMarkets();
    const initialMarkets = cachedMarkets?.length ? cachedMarkets : FALLBACK_MARKETS;
    lastGoodMarketsRef.current = initialMarkets;
    setMarkets(initialMarkets);

    const cachedSettings = getCachedSettings();
    if (cachedSettings?.length) {
      const map = Object.fromEntries(cachedSettings.map((item) => [item.key, item.value]));
      if (map.notice_text?.trim()) {
        setNoticeText(map.notice_text.trim());
      }
    }

    void (async () => {
      const persistedMarkets = await hydrateCachedMarkets();
      if (persistedMarkets?.length) {
        lastGoodMarketsRef.current = persistedMarkets;
        setMarkets(persistedMarkets);
      }

      const persistedSettings = await hydrateCachedSettings();
      if (persistedSettings?.length) {
        const map = Object.fromEntries(persistedSettings.map((item) => [item.key, item.value]));
        if (map.notice_text?.trim()) {
          setNoticeText(map.notice_text.trim());
        }
      }

      await Promise.allSettled([loadMarkets(false), loadSettings()]);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lastSoftRefreshAtRef.current < HOME_SOFT_REFRESH_INTERVAL_MS) {
        return;
      }
      lastSoftRefreshAtRef.current = Date.now();
      void refreshScreen(false);
    }, [])
  );

  const listedMarkets = markets;
  const isCompactScreen = height < 760;
  const showHardError = listedMarkets.length === 0 && Boolean(error);

  useEffect(() => {
    if (!listedMarkets.length) {
      return;
    }
    void prefetchChartPreview(listedMarkets.slice(0, 4));
  }, [listedMarkets]);

  return (
    <View style={styles.page}>
      <AppHeader
        title="Real Matka"
        rightLabel={`Rs ${walletBalance}`}
      />
      <View style={styles.noticeStrip}>
        <Ionicons color={colors.warning} name="alert-circle-outline" size={16} />
        <Text style={styles.noticeText}>{noticeText}</Text>
      </View>

      <AppScreen
        onRefresh={() => void refreshScreen()}
        padded={false}
        refreshing={refreshing}
        scrollContentStyle={isCompactScreen ? styles.homeScrollCompact : styles.homeScroll}
        showPromo={false}
      >
        <View style={styles.contentWrap}>
        <Pressable
          onPress={() => {
            void Linking.openURL("https://wa.me/918446012081");
          }}
          style={styles.whatsappStrip}
        >
          <Ionicons color="#16a34a" name="logo-whatsapp" size={18} />
          <Text style={styles.whatsappText}>+91 8446012081</Text>
        </Pressable>
        {loading && !listedMarkets.length ? (
          <SurfaceCard>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.stateText}>Markets load ho rahe hain...</Text>
          </SurfaceCard>
        ) : showHardError ? (
          <SurfaceCard>
            <Text style={styles.errorTitle}>Markets load nahi hue</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void loadMarkets()} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </SurfaceCard>
        ) : (
          <View style={styles.marketList}>
            {error ? (
              <View style={styles.softErrorStrip}>
                <Text style={styles.softErrorText}>Server abhi respond nahi kar raha. Cached market list dikh rahi hai.</Text>
              </View>
            ) : null}
            {listedMarkets.map((market) => {
              const phaseMeta = getMarketDisplayMeta(market);
              const isClosed = phaseMeta.isClosed;
              const hasResult = Boolean(market.result?.trim());
              const canPlaceBet = phaseMeta.canPlaceBet;

              return (
                <View key={market.slug} style={[styles.marketGradient, isClosed ? styles.marketGradientClosed : styles.marketGradientOpen]}>
                    <View style={styles.marketHeaderRow}>
                      <View style={styles.marketIdentity}>
                        <View style={styles.marketTitleRow}>
                          <Text style={styles.marketName}>{market.name}</Text>
                          <Text style={[styles.resultValue, !hasResult && styles.resultPending]}>{hasResult ? market.result : "***-**-***"}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.middleRow}>
                      <Text style={[styles.marketState, isClosed ? styles.marketStateClosed : styles.marketStateOpen]}>
                        {phaseMeta.label}
                      </Text>
                      <View style={styles.chartWrap}>
                        <Pressable onPress={() => setSelectedChartMarket({ slug: market.slug, name: market.name })} style={styles.chartIconButton}>
                          <Ionicons color={colors.surface} name="stats-chart-outline" size={18} />
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.bottomRow}>
                      <Text style={styles.timeInlineText}>
                        Open {market.open} | Close {market.close}
                      </Text>
                      {canPlaceBet ? (
                        <Link
                          asChild
                          href={{
                            pathname: "/place-bid/[market]",
                            params: {
                              market: market.slug,
                              label: market.name,
                              marketPhase: phaseMeta.phase,
                              blockedBoards: (market.blockedBoardLabels ?? []).join("||")
                            }
                          }}
                        >
                          <Pressable style={styles.openButton}>
                            <Text style={styles.openButtonText}>Place Bet</Text>
                          </Pressable>
                        </Link>
                      ) : (
                        <Pressable disabled style={[styles.openButton, styles.openButtonClosed]}>
                          <Text style={[styles.openButtonText, isClosed && styles.openButtonTextClosed]}>
                            Closed
                          </Text>
                        </Pressable>
                      )}
                    </View>
                </View>
              );
            })}
          </View>
        )}
        </View>
      </AppScreen>

      <Modal animationType="fade" onRequestClose={() => setSelectedChartMarket(null)} transparent visible={Boolean(selectedChartMarket)}>
        <View style={styles.modalOverlay}>
          <Pressable onPress={() => setSelectedChartMarket(null)} style={styles.modalBackdrop} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedChartMarket?.name?.toUpperCase()} Charts</Text>
              <Pressable onPress={() => setSelectedChartMarket(null)} style={styles.modalClose}>
                <Ionicons color={colors.textSecondary} name="close" size={18} />
              </Pressable>
            </View>

            <Pressable
              onPress={() => {
                if (!selectedChartMarket) return;
                setSelectedChartMarket(null);
                router.push({
                  pathname: "/charts/[slug]",
                  params: { slug: selectedChartMarket.slug, label: selectedChartMarket.name, chartType: "jodi" }
                });
              }}
              style={[styles.optionButton, styles.optionJodi]}
            >
              <Ionicons color={colors.surface} name="grid-outline" size={18} />
              <Text style={styles.optionButtonText}>Jodi Chart</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                if (!selectedChartMarket) return;
                setSelectedChartMarket(null);
                router.push({
                  pathname: "/charts/[slug]",
                  params: { slug: selectedChartMarket.slug, label: selectedChartMarket.name, chartType: "panna" }
                });
              }}
              style={[styles.optionButton, styles.optionPanna]}
            >
              <Ionicons color={colors.surface} name="albums-outline" size={18} />
              <Text style={styles.optionButtonText}>Panna Chart</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );

  async function refreshScreen(showPullRefresh = true) {
    try {
      if (showPullRefresh) {
        setRefreshing(true);
      }
      await Promise.allSettled([loadMarkets(false)]);
    } finally {
      if (showPullRefresh) {
        setRefreshing(false);
      }
    }
  }

  async function loadMarkets(showLoader = true) {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError("");
      const liveMarkets = await api.listMarkets();
      const fallbackEntries = marketCatalog.map((item) => [item.slug, item] as const);
      const fallbackMap = new Map<string, (typeof marketCatalog)[number]>(fallbackEntries);
      const liveSlugs = new Set(liveMarkets.map((item) => item.slug));

      const mappedLiveMarkets = liveMarkets.map((live) => {
        const fallback = fallbackMap.get(live.slug);
        return {
          id: live.id ?? live.slug,
          slug: live.slug,
          name: live.name ?? fallback?.name ?? live.slug,
          result: live.result ?? "",
          phase: live.phase,
          label: live.label ?? "",
          canPlaceBet: live.canPlaceBet,
          blockedBoardLabels: Array.isArray(live.blockedBoardLabels) ? live.blockedBoardLabels : [],
          status: live.status ?? "Active",
          action: live.action ?? "Open",
          open: live.open ?? fallback?.open ?? "--:--",
          close: live.close ?? fallback?.close ?? "--:--",
          category: live.category ?? fallback?.category ?? "games"
        } satisfies MarketItem;
      });

      const fallbackOnlyMarkets = marketCatalog
        .filter((fallback) => !liveSlugs.has(fallback.slug))
        .map((fallback) => ({
          id: fallback.slug,
          slug: fallback.slug,
          name: fallback.name,
          result: "",
          phase: "open-running",
          label: "",
          canPlaceBet: true,
          blockedBoardLabels: [],
          status: "Active",
          action: "Open",
          open: fallback.open,
          close: fallback.close,
          category: fallback.category
        }) satisfies MarketItem);

      const nextMarkets = [...mappedLiveMarkets, ...fallbackOnlyMarkets];
      setMarkets(nextMarkets);
      lastGoodMarketsRef.current = nextMarkets;
      setCachedMarkets(nextMarkets);
      void prefetchChartPreview(nextMarkets.slice(0, 4));
    } catch (loadError) {
      setError(formatApiError(loadError, "Unable to load markets"));
      if (lastGoodMarketsRef.current.length > 0) {
        setMarkets(lastGoodMarketsRef.current);
      } else {
        setMarkets(FALLBACK_MARKETS);
      }
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }

  async function prefetchChartPreview(items: MarketItem[]) {
    const uncachedMarkets = items.filter(
      (item) => !getCachedChart(item.slug, "jodi", 15 * 60_000) || !getCachedChart(item.slug, "panna", 15 * 60_000)
    );
    if (!uncachedMarkets.length) {
      return;
    }

    try {
      const payload = await api.getChartBatch(
        uncachedMarkets.map((item) => item.slug),
        ["jodi", "panna"]
      );
      for (const chart of payload.items) {
        setCachedChart(chart.marketSlug, chart.chartType, chart);
      }
    } catch {
      // Ignore prefetch failures to keep home responsive.
    }
  }

  async function loadSettings() {
    try {
      const settings = await api.getSettings();
      setCachedSettings(settings);
      const map = Object.fromEntries(settings.map((item) => [item.key, item.value]));
      if (map.notice_text?.trim()) {
        setNoticeText(map.notice_text.trim());
      }
    } catch {
      // Keep fallback text when settings are unavailable.
    }
  }

}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background
  },
  stateText: {
    color: colors.textMuted,
    textAlign: "center",
    fontWeight: "600"
  },
  softErrorStrip: {
    borderRadius: 12,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  softErrorText: {
    color: "#9a3412",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16
  },
  contentWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 0
  },
  homeScroll: {
    paddingBottom: 84
  },
  homeScrollCompact: {
    paddingBottom: 76
  },
  whatsappStrip: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  whatsappText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "800"
  },
  noticeStrip: {
    backgroundColor: colors.warningSoft,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8
  },
  noticeText: {
    flex: 1,
    color: colors.warning,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "800"
  },
  errorText: {
    color: colors.danger,
    lineHeight: 20
  },
  retryButton: {
    minHeight: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  retryText: {
    color: colors.surface,
    fontWeight: "800"
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
    backgroundColor: colors.overlay
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject
  },
  modalCard: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  modalTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center"
  },
  modalClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted
  },
  optionButton: {
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  optionJodi: {
    backgroundColor: colors.accentDark
  },
  optionPanna: {
    backgroundColor: colors.primary
  },
  optionButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "800"
  },
  marketList: {
    gap: 14,
    paddingBottom: 8
  },
  marketGradient: {
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  marketGradientOpen: {
    backgroundColor: colors.cardTint,
    borderColor: colors.border
  },
  marketGradientClosed: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerBorder
  },
  marketHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  marketIdentity: {
    flex: 1,
    gap: 0
  },
  marketTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  marketName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  marketState: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16
  },
  marketStateOpen: {
    color: colors.success
  },
  marketStateClosed: {
    color: colors.danger
  },
  middleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  timeInlineText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16
  },
  chartWrap: {
    width: 100,
    alignItems: "flex-end",
    justifyContent: "center"
  },
  chartIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent
  },
  resultCard: {
    display: "none"
  },
  resultLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  resultValue: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "900"
  },
  resultCardValue: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "900"
  },
  resultPending: {
    color: colors.accent
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  openButton: {
    width: 100,
    minHeight: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentSoft
  },
  openButtonClosed: {
    backgroundColor: colors.dangerSoft
  },
  openButtonText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "800"
  },
  openButtonTextClosed: {
    color: colors.danger
  }
});
