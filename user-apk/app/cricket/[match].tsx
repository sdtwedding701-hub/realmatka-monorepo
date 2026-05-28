import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackHeader, SurfaceCard } from "@/components/ui";
import { api, formatApiError, type CricketMatch, type CricketMatchesPayload } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { colors } from "@/theme/colors";

const MARKET_COPY = {
  toss_winner: {
    title: "Toss Winner",
    subtitle: "Toss betting match start se pehle close hogi."
  },
  match_winner: {
    title: "Match Winner",
    subtitle: "Final match winner par bet place karo."
  }
} as const;

export default function CricketMatchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ match?: string; title?: string }>();
  const { sessionToken, reloadSessionData, loadCricketHistory } = useAppState();
  const [data, setData] = useState<CricketMatchesPayload>({ rates: {}, matches: [] });
  const [amount, setAmount] = useState("100");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const match = useMemo(
    () => data.matches.find((item) => item.id === params.match) || null,
    [data.matches, params.match]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");
      setData(await api.cricketMatches());
    } catch (error) {
      setMessage(formatApiError(error, "Cricket match load nahi hua."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function placeBet(targetMatch: CricketMatch, marketType: string, selection: string) {
    if (!sessionToken) {
      setMessage("Login required.");
      return;
    }
    const betAmount = Number(amount || 0);
    if (!Number.isFinite(betAmount) || betAmount <= 0) {
      setMessage("Valid amount enter karo.");
      return;
    }
    try {
      setMessage("");
      await api.placeCricketBet(sessionToken, { matchId: targetMatch.id, marketType, selection, amount: betAmount });
      setMessage(`${getTeamName(targetMatch, selection)} bet placed successfully.`);
      await Promise.allSettled([reloadSessionData({ force: true }), loadCricketHistory({ force: true }), load()]);
    } catch (error) {
      setMessage(formatApiError(error, "Cricket bet place nahi hui."));
    }
  }

  return (
    <View style={styles.page}>
      <BackHeader subtitle="Cricket winner market" title={String(params.title || match?.title || "Play Cricket").toUpperCase()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 112, 132) }]} showsVerticalScrollIndicator={false}>
        {loading ? (
          <SurfaceCard>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.stateText}>Cricket match load ho raha hai...</Text>
          </SurfaceCard>
        ) : match ? (
          <>
            <View style={styles.matchHero}>
              <View style={styles.matchHeroCopy}>
                <Text style={styles.matchTitle}>{match.teamA} vs {match.teamB}</Text>
                <Text style={styles.matchSub}>{match.title}</Text>
                <Text style={styles.matchOver}>{formatStart(match.startAt)}</Text>
              </View>
              <View style={styles.ratePill}>
                <Text style={styles.ratePillText}>1.8x</Text>
              </View>
            </View>

            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Bet Amount</Text>
              <TextInput
                keyboardType="numeric"
                onChangeText={(value) => setAmount(value.replace(/[^0-9]/g, ""))}
                placeholder="100"
                style={styles.amountInput}
                value={amount}
              />
            </View>

            {message ? <Text style={message.includes("success") || message.includes("placed") ? styles.successMessage : styles.errorMessage}>{message}</Text> : null}

            <CricketWinnerGroup match={match} marketType="toss_winner" onPlaceBet={placeBet} />
            <CricketWinnerGroup match={match} marketType="match_winner" onPlaceBet={placeBet} />
          </>
        ) : (
          <SurfaceCard>
            <Text style={styles.emptyTitle}>Match available nahi hai</Text>
            <Text style={styles.emptySub}>Admin panel se cricket match open karo.</Text>
          </SurfaceCard>
        )}
      </ScrollView>
    </View>
  );
}

function CricketWinnerGroup({
  match,
  marketType,
  onPlaceBet
}: {
  match: CricketMatch;
  marketType: "toss_winner" | "match_winner";
  onPlaceBet: (match: CricketMatch, marketType: string, selection: string) => void;
}) {
  const market = match.markets?.[marketType];
  const isOpen = Boolean(market?.open);
  const winner = marketType === "toss_winner" ? match.tossWinner : match.matchWinner;
  return (
    <View style={styles.boardCard}>
      <View style={styles.boardHeader}>
        <View style={styles.boardIcon}>
          <Ionicons color={colors.surface} name={marketType === "toss_winner" ? "disc-outline" : "trophy-outline"} size={18} />
        </View>
        <View style={styles.boardCopy}>
          <Text style={styles.boardTitle}>{MARKET_COPY[marketType].title}</Text>
          <Text style={styles.boardSubtitle}>{winner ? `Result: ${getTeamName(match, winner)}` : isOpen ? `Close: ${formatStart(market?.closeAt || null)}` : "Betting closed"}</Text>
        </View>
        <View style={[styles.statusPill, isOpen ? styles.statusLive : styles.statusClosed]}>
          <Text style={styles.statusText}>{isOpen ? "OPEN" : "CLOSED"}</Text>
        </View>
      </View>
      <Text style={styles.helperText}>{MARKET_COPY[marketType].subtitle}</Text>
      <View style={styles.options}>
        <Pressable disabled={!isOpen} onPress={() => onPlaceBet(match, marketType, "team_a")} style={[styles.optionButton, !isOpen && styles.optionDisabled]}>
          <Text style={styles.optionText}>{match.teamA} Win</Text>
          <Text style={styles.rateText}>1.8x</Text>
        </Pressable>
        <Pressable disabled={!isOpen} onPress={() => onPlaceBet(match, marketType, "team_b")} style={[styles.optionButton, !isOpen && styles.optionDisabled]}>
          <Text style={styles.optionText}>{match.teamB} Win</Text>
          <Text style={styles.rateText}>1.8x</Text>
        </Pressable>
      </View>
    </View>
  );
}

function getTeamName(match: CricketMatch, selection: string) {
  if (selection === "team_a") return match.teamA;
  if (selection === "team_b") return match.teamB;
  if (selection === "cancel") return "Refund";
  return selection;
}

function formatStart(value: string | null) {
  if (!value) return "Time not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time not set";
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 14, paddingVertical: 16, gap: 14 },
  stateText: { color: colors.textMuted, textAlign: "center", fontWeight: "700" },
  matchHero: {
    borderRadius: 20,
    backgroundColor: "#064e3b",
    borderWidth: 1,
    borderColor: "#10b981",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  matchHeroCopy: { flex: 1 },
  matchTitle: { color: colors.surface, fontSize: 24, fontWeight: "900" },
  matchSub: { color: "#d1fae5", fontSize: 13, fontWeight: "800", marginTop: 4 },
  matchOver: { color: "#a7f3d0", fontSize: 13, fontWeight: "900", marginTop: 8 },
  ratePill: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#dcfce7" },
  ratePillText: { color: "#166534", fontSize: 14, fontWeight: "900" },
  statusPill: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  statusLive: { backgroundColor: "#dcfce7" },
  statusClosed: { backgroundColor: colors.dangerSoft },
  statusText: { color: "#166534", fontSize: 10, fontWeight: "900" },
  amountRow: {
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  amountLabel: { color: colors.textPrimary, fontSize: 14, fontWeight: "900" },
  amountInput: {
    width: 130,
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
  successMessage: { color: colors.success, fontSize: 13, fontWeight: "900" },
  errorMessage: { color: colors.danger, fontSize: 13, fontWeight: "900" },
  boardCard: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12
  },
  boardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  boardIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent },
  boardCopy: { flex: 1, gap: 2 },
  boardTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: "900" },
  boardSubtitle: { color: colors.textSecondary, fontSize: 11, fontWeight: "800" },
  helperText: { color: colors.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 17 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  optionButton: {
    width: "47%",
    minHeight: 74,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 8
  },
  optionDisabled: { opacity: 0.45 },
  optionText: { color: "#064e3b", fontSize: 15, fontWeight: "900", textAlign: "center" },
  rateText: { color: "#059669", fontSize: 14, fontWeight: "900", marginTop: 4 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "900" },
  emptySub: { color: colors.danger, fontSize: 14, fontWeight: "700", marginTop: 8 }
});
