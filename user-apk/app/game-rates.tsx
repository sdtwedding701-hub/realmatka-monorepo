import { StyleSheet, Text, View } from "react-native";
import { AppHeader, AppScreen, SurfaceCard } from "@/components/ui";
import { gameRates } from "../data/mock";
import { colors } from "@/theme/colors";

export default function GameRatesScreen() {
  return (
    <View style={styles.page}>
      <AppHeader title="Game Rates" subtitle={undefined} />
      <AppScreen showPromo={false}>
        <Text style={styles.heading}>Game Win Rates</Text>
        {gameRates.map((item) => (
          <SurfaceCard key={item.code}>
            <View style={styles.row}>
              <View style={[styles.code, { backgroundColor: item.color }]}>
                <Text style={styles.codeText}>{item.code}</Text>
              </View>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>Rs {item.value}</Text>
            </View>
          </SurfaceCard>
        ))}
      </AppScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background
  },
  heading: {
    textAlign: "center",
    color: "#111827",
    fontSize: 22,
    fontWeight: "900"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  code: {
    width: 48,
    height: 36,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  codeText: {
    color: colors.surface,
    fontWeight: "800"
  },
  label: {
    flex: 1,
    color: "#111827",
    fontSize: 16,
    fontWeight: "700"
  },
  value: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800"
  }
});
