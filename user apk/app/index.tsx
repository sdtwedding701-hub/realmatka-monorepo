import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAppState } from "@/lib/app-state";
import { colors } from "@/theme/colors";

export default function IndexRoute() {
  const { loading, isAuthenticated } = useAppState();

  useEffect(() => {
    if (loading) {
      return;
    }

    router.replace(isAuthenticated ? "/(tabs)" : "/auth/login");
  }, [loading, isAuthenticated]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}
