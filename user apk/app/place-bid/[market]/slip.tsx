import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen, BackHeader, SurfaceCard } from "@/components/ui";
import { useAppState } from "@/lib/app-state";
import { colors } from "@/theme/colors";

const MIN_BID_POINTS = 5;
const MAX_BID_POINTS = 99999;

export default function BidSlipScreen() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { draftBid, submitDraftBid, walletBalance } = useAppState();
  const total = draftBid?.items.reduce((sum, item) => sum + item.points, 0) ?? 0;
  const hasInvalidBidAmount = draftBid?.items.some((item) => item.points < MIN_BID_POINTS || item.points > MAX_BID_POINTS) ?? false;
  const insufficientBalance = total > walletBalance;
  const submitDisabled = !draftBid?.items.length || hasInvalidBidAmount || insufficientBalance || submitting || submitted;
  const sessionLabel = draftBid?.sessionType === "NA" ? "Jodi" : draftBid?.sessionType ?? "Close";
  const projectedBalance = Math.max(walletBalance - total, 0);

  return (
    <View style={styles.page}>
      <BackHeader title={draftBid?.market ?? "Bid Slip"} subtitle={draftBid?.boardLabel ?? ""} />
      <AppScreen
        footer={
          <View style={styles.actions}>
            <Pressable disabled={submitting || submitted} onPress={() => router.back()} style={[styles.cancelButton, (submitting || submitted) && styles.submitDisabled]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={submitDisabled}
              onPress={async () => {
                if (submitDisabled) {
                  return;
                }
                setError("");
                try {
                  setSubmitting(true);
                  await submitDraftBid();
                  setSubmitted(true);
                  setTimeout(() => {
                    router.replace("/(tabs)/bids");
                  }, 900);
                } catch (submitError) {
                  setError(submitError instanceof Error ? submitError.message : "Unable to submit bid");
                } finally {
                  setSubmitting(false);
                }
              }}
              style={[styles.submitButton, submitDisabled && styles.submitDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <Text style={styles.submitText}>
                  {hasInvalidBidAmount ? "Invalid Bid Amount" : insufficientBalance ? "Insufficient Balance" : submitted ? "Bet Placed" : "Confirm Bet"}
                </Text>
              )}
            </Pressable>
          </View>
        }
        showPromo={false}
      >
        <SurfaceCard style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <Text style={styles.market}>{draftBid?.market ?? "No draft selected"}</Text>
            <View style={styles.sessionBadge}>
              <Text style={styles.sessionBadgeText}>{sessionLabel}</Text>
            </View>
          </View>
          <Text style={styles.sessionType}>
            Date: {new Date().toLocaleDateString("en-GB")} | {draftBid?.boardLabel ?? "Board"}
          </Text>

          <View style={styles.headRow}>
            <Text style={styles.headCell}>Digit</Text>
            <Text style={styles.headCell}>Points</Text>
            <Text style={styles.headCell}>Game Type</Text>
          </View>

          {draftBid?.items.map((item) => (
            <View key={`${item.digit}-${item.points}`} style={styles.row}>
              <Text style={styles.cell}>{item.digit}</Text>
              <Text style={styles.cell}>{item.points}</Text>
              <Text style={styles.cell}>{item.gameType || draftBid.boardLabel}</Text>
            </View>
          )) ?? <Text style={styles.empty}>No bid selected</Text>}
        </SurfaceCard>

        <SurfaceCard style={styles.totalsCard}>
          <View style={styles.bottomBar}>
            <View style={styles.bottomStat}>
              <Text style={styles.bottomValue}>{draftBid?.items.length ?? 0}</Text>
              <Text style={styles.bottomLabel}>Bids</Text>
            </View>
            <View style={styles.bottomStat}>
              <Text style={styles.bottomValue}>Rs {total}</Text>
              <Text style={styles.bottomLabel}>Total Points</Text>
            </View>
            <View style={styles.bottomStat}>
              <Text style={styles.bottomValue}>Rs {walletBalance}</Text>
              <Text style={styles.bottomLabel}>Wallet</Text>
            </View>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceRowLabel}>Balance after bet</Text>
            <Text style={styles.balanceRowValue}>Rs {projectedBalance}</Text>
          </View>
        </SurfaceCard>

        <View style={styles.noteCard}>
          <Text style={styles.note}>*Note: Bid once played will not be cancelled*</Text>
          <Text style={styles.noteSubtext}>Submit karne se pehle digit, points aur board ek baar confirm kar lo.</Text>
        </View>
        {hasInvalidBidAmount ? <Text style={styles.warning}>{`Each bid amount must be between ${MIN_BID_POINTS} and ${MAX_BID_POINTS}.`}</Text> : null}
        {insufficientBalance ? <Text style={styles.warning}>Insufficient balance. Add funds before submitting the bid.</Text> : null}
        {error ? <Text style={styles.warning}>{error}</Text> : null}
        {submitted ? (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Bet placed successfully</Text>
            <Text style={styles.successText}>Aapki bid save ho gayi hai. Ab hum aapko All Bids page par le ja rahe hain.</Text>
          </View>
        ) : null}

      </AppScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background
  },
  summaryCard: {
    gap: 14
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  market: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: "900"
  },
  sessionBadge: {
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  sessionBadgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800"
  },
  sessionType: {
    color: colors.textMuted,
    fontWeight: "700"
  },
  headRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 6,
    marginTop: 4
  },
  headCell: {
    width: "31%",
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center"
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  cell: {
    width: "31%",
    color: colors.textPrimary,
    fontWeight: "700",
    textAlign: "center"
  },
  empty: {
    color: colors.textMuted
  },
  totalsCard: {
    gap: 12
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 2
  },
  bottomStat: {
    alignItems: "center",
    flex: 1
  },
  bottomValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "900"
  },
  bottomLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  balanceRow: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  balanceRowLabel: {
    color: colors.accentDark,
    fontSize: 13,
    fontWeight: "700"
  },
  balanceRowValue: {
    color: colors.accentDark,
    fontSize: 18,
    fontWeight: "900"
  },
  noteCard: {
    borderRadius: 16,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4
  },
  note: {
    textAlign: "center",
    color: colors.warning,
    fontSize: 12,
    fontWeight: "700"
  },
  noteSubtext: {
    textAlign: "center",
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18
  },
  warning: {
    textAlign: "center",
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8
  },
  successCard: {
    borderRadius: 16,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: "#b7e5c6",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 4
  },
  successTitle: {
    color: colors.success,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center"
  },
  successText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center"
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 8
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  cancelText: {
    color: colors.textPrimary,
    fontWeight: "800"
  },
  submitButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  submitDisabled: {
    opacity: 0.5
  },
  submitText: {
    color: colors.surface,
    fontWeight: "800"
  }
});
