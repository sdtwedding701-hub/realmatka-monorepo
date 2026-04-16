import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppHeader, AppScreen, SurfaceCard } from "@/components/ui";
import { colors } from "@/theme/colors";

export default function BonusScreen() {
  const [tab, setTab] = useState<"available" | "history">("available");

  return (
    <View style={styles.page}>
      <AppHeader title="Bonus" />
      <AppScreen>
        <SurfaceCard>
          <Text style={styles.title}>Bonuses & Promotions</Text>
          <Text style={styles.subtitle}>Refer, seasonal offer, aur admin rewards yahan reflect honge.</Text>
        </SurfaceCard>

        <View style={styles.tabWrap}>
          <Pressable onPress={() => setTab("available")} style={[styles.tab, tab === "available" && styles.tabActive]}>
            <Text style={[styles.tabText, tab === "available" && styles.tabTextActive]}>Bonus Available</Text>
          </Pressable>
          <Pressable onPress={() => setTab("history")} style={[styles.tab, tab === "history" && styles.tabActive]}>
            <Text style={[styles.tabText, tab === "history" && styles.tabTextActive]}>Bonus History</Text>
          </Pressable>
        </View>

        <SurfaceCard>
          <View style={styles.emptyWrap}>
            <View style={styles.giftCircle}>
              <Ionicons color={colors.accent} name="gift-outline" size={28} />
            </View>
            <Text style={styles.emptyText}>{tab === "available" ? "No bonuses available" : "No bonus history available"}</Text>
          </View>
        </SurfaceCard>
      </AppScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background
  },
  title: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800"
  },
  subtitle: {
    color: "#667085",
    lineHeight: 20
  },
  tabWrap: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 999,
    padding: 2
  },
  tab: {
    flex: 1,
    minHeight: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center"
  },
  tabActive: {
    backgroundColor: colors.primary
  },
  tabText: {
    color: "#111827",
    fontWeight: "600"
  },
  tabTextActive: {
    color: colors.surface
  },
  emptyWrap: {
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  giftCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center"
  },
  emptyText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600"
  }
});
