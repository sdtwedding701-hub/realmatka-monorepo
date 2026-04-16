import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppState } from "@/lib/app-state";
import { colors } from "@/theme/colors";

const MIN_WITHDRAW_AMOUNT = 1;

export default function WithdrawScreen() {
  const insets = useSafeAreaInsets();
  const { walletBalance, requestWithdrawOtp, confirmWithdraw, bankAccounts, walletEntries } = useAppState();
  const latestBank = useMemo(() => bankAccounts[0] ?? null, [bankAccounts]);
  const pendingWithdraw = useMemo(
    () => walletEntries.find((entry) => entry.type === "WITHDRAW" && (entry.status === "INITIATED" || entry.status === "BACKOFFICE")) ?? null,
    [walletEntries]
  );
  const [amount, setAmount] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpMessage, setOtpMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const withdrawAmount = Number(amount || 0);
  const hasValidAmount = Number.isFinite(withdrawAmount) && withdrawAmount >= MIN_WITHDRAW_AMOUNT && withdrawAmount <= walletBalance;
  const hasValidOtp = otp.trim().length === 6;

  return (
    <View style={styles.overlay}>
      <Pressable onPress={() => router.back()} style={styles.backdrop} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0} style={styles.keyboardWrap}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 116, 130) }]}>
          <ScrollView bounces={false} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.handle} />
            <Text style={styles.title}>Withdraw Fund</Text>

            <View style={styles.balanceCard}>
              <View style={styles.balanceIcon}>
                <Ionicons color={colors.primary} name="wallet-outline" size={18} />
              </View>
              <View style={styles.balanceMeta}>
                <Text style={styles.balanceValue}>Rs {walletBalance}</Text>
                <Text style={styles.balanceLabel}>Total Wallet Balance</Text>
              </View>
            </View>

            {latestBank ? (
              <View style={styles.bankCard}>
                <View style={styles.bankIconWrap}>
                  <Ionicons color={colors.surface} name="card-outline" size={18} />
                </View>
                <View style={styles.bankMeta}>
                  <Text numberOfLines={1} style={styles.bankTitle}>
                    {latestBank.holderName}
                  </Text>
                  <Text style={styles.bankInfo}>A/C ending {latestBank.accountNumber.slice(-4)}</Text>
                  <Text style={styles.bankInfo}>{latestBank.ifsc}</Text>
                </View>
              </View>
            ) : (
              <Pressable onPress={() => router.push("/wallet/add-bank-details")} style={styles.emptyBankCard}>
                <Ionicons color={colors.warning} name="alert-circle-outline" size={18} />
                <Text style={styles.emptyBankText}>Withdraw request se pehle bank account add karo</Text>
              </Pressable>
            )}

            <Text style={styles.fieldLabel}>Amount</Text>
            <View style={styles.inputRow}>
              <TextInput
                keyboardType="numeric"
                onChangeText={(value) => {
                  setAmount(value.replace(/[^0-9]/g, ""));
                  setError("");
                  setSuccessMessage("");
                }}
                placeholder="Enter amount"
                placeholderTextColor="rgba(100, 116, 139, 0.5)"
                style={styles.input}
                value={amount}
              />
              <Ionicons color={colors.primary} name="cash-outline" size={18} />
            </View>
            {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {otpSent ? (
              <>
                <Text style={styles.fieldLabel}>Withdraw OTP</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    keyboardType="number-pad"
                    maxLength={6}
                    onChangeText={(value) => {
                      setOtp(value.replace(/[^0-9]/g, ""));
                      setError("");
                    }}
                    placeholder="Enter 6 digit OTP"
                    placeholderTextColor="rgba(100, 116, 139, 0.5)"
                    style={styles.input}
                    value={otp}
                  />
                  <Ionicons color={colors.primary} name="key-outline" size={18} />
                </View>
                {otpMessage ? <Text style={styles.simpleInfoText}>{otpMessage}</Text> : null}
                <Pressable
                  disabled={!hasValidAmount || !hasValidOtp || submitting}
                  onPress={() => void submitWithdraw()}
                  style={[styles.primaryButton, (!hasValidAmount || !hasValidOtp || submitting) && styles.disabledButton]}
                >
                  {submitting ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryButtonText}>Confirm Withdraw</Text>}
                </Pressable>
              </>
            ) : (
              <Pressable
                disabled={!hasValidAmount || submitting}
                onPress={() => void sendWithdrawOtp()}
                style={[styles.primaryButton, (!hasValidAmount || submitting) && styles.disabledButton]}
              >
                {submitting ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryButtonText}>Send Withdraw OTP</Text>}
              </Pressable>
            )}

            <Text style={styles.simpleInfoText}>Withdraw request ab OTP verify hone ke baad hi submit hogi.</Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
  async function sendWithdrawOtp() {
    if (pendingWithdraw) {
      setError("Already one withdraw request is pending.");
      setTimeout(() => setError(""), 5000);
      return;
    }

    if (!latestBank) {
      setError("Bank account add karo, tabhi withdraw request jayegi.");
      return;
    }

    if (!Number.isFinite(withdrawAmount) || withdrawAmount < MIN_WITHDRAW_AMOUNT) {
      setError("Valid withdraw amount dalo.");
      return;
    }

    if (withdrawAmount > walletBalance) {
      setError("Withdraw amount wallet balance se zyada nahi ho sakta.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");
      const response = await requestWithdrawOtp(withdrawAmount);
      setOtpSent(true);
      setOtp("");
      setOtpMessage(response.provider === "twilio" ? "Withdraw OTP SMS successfully sent." : "Withdraw OTP generated.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Withdraw OTP send nahi hui.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitWithdraw() {
    if (pendingWithdraw) {
      setError("Already one withdraw request is pending.");
      setTimeout(() => setError(""), 5000);
      return;
    }

    if (!latestBank) {
      setError("Bank account add karo, tabhi withdraw request jayegi.");
      return;
    }

    if (!Number.isFinite(withdrawAmount) || withdrawAmount < MIN_WITHDRAW_AMOUNT) {
      setError("Valid withdraw amount dalo.");
      return;
    }

    if (withdrawAmount > walletBalance) {
      setError("Withdraw amount wallet balance se zyada nahi ho sakta.");
      return;
    }

    if (!hasValidOtp) {
      setError("Valid 6 digit OTP dalo.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await confirmWithdraw(withdrawAmount, otp.trim());
      setSuccessMessage("Withdraw request OTP verify hone ke baad submit ho gayi.");
      setTimeout(() => {
        router.replace("/wallet/history");
      }, 700);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Withdraw request submit nahi hui.");
    } finally {
      setSubmitting(false);
    }
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.overlay
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject
  },
  keyboardWrap: {
    justifyContent: "flex-end"
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10
  },
  sheetContent: {
    gap: 16
  },
  handle: {
    alignSelf: "center",
    width: 58,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.border
  },
  title: {
    textAlign: "center",
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "900"
  },
  balanceCard: {
    minHeight: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14
  },
  balanceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center"
  },
  balanceMeta: {
    flex: 1
  },
  balanceValue: {
    color: colors.primaryDark,
    fontSize: 26,
    fontWeight: "900"
  },
  balanceLabel: {
    color: colors.textSecondary,
    fontWeight: "700"
  },
  bankCard: {
    minHeight: 78,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14
  },
  bankIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent
  },
  bankMeta: {
    flex: 1
  },
  bankTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "800"
  },
  bankInfo: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600"
  },
  emptyBankCard: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.warningSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14
  },
  emptyBankText: {
    flex: 1,
    color: colors.warning,
    fontSize: 13,
    fontWeight: "700"
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
  },
  inputRow: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  infoText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "700"
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
  primaryButton: {
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  disabledButton: {
    opacity: 0.55
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: "800"
  },
  simpleInfoText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18
  }
});
