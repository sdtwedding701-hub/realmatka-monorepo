import { StyleSheet, Text, View } from "react-native";
import { AppHeader, AppScreen, SurfaceCard } from "@/components/ui";
import { colors } from "@/theme/colors";
import { rules } from "../data/mock";

const highlights = [
  "Minimum bid is 5 points",
  "Maximum bid is 10,000 points",
  "Withdraw request timing: 10:00 AM to 11:00 PM",
  "Verified bank account mandatory for withdraw"
] as const;

export default function RulesScreen() {
  return (
    <View style={styles.page}>
      <AppHeader title="Terms & Conditions" />
      <AppScreen showPromo={false}>
        <SurfaceCard>
          <Text style={styles.heading}>Quick Rules</Text>
          <View style={styles.highlightGrid}>
            {highlights.map((item) => (
              <View key={item} style={styles.highlightCard}>
                <Text style={styles.highlightText}>{item}</Text>
              </View>
            ))}
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <Text style={styles.sectionTitle}>Important Notice</Text>
          {rules.map((rule, index) => (
            <View key={rule} style={styles.ruleRow}>
              <View style={styles.iconWrap}>
                <Text style={styles.icon}>{index + 1}</Text>
              </View>
              <Text style={styles.rule}>{rule}</Text>
            </View>
          ))}
        </SurfaceCard>
      </AppScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  heading: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "800"
  },
  sectionTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "800"
  },
  highlightGrid: {
    gap: 10
  },
  highlightCard: {
    borderRadius: 16,
    backgroundColor: "#f7faf9",
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14
  },
  highlightText: {
    color: "#344054",
    lineHeight: 20,
    fontWeight: "700"
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1
  },
  icon: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  rule: {
    flex: 1,
    color: "#344054",
    fontSize: 14,
    lineHeight: 22
  }
});
