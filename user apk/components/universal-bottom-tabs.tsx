import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/lib/app-state";
import { colors } from "@/theme/colors";

const tabs = [
  { key: "history", label: "History", icon: "document-text-outline", href: "/history" },
  { key: "bids", label: "All Bids", icon: "refresh-outline", href: "/bids" },
  { key: "home", label: "Home", icon: "home-outline", href: "/" },
  { key: "wallet", label: "Wallet", icon: "wallet-outline", href: "/wallet" },
  { key: "chat", label: "Chat", icon: "chatbubble-ellipses-outline", href: "/chat" }
] as const;

const hiddenExactPaths = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/otp-login",
  "/auth/forgot-password",
  "/wallet/add-fund",
  "/wallet/payment-redirect"
]);

export function UniversalBottomTabs() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAppState();

  if (!isAuthenticated || shouldHideTabs(pathname)) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <View pointerEvents="none" style={[styles.systemNavBlocker, { height: Math.max(insets.bottom + 18, 30) }]} />
      <View style={[styles.tabBar, { bottom: Math.max(insets.bottom + 14, 20) }]}>
        {tabs.map((tab) => {
          const active = isActivePath(pathname, tab.href);

          return (
            <Pressable
              key={tab.key}
              onPress={() => router.replace(tab.href as never)}
              style={[styles.tabButton, active && styles.tabButtonActive]}
            >
              <Ionicons color={active ? colors.primary : colors.muted} name={tab.icon} size={20} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function shouldHideTabs(pathname: string) {
  if (hiddenExactPaths.has(pathname)) {
    return true;
  }

  if (pathname.startsWith("/place-bid/")) {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 2) {
      return true;
    }
  }

  if (pathname === "/place-bid") {
    return true;
  }

  return false;
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" || pathname === "/home";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999
  },
  systemNavBlocker: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background
  },
  tabBar: {
    position: "absolute",
    left: 12,
    right: 12,
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 8,
    zIndex: 9999,
    elevation: 9999
  },
  tabButton: {
    flex: 1,
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 10
  },
  tabButtonActive: {
    backgroundColor: "#f6f8ff"
  },
  tabLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700"
  },
  tabLabelActive: {
    color: colors.primary
  }
});
