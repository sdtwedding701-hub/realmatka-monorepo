import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, AppState, AppStateStatus, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppScreen, BackHeader, SurfaceCard } from "@/components/ui";
import { api, type PaymentOrder } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { colors } from "@/theme/colors";

const QUICK_AMOUNTS = [100, 200, 500, 1000];
const MIN_DEPOSIT_AMOUNT = 1;
const PAYMENT_STATUS_REFRESH_MS = 10_000;

function statusTone(status: string) {
  const normalized = status.trim().toUpperCase();
  if (normalized === "SUCCESS" || normalized === "PAID") {
    return styles.statusSuccess;
  }
  if (normalized === "FAILED" || normalized === "CANCELLED" || normalized === "EXPIRED") {
    return styles.statusDanger;
  }
  return styles.statusPending;
}

export default function AddFundScreen() {
  const { sessionToken, walletBalance, reloadSessionData } = useAppState();
  const [amount, setAmount] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingOrder, setPendingOrder] = useState<PaymentOrder | null>(null);

  const numericAmount = Number(amount || 0);
  const hasValidAmount = Number.isFinite(numericAmount) && numericAmount >= MIN_DEPOSIT_AMOUNT;
  const displayStatus = useMemo(() => pendingOrder?.remoteStatus || pendingOrder?.status || "", [pendingOrder]);

  const pollPaymentStatus = useCallback(
    async (referenceId: string, { silent = false } = {}) => {
      if (!sessionToken) {
        return null;
      }

      try {
        if (!silent) {
          setCheckingStatus(true);
        }
        const next = await api.getPaymentOrderStatus(sessionToken, referenceId);
        setPendingOrder(next);

        const normalized = String(next.remoteStatus || next.status || "")
          .trim()
          .toUpperCase();

        if (normalized === "SUCCESS" || normalized === "PAID") {
          await reloadSessionData();
          setSuccessMessage(`Deposit successful. Reference ${next.reference} wallet history me aa gaya hai.`);
          router.replace({
            pathname: "/wallet/history",
            params: { payment: "success", reference: next.reference }
          } as never);
        } else if (normalized === "FAILED" || normalized === "CANCELLED" || normalized === "EXPIRED") {
          setError(`Payment ${normalized.toLowerCase()} ho gaya. Zarurat ho to dobara try karo.`);
        }

        return next;
      } catch (statusError) {
        setError(statusError instanceof Error ? statusError.message : "Payment status check nahi hua.");
        return null;
      } finally {
        if (!silent) {
          setCheckingStatus(false);
        }
      }
    },
    [reloadSessionData, sessionToken]
  );

  useFocusEffect(
    useCallback(() => {
      if (!pendingOrder?.reference) {
        return;
      }

      let active = true;
      void pollPaymentStatus(pendingOrder.reference, { silent: true });

      const interval = setInterval(() => {
        if (active) {
          void pollPaymentStatus(pendingOrder.reference, { silent: true });
        }
      }, PAYMENT_STATUS_REFRESH_MS);

      return () => {
        active = false;
        clearInterval(interval);
      };
    }, [pendingOrder?.reference, pollPaymentStatus])
  );

  useEffect(() => {
    if (!pendingOrder?.reference) {
      return;
    }

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        void pollPaymentStatus(pendingOrder.reference, { silent: true });
      }
    };

    const subscription = AppState.addEventListener("change", handleAppState);
    return () => {
      subscription.remove();
    };
  }, [pendingOrder?.reference, pollPaymentStatus]);

  return (
    <View style={styles.page}>
      <BackHeader title="Add Fund" subtitle="Razorpay test payment link se wallet top-up karo." />
      <AppScreen showPromo={false}>
        <SurfaceCard style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons color={colors.surface} name="wallet-outline" size={22} />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroValue}>Rs {walletBalance}</Text>
            <Text style={styles.heroLabel}>Current wallet balance</Text>
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <Text style={styles.sectionTitle}>Deposit Amount</Text>
          <View style={styles.inputRow}>
            <Text style={styles.currencyPrefix}>Rs</Text>
            <TextInput
              keyboardType="numeric"
              onChangeText={(value) => {
                setAmount(value.replace(/[^0-9]/g, ""));
                setError("");
                setSuccessMessage("");
              }}
              placeholder="Enter amount"
              placeholderTextColor={colors.textMuted}
              style={styles.amountInput}
              value={amount}
            />
          </View>

          <View style={styles.quickGrid}>
            {QUICK_AMOUNTS.map((quickAmount) => {
              const active = String(quickAmount) === amount;
              return (
                <Pressable
                  key={quickAmount}
                  onPress={() => {
                    setAmount(String(quickAmount));
                    setError("");
                    setSuccessMessage("");
                  }}
                  style={[styles.quickChip, active && styles.quickChipActive]}
                >
                  <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>Rs {quickAmount}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.helperText}>Minimum deposit Rs 1 hai. Payment browser ya Razorpay page me open hoga.</Text>
        </SurfaceCard>

        {pendingOrder ? (
          <SurfaceCard style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Text style={styles.sectionTitle}>Pending Payment</Text>
              <Text style={[styles.statusBadge, statusTone(displayStatus)]}>{displayStatus || "PENDING"}</Text>
            </View>
            <View style={styles.statusMeta}>
              <Text style={styles.statusLine}>Reference: {pendingOrder.reference}</Text>
              <Text style={styles.statusLine}>Amount: Rs {pendingOrder.amount.toFixed(2)}</Text>
            </View>
            <View style={styles.statusActions}>
              <Pressable
                disabled={checkingStatus}
                onPress={() => void pollPaymentStatus(pendingOrder.reference)}
                style={[styles.secondaryButton, checkingStatus && styles.disabledButton]}
              >
                {checkingStatus ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.secondaryButtonText}>Check Status</Text>}
              </Pressable>
              <Pressable
                onPress={() => {
                  void Linking.openURL(pendingOrder.redirectUrl).catch(() => {
                    setError("Checkout link browser me open nahi hua.");
                  });
                }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Open Checkout</Text>
              </Pressable>
            </View>
          </SurfaceCard>
        ) : null}

        {successMessage ? (
          <SurfaceCard style={styles.messageCard}>
            <Text style={styles.successText}>{successMessage}</Text>
          </SurfaceCard>
        ) : null}

        {error ? (
          <SurfaceCard style={styles.messageCard}>
            <Text style={styles.errorText}>{error}</Text>
          </SurfaceCard>
        ) : null}

        <SurfaceCard>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.steps}>
            <Text style={styles.stepText}>1. Amount enter karo aur payment link generate karo.</Text>
            <Text style={styles.stepText}>2. Browser me Razorpay checkout complete karo.</Text>
            <Text style={styles.stepText}>3. App me wapas aakar status refresh karo.</Text>
          </View>
        </SurfaceCard>

        <View style={styles.footerActions}>
          <Pressable
            disabled={!hasValidAmount || submitting || !sessionToken}
            onPress={() => void startDeposit()}
            style={[styles.primaryButton, (!hasValidAmount || submitting || !sessionToken) && styles.disabledButton]}
          >
            {submitting ? <ActivityIndicator color={colors.surface} size="small" /> : <Text style={styles.primaryButtonText}>Generate Payment Link</Text>}
          </Pressable>

          <Pressable onPress={() => router.push("/wallet/history")} style={styles.historyButton}>
            <Text style={styles.historyButtonText}>View Wallet History</Text>
          </Pressable>
        </View>
      </AppScreen>
    </View>
  );

  async function startDeposit() {
    if (!sessionToken) {
      setError("Login required");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount < MIN_DEPOSIT_AMOUNT) {
      setError("Valid deposit amount dalo.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      const order = await api.createPaymentOrder(sessionToken, numericAmount, Platform.OS === "web" ? "web" : "app");
      setPendingOrder(order);
      await Linking.openURL(order.redirectUrl);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Payment start nahi hua.");
    } finally {
      setSubmitting(false);
    }
  }
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  heroCopy: {
    flex: 1
  },
  heroValue: {
    color: colors.primaryDark,
    fontSize: 26,
    fontWeight: "900"
  },
  heroLabel: {
    color: colors.textSecondary,
    fontWeight: "700"
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800"
  },
  inputRow: {
    minHeight: 58,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8
  },
  currencyPrefix: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900"
  },
  amountInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "900"
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  quickChip: {
    minWidth: 78,
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  quickChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  quickChipText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800"
  },
  quickChipTextActive: {
    color: colors.surface
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18
  },
  statusCard: {
    gap: 14
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden"
  },
  statusPending: {
    backgroundColor: colors.warningSoft,
    color: colors.warning
  },
  statusSuccess: {
    backgroundColor: colors.successSoft,
    color: colors.success
  },
  statusDanger: {
    backgroundColor: colors.dangerSoft,
    color: colors.danger
  },
  statusMeta: {
    gap: 5
  },
  statusLine: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600"
  },
  statusActions: {
    flexDirection: "row",
    gap: 10
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 16
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800"
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface
  },
  secondaryButtonText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800"
  },
  disabledButton: {
    opacity: 0.6
  },
  messageCard: {
    gap: 0
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19
  },
  steps: {
    gap: 8
  },
  stepText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19
  },
  footerActions: {
    gap: 10
  },
  historyButton: {
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  historyButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "800"
  }
});
