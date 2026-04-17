import { Ionicons } from "@expo/vector-icons";
import { Link, router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Linking, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { AppHeader, AppScreen, SurfaceCard } from "@/components/ui";
import { marketCatalog } from "@/data/mock";
import { api } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { getCachedMarkets, getCachedSettings, setCachedMarkets, setCachedSettings } from "@/lib/content-cache";
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

const HOME_SOFT_REFRESH_INTERVAL_MS = 120_000;
const CLOCK_REFRESH_INTERVAL_MS = 60_000;

function parseClockTimeToMinutes(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  let hours = Number(match[1]) % 12;
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (meridiem === "PM") {
    hours += 12;
  }

  return hours * 60 + minutes;
}

function getCurrentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getMarketPhase(market: Pick<MarketItem, "open" | "close">, currentMinutes: number) {
  const openMinutes = parseClockTimeToMinutes(market.open);
  const closeMinutes = parseClockTimeToMinutes(market.close);

  if (openMinutes === Number.MAX_SAFE_INTEGER || closeMinutes === Number.MAX_SAFE_INTEGER) {
    return "upcoming" as const;
  }
  if (currentMinutes < openMinutes) {
    return "open-running" as const;
  }
  if (currentMinutes < closeMinutes) {
    return "close-running" as const;
  }
  return "closed" as const;
}

function getMarketPhaseMeta(market: Pick<MarketItem, "open" | "close">, currentMinutes: number) {
  const phase = getMarketPhase(market, currentMinutes);
  if (phase === "open-running") {
    return {
      phase,
      label: "Betting Running Now",
      isClosed: false,
      canPlaceBet: true,
      sortBucket: 1,
      timeAnchor: parseClockTimeToMinutes(market.open)
    };
  }
  if (phase === "close-running") {
    return {
      phase,
      label: "Betting is Running for Close",
      isClosed: false,
      canPlaceBet: true,
      sortBucket: 0,
      timeAnchor: parseClockTimeToMinutes(market.close)
    };
  }
  return {
    phase,
    label: "Betting is Closed for Today",
    isClosed: true,
    canPlaceBet: false,
    sortBucket: 2,
    timeAnchor: parseClockTimeToMinutes(market.close)
  };
}

function sortMarketsByTime(markets: MarketItem[], currentMinutes: number) {
  return [...markets].sort((left, right) => {
    const leftMeta = getMarketPhaseMeta(left, currentMinutes);
    const rightMeta = getMarketPhaseMeta(right, currentMinutes);

    if (leftMeta.sortBucket !== rightMeta.sortBucket) {
      return leftMeta.sortBucket - rightMeta.sortBucket;
    }

    if (leftMeta.phase === "open-running") {
      const openDiff = parseClockTimeToMinutes(left.open) - parseClockTimeToMinutes(right.open);
      if (openDiff !== 0) {
        return openDiff;
      }
    }

    if (leftMeta.phase === "close-running") {
      const closeDiff = parseClockTimeToMinutes(left.close) - parseClockTimeToMinutes(right.close);
      if (closeDiff !== 0) {
        return closeDiff;
      }
    }

    if (leftMeta.phase === "closed") {
      const closedDiff = parseClockTimeToMinutes(right.close) - parseClockTimeToMinutes(left.close);
      if (closedDiff !== 0) {
        return closedDiff;
      }
    }

    return left.name.localeCompare(right.name);
  });
}

export default function HomeScreen() {
  const { currentUser, walletBalance, reloadSessionData } = useAppState();
  const { height } = useWindowDimensions();
  const [markets, setMarkets] = useState<MarketItem[]>(() => getCachedMarkets() ?? []);
  const lastGoodMarketsRef = useRef<MarketItem[]>([]);
  const lastSoftRefreshAtRef = useRef(0);
  const [loading, setLoading] = useState(() => !getCachedMarkets());
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [noticeText, setNoticeText] = useState("Notice: Market open-close time change ho sakta hai, bet place karne se pehle check karein.");
  const [selectedChartMarket, setSelectedChartMarket] = useState<Pick<MarketItem, "slug" | "name"> | null>(null);
  const [currentMinutes, setCurrentMinutes] = useState(() => getCurrentMinutes());

  useEffect(() => {
    const cachedMarkets = getCachedMarkets();
    if (cachedMarkets?.length) {
      lastGoodMarketsRef.current = cachedMarkets;
    }
    const cachedSettings = getCachedSettings();
    if (cachedSettings?.length) {
      const map = Object.fromEntries(cachedSettings.map((item) => [item.key, item.value]));
      if (map.notice_text?.trim()) {
        setNoticeText(map.notice_text.trim());
      }
    }

    void Promise.allSettled([loadMarkets(!cachedMarkets?.length), loadSettings()]);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMinutes(getCurrentMinutes());
    }, CLOCK_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
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

  const listedMarkets = useMemo(() => sortMarketsByTime(markets, currentMinutes), [markets, currentMinutes]);
  const isCompactScreen = height < 760;

  return (
    <View style={styles.page}>
      <AppHeader
        title="Real Matka"
        rightLabel={`Rs ${walletBalance}`}
      />
      <View style={styles.noticeStrip}>
        <Ionicons color={colors.warning} name="alert-circle-outline" size={14} />
        <NoticeTicker text={noticeText} />
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
        {loading ? (
          <SurfaceCard>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.stateText}>Markets load ho rahe hain...</Text>
          </SurfaceCard>
        ) : error ? (
          <SurfaceCard>
            <Text style={styles.errorTitle}>Markets load nahi hue</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void loadMarkets()} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </SurfaceCard>
        ) : (
          <View style={styles.marketList}>
            {listedMarkets.map((market) => {
              const phaseMeta = getMarketPhaseMeta(market, currentMinutes);
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
                            params: { market: market.slug, label: market.name, marketPhase: phaseMeta.phase }
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
      await Promise.allSettled([reloadSessionData(), loadMarkets(false), loadSettings()]);
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
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load markets");
      if (lastGoodMarketsRef.current.length > 0) {
        setMarkets(lastGoodMarketsRef.current);
      }
    } finally {
      if (showLoader) {
        setLoading(false);
      }
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

function NoticeTicker({ text }: { text: string }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(1);
  const [textWidth, setTextWidth] = useState(1);

  useEffect(() => {
    if (!containerWidth || !textWidth) {
      return;
    }

    translateX.stopAnimation();
    translateX.setValue(containerWidth);

    const distance = containerWidth + textWidth;
    const duration = Math.max(9000, distance * 18);
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: -textWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );

    loop.start();
    return () => loop.stop();
  }, [containerWidth, textWidth, text, translateX]);

  return (
    <View onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)} style={styles.noticeTickerViewport}>
      <Animated.Text
        onLayout={(event) => setTextWidth(event.nativeEvent.layout.width)}
        style={[styles.noticeText, { transform: [{ translateX }] }]}
        numberOfLines={1}
      >
        {text}
      </Animated.Text>
    </View>
  );
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
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  noticeTickerViewport: {
    flex: 1,
    overflow: "hidden",
    minHeight: 15,
    justifyContent: "center"
  },
  noticeText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    position: "absolute"
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
