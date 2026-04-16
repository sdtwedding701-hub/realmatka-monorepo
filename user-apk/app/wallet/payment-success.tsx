import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { colors } from "@/theme/colors";

export default function PaymentSuccessRoute() {
  const params = useLocalSearchParams();

  useEffect(() => {
    router.replace({
      pathname: "/wallet/history",
      params: {
        payment: "success",
        reference: typeof params.referenceId === "string" ? params.referenceId : "",
        amount: typeof params.amount === "string" ? params.amount : ""
      }
    } as never);
  }, [params.amount, params.referenceId]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}
