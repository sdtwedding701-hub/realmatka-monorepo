import { Ionicons } from "@expo/vector-icons";
import { Link, router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Image, Modal, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { AppHeader, AppScreen, SurfaceCard } from "@/components/ui";
import { marketCatalog } from "../../data/mock";
import { api, formatApiError, type CricketMatch, type CricketMatchesPayload } from "@/lib/api";
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

const HOME_SOFT_REFRESH_INTERVAL_MS = 60_000;
const DEFAULT_NOTICE_TEXT =
  "Abhi market aur betting running hai. Aap app me bet place kar sakte ho. First deposit bonus: Rs 1000 par 50 points aur Rs 2000 par 100 points milenge. Bonus sirf first deposit par milega.";
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
  const { walletBalance, sessionToken, reloadSessionData } = useAppState();
  const { height } = useWindowDimensions();
  const [markets, setMarkets] = useState<MarketItem[]>(() => getCachedMarkets() ?? FALLBACK_MARKETS);
  const lastGoodMarketsRef = useRef<MarketItem[]>([]);
  const lastSoftRefreshAtRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [noticeText, setNoticeText] = useState(DEFAULT_NOTICE_TEXT);
  const noticeScrollX = useRef(new Animated.Value(0)).current;
  const [noticeContainerWidth, setNoticeContainerWidth] = useState(0);
  const [noticeTextWidth, setNoticeTextWidth] = useState(0);
  const [noticeReady, setNoticeReady] = useState(false);
  const [selectedChartMarket, setSelectedChartMarket] = useState<Pick<MarketItem, "slug" | "name"> | null>(null);
  const [homeMode, setHomeMode] = useState<"matka" | "cricket">("matka");
  const [cricketData, setCricketData] = useState<CricketMatchesPayload>({ rates: {}, matches: [] });
  const [cricketLoading, setCricketLoading] = useState(false);
  const [cricketError, setCricketError] = useState("");
  const [cricketAmount, setCricketAmount] = useState("100");
  const [cricketMessage, setCricketMessage] = useState("");
  const estimatedNoticeTextWidth = Math.max(noticeTextWidth, noticeText.length * 12);
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

      await Promise.allSettled([loadMarkets(false), loadSettings(), loadCricket(false)]);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (Date.now() - lastSoftRefreshAtRef.current >= HOME_SOFT_REFRESH_INTERVAL_MS) {
        lastSoftRefreshAtRef.current = Date.now();
        void refreshScreen(false);
      }

      const interval = setInterval(() => {
        if (!active) {
          return;
        }
        lastSoftRefreshAtRef.current = Date.now();
        void refreshScreen(false);
      }, HOME_SOFT_REFRESH_INTERVAL_MS);

      return () => {
        active = false;
        clearInterval(interval);
      };
    }, [])
  );

  useEffect(() => {
    const measuredNoticeTextWidth = Math.max(estimatedNoticeTextWidth, noticeContainerWidth + 48);
    noticeScrollX.stopAnimation();
    if (!noticeContainerWidth || !measuredNoticeTextWidth || !noticeReady) {
      noticeScrollX.setValue(0);
      return;
    }

    const shouldScroll = measuredNoticeTextWidth > noticeContainerWidth - 8 || noticeText.length > 42;
    if (!shouldScroll) {
      noticeScrollX.setValue(0);
      return;
    }

    const travelDistance = measuredNoticeTextWidth + noticeContainerWidth + 24;
    noticeScrollX.setValue(noticeContainerWidth);
    const animation = Animated.loop(
      Animated.timing(noticeScrollX, {
        toValue: -measuredNoticeTextWidth - 24,
        duration: Math.max(9000, travelDistance * 42),
        easing: Easing.linear,
        useNativeDriver: true
      })
    );
    animation.start();

    return () => {
      animation.stop();
    };
  }, [estimatedNoticeTextWidth, noticeContainerWidth, noticeReady, noticeScrollX, noticeText]);

  useEffect(() => {
    setNoticeReady(false);
    setNoticeTextWidth(0);
  }, [noticeText]);

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
      <View style={styles.noticeStrip}>
        <Ionicons color={colors.warning} name="alert-circle-outline" size={16} />
        <View
          onLayout={(event) => setNoticeContainerWidth(event.nativeEvent.layout.width)}
          style={styles.noticeMarqueeWindow}
        >
          <Text
            onLayout={(event) => {
              const width = Math.ceil(event.nativeEvent.layout.width);
              if (width > 0) {
                setNoticeTextWidth(width);
                setNoticeReady(true);
              }
            }}
            numberOfLines={1}
            style={styles.noticeMeasureText}
          >
            {noticeText}
          </Text>
          <Animated.Text
            ellipsizeMode="clip"
            numberOfLines={1}
            style={[
              styles.noticeText,
              noticeReady ? styles.noticeTextVisible : styles.noticeTextHidden,
              { width: Math.max(estimatedNoticeTextWidth, noticeContainerWidth), transform: [{ translateX: noticeScrollX }] }
            ]}
          >
            {noticeText}
          </Animated.Text>
        </View>
      </View>
      <AppHeader
        title="Real Matka"
        rightLabel={`Rs ${walletBalance}`}
      />
      <View style={styles.stickyModeWrap}>
        <View style={styles.modeSwitch}>
          <Pressable onPress={() => setHomeMode("matka")} style={[styles.modeButton, homeMode === "matka" && styles.modeButtonActive]}>
            <Ionicons color={homeMode === "matka" ? colors.surface : colors.textSecondary} name="apps-outline" size={17} />
            <Text style={[styles.modeButtonText, homeMode === "matka" && styles.modeButtonTextActive]}>Matka</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setHomeMode("cricket");
              void loadCricket(false);
            }}
            style={[styles.modeButton, homeMode === "cricket" && styles.modeButtonActive]}
          >
            <Ionicons color={homeMode === "cricket" ? colors.surface : colors.textSecondary} name="baseball-outline" size={17} />
            <Text style={[styles.modeButtonText, homeMode === "cricket" && styles.modeButtonTextActive]}>Play Cricket</Text>
          </Pressable>
        </View>
      </View>

      <AppScreen
        padded={false}
        scrollContentStyle={isCompactScreen ? styles.homeScrollCompact : styles.homeScroll}
        showPromo={false}
      >
        <View style={styles.contentWrap}>
        <View style={styles.heroBannerCard}>
          <Image
            resizeMode="stretch"
            source={require("../../assets/images/realmatkabanner.jpg")}
            style={styles.heroBannerImage}
          />
        </View>
        {homeMode === "cricket" ? (
          <CricketHomeSection
            amount={cricketAmount}
            data={cricketData}
            error={cricketError}
            loading={cricketLoading}
            message={cricketMessage}
            onAmountChange={setCricketAmount}
            onPlaceBet={placeCricketQuickBet}
            onRefresh={() => loadCricket(true)}
          />
        ) : loading && !listedMarkets.length ? (
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
                  <View
                    key={market.slug}
                    style={[
                      styles.marketGradient,
                      isClosed ? styles.marketGradientClosed : styles.marketGradientOpen,
                      canPlaceBet ? styles.marketGradientWithAction : styles.marketGradientStatic
                    ]}
                  >
                    <View style={styles.marketHeaderRow}>
                      <View style={styles.marketIdentity}>
                        <View style={styles.marketTitleRow}>
                          <Text style={styles.marketName}>{market.name}</Text>
                        </View>
                      </View>
                      <View style={[styles.resultBadge, isClosed ? styles.resultBadgeClosed : styles.resultBadgeOpen, !hasResult && styles.resultBadgePending]}>
                        <Text style={[styles.resultValue, !hasResult && styles.resultPending]}>{hasResult ? market.result : "***-**-***"}</Text>
                      </View>
                    </View>

                    <View style={styles.middleRow}>
                      <View style={styles.marketStatusWrap}>
                        <Text style={[styles.marketState, isClosed ? styles.marketStateClosed : styles.marketStateOpen]}>
                          {phaseMeta.label}
                        </Text>
                        <Text style={styles.timeInlineText}>
                          Open {market.open} | Close {market.close}
                        </Text>
                      </View>
                      <View style={styles.chartWrap}>
                        <Pressable
                          onPress={() => setSelectedChartMarket({ slug: market.slug, name: market.name })}
                          style={[styles.chartIconButton, isClosed ? styles.chartIconButtonClosed : styles.chartIconButtonOpen]}
                        >
                          <Ionicons color={colors.surface} name="stats-chart-outline" size={18} />
                        </Pressable>
                      </View>
                    </View>

                    {canPlaceBet ? (
                      <View style={styles.bottomRow}>
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
                            <Text style={styles.openButtonText}>Place Bet Now</Text>
                          </Pressable>
                        </Link>
                      </View>
                    ) : null}
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
      await Promise.allSettled([loadMarkets(false), loadCricket(false)]);
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

  async function loadCricket(showLoader = true) {
    try {
      if (showLoader) {
        setCricketLoading(true);
      }
      setCricketError("");
      const data = await api.cricketMatches();
      setCricketData(data);
    } catch (loadError) {
      setCricketError(formatApiError(loadError, "Cricket games load nahi hue"));
    } finally {
      if (showLoader) {
        setCricketLoading(false);
      }
    }
  }

  async function placeCricketQuickBet(match: CricketMatch, betType: string, selection: string) {
    if (!sessionToken) {
      setCricketMessage("Login required.");
      return;
    }
    const amount = Number(cricketAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      setCricketMessage("Valid amount enter karo.");
      return;
    }
    try {
      setCricketMessage("");
      await api.placeCricketBet(sessionToken, { matchId: match.id, betType, selection, amount });
      setCricketMessage(`${match.title}: ${selection} bet placed.`);
      await Promise.allSettled([reloadSessionData({ force: true }), loadCricket(false)]);
    } catch (placeError) {
      setCricketMessage(formatApiError(placeError, "Cricket bet place nahi hui"));
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

function CricketHomeSection({
  amount,
  data,
  error,
  loading,
  message,
  onAmountChange,
  onPlaceBet,
  onRefresh
}: {
  amount: string;
  data: CricketMatchesPayload;
  error: string;
  loading: boolean;
  message: string;
  onAmountChange: (value: string) => void;
  onPlaceBet: (match: CricketMatch, betType: string, selection: string) => void;
  onRefresh: () => void;
}) {
  const matches = data.matches || [];
  const rates = data.rates || {};
  return (
    <View style={styles.cricketWrap}>
      <View style={styles.cricketHero}>
        <View style={styles.cricketHeroText}>
          <Text style={styles.cricketEyebrow}>Live Cricket Games</Text>
          <Text style={styles.cricketTitle}>Over prediction lagaao</Text>
          <Text style={styles.cricketSubtitle}>Runs, Odd/Even, Wicket aur Boundary par quick bet.</Text>
        </View>
        <Pressable onPress={onRefresh} style={styles.cricketRefresh}>
          <Ionicons color={colors.surface} name="refresh" size={18} />
        </Pressable>
      </View>

      <View style={styles.cricketAmountRow}>
        <Text style={styles.cricketAmountLabel}>Bet Amount</Text>
        <TextInput
          keyboardType="numeric"
          onChangeText={(value) => onAmountChange(value.replace(/[^0-9]/g, ""))}
          placeholder="100"
          style={styles.cricketAmountInput}
          value={amount}
        />
      </View>

      {message ? <Text style={styles.cricketMessage}>{message}</Text> : null}
      {error ? <Text style={styles.cricketError}>{error}</Text> : null}

      {loading && !matches.length ? (
        <SurfaceCard>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.stateText}>Cricket games load ho rahe hain...</Text>
        </SurfaceCard>
      ) : matches.length ? (
        matches.map((match) => (
          <View key={match.id} style={styles.cricketCard}>
            <View style={styles.cricketCardTop}>
              <View>
                <Text style={styles.cricketMatchTitle}>{match.title}</Text>
                <Text style={styles.cricketTeams}>{match.teamA} vs {match.teamB}</Text>
              </View>
              <View style={[styles.cricketStatusPill, match.bettingOpen ? styles.cricketStatusLive : styles.cricketStatusClosed]}>
                <Text style={styles.cricketStatusText}>{match.bettingOpen ? "LIVE" : "CLOSED"}</Text>
              </View>
            </View>
            <Text style={styles.cricketOverText}>Over {match.activeOver} market</Text>
            <CricketBetGroup match={match} onPlaceBet={onPlaceBet} rates={rates.runs || {}} title="Over Runs" type="runs" />
            <CricketBetGroup match={match} onPlaceBet={onPlaceBet} rates={rates.odd_even || {}} title="Odd / Even" type="odd_even" />
            <CricketBetGroup match={match} onPlaceBet={onPlaceBet} rates={rates.wicket || {}} title="Wicket" type="wicket" />
            <CricketBetGroup match={match} onPlaceBet={onPlaceBet} rates={rates.boundary || {}} title="Boundary" type="boundary" />
          </View>
        ))
      ) : (
        <SurfaceCard>
          <Text style={styles.errorTitle}>Cricket match available nahi hai</Text>
          <Text style={styles.errorText}>Admin panel se pehla cricket match create karo.</Text>
        </SurfaceCard>
      )}
    </View>
  );
}

function CricketBetGroup({
  match,
  onPlaceBet,
  rates,
  title,
  type
}: {
  match: CricketMatch;
  onPlaceBet: (match: CricketMatch, betType: string, selection: string) => void;
  rates: Record<string, number>;
  title: string;
  type: string;
}) {
  return (
    <View style={styles.cricketBetGroup}>
      <Text style={styles.cricketBetTitle}>{title}</Text>
      <View style={styles.cricketOptions}>
        {Object.entries(rates).map(([selection, rate]) => (
          <Pressable
            disabled={!match.bettingOpen}
            key={`${type}-${selection}`}
            onPress={() => onPlaceBet(match, type, selection)}
            style={[styles.cricketOption, !match.bettingOpen && styles.cricketOptionDisabled]}
          >
            <Text style={styles.cricketOptionText}>{selection}</Text>
            <Text style={styles.cricketRateText}>{rate}x</Text>
          </Pressable>
        ))}
      </View>
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
  heroBannerCard: {
      borderRadius: 6,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: "#ffffff",
      marginBottom: 10,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4
    },
  heroBannerImage: {
      width: "100%",
      height: 144,
      backgroundColor: "#ffffff"
    },
  stickyModeWrap: {
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  modeSwitch: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 6
  },
  modeButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7
  },
  modeButtonActive: {
    backgroundColor: colors.primary
  },
  modeButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "900"
  },
  modeButtonTextActive: {
    color: colors.surface
  },
  cricketWrap: {
    gap: 14,
    paddingBottom: 8
  },
  cricketHero: {
    borderRadius: 18,
    backgroundColor: "#064e3b",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  cricketHeroText: {
    flex: 1,
    gap: 3
  },
  cricketEyebrow: {
    color: "#a7f3d0",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  cricketTitle: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: "900"
  },
  cricketSubtitle: {
    color: "#d1fae5",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17
  },
  cricketRefresh: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981"
  },
  cricketAmountRow: {
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  cricketAmountLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "900"
  },
  cricketAmountInput: {
    width: 120,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right"
  },
  cricketMessage: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "800"
  },
  cricketError: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "800"
  },
  cricketCard: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  },
  cricketCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10
  },
  cricketMatchTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "900"
  },
  cricketTeams: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  cricketStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  cricketStatusLive: {
    backgroundColor: "#dcfce7"
  },
  cricketStatusClosed: {
    backgroundColor: colors.dangerSoft
  },
  cricketStatusText: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "900"
  },
  cricketOverText: {
    color: "#047857",
    fontSize: 13,
    fontWeight: "900"
  },
  cricketBetGroup: {
    gap: 8
  },
  cricketBetTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "900"
  },
  cricketOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  cricketOption: {
    minWidth: 74,
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0"
  },
  cricketOptionDisabled: {
    opacity: 0.45
  },
  cricketOptionText: {
    color: "#064e3b",
    fontSize: 12,
    fontWeight: "900"
  },
  cricketRateText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "800"
  },
  noticeStrip: {
    backgroundColor: colors.warningSoft,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  noticeMarqueeWindow: {
    flex: 1,
    minHeight: 20,
    overflow: "hidden"
  },
  noticeMeasureText: {
    position: "absolute",
    left: -9999,
    top: -9999,
    opacity: 0,
    color: colors.warning,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17
  },
  noticeText: {
    alignSelf: "flex-start",
    color: colors.warning,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    paddingRight: 24,
    minWidth: "100%",
    flexShrink: 0
  },
  noticeTextHidden: {
    opacity: 0
  },
  noticeTextVisible: {
    opacity: 1
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
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 15,
      gap: 10,
      borderWidth: 1,
      minHeight: 154,
      shadowColor: colors.shadow,
      shadowOpacity: 0.1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 5
    },
  marketGradientWithAction: {
      justifyContent: "flex-start"
    },
  marketGradientStatic: {
      justifyContent: "space-between",
      paddingBottom: 18
    },
  marketGradientOpen: {
      backgroundColor: colors.cardTint,
      borderColor: colors.border
    },
  marketGradientClosed: {
      backgroundColor: colors.dangerSoft,
      borderColor: colors.dangerBorder,
      shadowOpacity: 0.08
    },
  marketHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 0
      },
  marketIdentity: {
      flex: 1,
      justifyContent: "center"
    },
  marketTitleRow: {
      justifyContent: "center"
    },
  marketName: {
      color: colors.textPrimary,
      fontSize: 17,
      fontWeight: "900",
      textTransform: "uppercase",
      lineHeight: 22
    },
  resultBadge: {
      minWidth: 122,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderWidth: 1,
      alignItems: "flex-end",
      justifyContent: "center"
    },
  resultBadgeOpen: {
      backgroundColor: colors.surface,
      borderColor: colors.borderStrong
    },
  resultBadgeClosed: {
      backgroundColor: "#fffaf8",
      borderColor: colors.dangerBorder
    },
  resultBadgePending: {
    backgroundColor: colors.surfaceAlt
  },
  marketState: {
      fontSize: 14,
      fontWeight: "800",
      lineHeight: 18
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
        gap: 10,
        marginTop: 0
      },
  marketStatusWrap: {
        flex: 1,
        gap: 2,
        justifyContent: "center",
        minHeight: 44
      },
     timeInlineText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: "600",
        lineHeight: 17
      },
  chartWrap: {
      width: 48,
      alignItems: "flex-end",
      justifyContent: "center"
    },
  chartIconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center"
    },
  chartIconButtonOpen: {
      backgroundColor: colors.accent
    },
  chartIconButtonClosed: {
      backgroundColor: "#20b7a8"
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
      fontSize: 19,
      fontWeight: "900",
      lineHeight: 24
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
      marginTop: 6
    },
  openButton: {
      width: "100%",
      minHeight: 46,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: "#c7f0ea"
    },
    openButtonText: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: "800"
    }
});
