import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppHeader, AppScreen, SurfaceCard } from "@/components/ui";
import { useAppState } from "@/lib/app-state";
import { getAddFundUnsupportedMessage, isSupportedAddFundPlatform } from "@/lib/payment-platform";
import { colors } from "@/theme/colors";

const walletActions = [
  { title: "Add Fund", href: "/wallet/add-fund", icon: "wallet-outline", tone: "#ec4899" },
  { title: "Withdraw Fund", href: "/wallet/withdraw", icon: "cash-outline", tone: "#9333ea" },
  { title: "Deposit & Withdraw History", href: "/wallet/history", icon: "time-outline", tone: "#d97706" },
  { title: "Add Bank Details", href: "/wallet/add-bank-details", icon: "business-outline", tone: "#22c55e" }
] as const;

export default function WalletScreen() {
  const { walletBalance } = useAppState();
  const addFundSupported = isSupportedAddFundPlatform();

  return (
    <View style={styles.page}>
      <AppHeader title="Wallet" subtitle={undefined} rightLabel={`Rs ${walletBalance}`} />
      <AppScreen showPromo={false}>
        <View style={styles.list}>
          {walletActions.map((item) => {
            const isAddFund = item.href === "/wallet/add-fund";
            const disabled = isAddFund && !addFundSupported;

            return (
            <Pressable
              key={item.title}
              disabled={disabled}
              onPress={() => {
                if (disabled) {
                  return;
                }
                router.push(item.href as never);
              }}
            >
              <SurfaceCard style={styles.actionCard}>
                <View style={[styles.actionRow, disabled && styles.actionRowDisabled]}>
                  <View style={[styles.actionIconWrap, { borderColor: item.tone }]}>
                    <View style={[styles.actionIcon, { backgroundColor: item.tone }]}>
                      <Ionicons color={colors.surface} name={item.icon} size={20} />
                    </View>
                  </View>
                  <View style={styles.actionCopy}>
                    <Text style={styles.actionText}>{item.title}</Text>
                    {disabled ? <Text style={styles.actionHint}>{getAddFundUnsupportedMessage()}</Text> : null}
                  </View>
                  <Ionicons color="#98a2b3" name="chevron-forward" size={18} />
                </View>
              </SurfaceCard>
            </Pressable>
          );
          })}
        </View>
      </AppScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background
  },
  list: {
    gap: 12
  },
  actionCard: {
    paddingVertical: 14
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  actionRowDisabled: {
    opacity: 0.55
  },
  actionCopy: {
    flex: 1
  },
  actionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff"
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center"
  },
  actionText: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "800"
  },
  actionHint: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15
  }
});
