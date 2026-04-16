import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAppState } from "@/lib/app-state";
import { colors } from "@/theme/colors";

export default function TabsLayout() {
  const { loading, isAuthenticated } = useAppState();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        lazy: true,
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          display: "none",
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 44,
          height: 74,
          paddingBottom: 12,
          paddingTop: 10,
          borderRadius: 12,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: "#e5e7eb",
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
          shadowColor: "transparent"
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700"
        },
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
            history: "document-text-outline",
            bids: "refresh-outline",
            index: "home-outline",
            wallet: "wallet-outline",
            chat: "chatbubble-ellipses-outline"
          };

          return <Ionicons color={color} name={iconMap[route.name] || "ellipse-outline"} size={size} />;
        }
      })}
    >
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="bids" options={{ title: "All Bids" }} />
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="wallet" options={{ title: "Wallet" }} />
      <Tabs.Screen name="chat" options={{ title: "Chat" }} />
    </Tabs>
  );
}
