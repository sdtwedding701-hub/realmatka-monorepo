import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackHeader } from "@/components/ui";
import { colors } from "@/theme/colors";

const allBetBoards = [
  { title: "Single Digit", color: "#7e22ce" },
  { title: "Single Digit Bulk", color: "#3b82f6" },
  { title: "Jodi Digit", color: "#2dd4bf" },
  { title: "Jodi Digit Bulk", color: "#a21caf" },
  { title: "Single Pana", color: "#22c55e" },
  { title: "Single Pana Bulk", color: "#38bdf8" },
  { title: "Double Pana", color: "#7c3aed" },
  { title: "Double Pana Bulk", color: "#2563eb" },
  { title: "Triple Pana", color: "#fb923c" },
  { title: "Half Sangam", color: "#84cc16" },
  { title: "Full Sangam", color: "#2dd4bf" },
  { title: "SP Motor", color: "#f97316" },
  { title: "DP Motor", color: "#84cc16" },
  { title: "SP DP TP", color: "#22d3ee" },
  { title: "Red Bracket", color: "#ef4444" },
  { title: "Digit Based Jodi", color: "#7e22ce" }
] as const;

function normalizeMarketPhase(value?: string) {
  if (value === "close-running" || value === "closed" || value === "upcoming") {
    return value;
  }
  return "open-running";
}

function parseBlockedBoards(value?: string | string[]) {
  const source = Array.isArray(value) ? value.join("||") : String(value ?? "");
  return new Set(
    source
      .split("||")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function isBoardAvailable(boardLabel: string, marketPhase: string, blockedBoards: Set<string>) {
  if (marketPhase === "closed") {
    return false;
  }
  return !blockedBoards.has(boardLabel);
}

export default function PlaceBidDashboardScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ market?: string; label?: string; marketPhase?: string; blockedBoards?: string | string[] }>();
  const marketLabel = params.label ?? formatLabel(params.market ?? "market");
  const marketPhase = normalizeMarketPhase(params.marketPhase);
  const blockedBoards = parseBlockedBoards(params.blockedBoards);

  return (
    <View style={styles.page}>
      <BackHeader subtitle="Select betting board" title={marketLabel.toUpperCase()} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 112, 132) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {allBetBoards.map((board) => (
            <Pressable
              key={board.title}
              disabled={!isBoardAvailable(board.title, marketPhase, blockedBoards)}
              onPress={() => {
                if (!isBoardAvailable(board.title, marketPhase, blockedBoards)) {
                  return;
                }
                router.push({
                  pathname: "/place-bid/[market]/board/[board]",
                  params: {
                    market: params.market ?? "market",
                    board: slugify(board.title),
                    label: marketLabel,
                    boardLabel: board.title,
                    marketPhase: params.marketPhase ?? "",
                    blockedBoards: Array.from(blockedBoards).join("||")
                  }
                });
              }}
              style={[styles.card, !isBoardAvailable(board.title, marketPhase, blockedBoards) && styles.cardDisabled]}
            >
              <View style={[styles.iconCircle, { backgroundColor: board.color }]}>
                <Ionicons color={colors.surface} name="grid-outline" size={18} />
              </View>
              <View style={[styles.cardUnderline, { backgroundColor: board.color }]} />
              <Text style={styles.cardTitle}>{board.title}</Text>
              {!isBoardAvailable(board.title, marketPhase, blockedBoards) ? <Text style={styles.cardMeta}>Open Time Tak</Text> : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    paddingHorizontal: 10,
    paddingVertical: 16,
    paddingBottom: 28
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  card: {
    width: "47%",
    minHeight: 132,
    backgroundColor: colors.surface,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 14,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardDisabled: {
    opacity: 0.5
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  cardUnderline: {
    width: 72,
    height: 3,
    borderRadius: 999,
    marginTop: 14,
    marginBottom: 12
  },
  cardTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center"
  },
  cardMeta: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700"
  }
});
