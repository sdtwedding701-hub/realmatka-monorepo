import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { colors } from "@/theme/colors";

export default function WalletHistoryRoute() {
  const params = useLocalSearchParams();

  useEffect(() => {
    router.replace({
      pathname: "/(tabs)/history",
      params
    } as never);
  }, [params]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}
