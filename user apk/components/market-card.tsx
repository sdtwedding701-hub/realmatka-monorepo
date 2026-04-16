import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";

type MarketCardData = {
  name: string;
  category?: string;
  result: string;
  status: string;
  action: string;
  actionTone: "success" | "danger";
  open: string;
  close: string;
  highlight?: string;
};

export function MarketCard({
  market,
  onPress,
  onCirclePress
}: {
  market: MarketCardData;
  onPress?: () => void;
  onCirclePress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.topMetaRow}>
        {market.category ? <Text style={styles.topTag}>{market.category}</Text> : <View />}
        {market.highlight ? <Text style={styles.topHighlight}>{market.highlight}</Text> : null}
      </View>
      <View style={styles.row}>
        <View style={styles.titleWrap}>
          <Text style={styles.name}>{market.name}</Text>
          <Text style={styles.category}>{market.status}</Text>
        </View>
        <Text style={styles.result}>{market.result}</Text>
      </View>
      <View style={styles.footer}>
        <View>
          <Text style={styles.label}>Open</Text>
          <Text style={styles.value}>{market.open}</Text>
        </View>
        <View>
          <Text style={styles.label}>Close</Text>
          <Text style={styles.value}>{market.close}</Text>
        </View>
        <View style={styles.rightActions}>
          <Pressable onPress={onCirclePress} style={styles.circleAction}>
            <Ionicons color={colors.primary} name="planet-outline" size={18} />
          </Pressable>
          <View style={[styles.badge, market.actionTone === "success" ? styles.successBadge : styles.dangerBadge]}>
            <Text style={[styles.badgeText, market.actionTone === "success" ? styles.successBadgeText : styles.dangerBadgeText]}>{market.action}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e8ecf5",
    shadowColor: "#1e3a8a",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  topMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  topTag: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    backgroundColor: "#eef2ff",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  topHighlight: {
    color: "#0a9f5a",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  titleWrap: {
    flex: 1,
    gap: 2
  },
  name: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  category: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  result: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: "800"
  },
  successText: {
    color: "#84a600"
  },
  dangerText: {
    color: "#ef4444"
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12
  },
  rightActions: {
    alignItems: "flex-end",
    gap: 10
  },
  circleAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  label: {
    fontSize: 11,
    color: colors.muted
  },
  value: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2937"
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  successBadge: {
    backgroundColor: "#e7fbef"
  },
  dangerBadge: {
    backgroundColor: "#ffe9ec"
  },
  badgeText: {
    fontWeight: "800",
    fontSize: 13
  },
  successBadgeText: {
    color: "#1d9f57"
  },
  dangerBadgeText: {
    color: "#e15767"
  }
});
