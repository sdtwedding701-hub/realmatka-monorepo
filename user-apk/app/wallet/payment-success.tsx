import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { api, formatApiError } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { colors } from "@/theme/colors";

const STATUS_POLL_ATTEMPTS = 4;
const STATUS_POLL_DELAY_MS = 2_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PaymentSuccessRoute() {
  const params = useLocalSearchParams();
  const { sessionToken, reloadSessionData, loadWalletHistory } = useAppState();

  useEffect(() => {
    const referenceId = typeof params.referenceId === "string" ? params.referenceId : "";
    const amount = typeof params.amount === "string" ? params.amount : "";
    let active = true;

    const redirectToHistory = (extras: Record<string, string>) => {
      if (!active) {
        return;
      }

      router.replace({
        pathname: "/wallet/history",
        params: {
          payment: "success",
          reference: referenceId,
          amount,
          ...extras
        }
      } as never);
    };

    void (async () => {
      if (!sessionToken || !referenceId) {
        redirectToHistory({});
        return;
      }

      for (let attempt = 0; attempt < STATUS_POLL_ATTEMPTS; attempt += 1) {
        try {
          const next = await api.getPaymentOrderStatus(sessionToken, referenceId);
          const normalized = String(next.remoteStatus || next.status || "")
            .trim()
            .toUpperCase();

          if (normalized === "SUCCESS" || normalized === "PAID") {
            await reloadSessionData({ force: true });
            await loadWalletHistory({ force: true });
            redirectToHistory({});
            return;
          }

          if (normalized === "FAILED" || normalized === "CANCELLED" || normalized === "EXPIRED") {
            redirectToHistory({
              payment: "failed",
              error: `Payment ${normalized.toLowerCase()} ho gaya.`
            });
            return;
          }
        } catch (error) {
          if (attempt === STATUS_POLL_ATTEMPTS - 1) {
            redirectToHistory({
              error: formatApiError(error, "Amount not credited. App ko close karke phir se start karo.")
            });
            return;
          }
        }

        await sleep(STATUS_POLL_DELAY_MS);
      }

      redirectToHistory({
        error: "Amount not credited. App ko close karke phir se start karo."
      });
    })();

    return () => {
      active = false;
    };
  }, [loadWalletHistory, params.amount, params.referenceId, reloadSessionData, sessionToken]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={{ marginTop: 14, color: colors.textSecondary, fontWeight: "700" }}>Payment verify ho raha hai...</Text>
    </View>
  );
}
