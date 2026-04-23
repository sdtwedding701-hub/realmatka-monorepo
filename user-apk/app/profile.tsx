import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { AppScreen, BackHeader, SurfaceCard } from "@/components/ui";
import { profile } from "../data/mock";
import { api } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { colors } from "@/theme/colors";

export default function ProfileScreen() {
  const { currentUser, sessionToken } = useAppState();
  const [referralStats, setReferralStats] = useState<{
    referralCode: string;
    referredCount: number;
    referralIncomeTotal: number;
    referredUsers: Array<{ id: string; name: string; phone: string; joinedAt: string | null }>;
  } | null>(null);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const joinedAt = currentUser?.joinedAt
    ? new Date(currentUser.joinedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : profile.memberSince;
  const phone = currentUser?.phone ?? profile.phone;
  const name = currentUser?.name ?? profile.name;
  const referralCode = referralStats?.referralCode ?? currentUser?.referralCode ?? profile.referralCode;
  const referredCount = referralStats?.referredCount ?? 0;
  const referralIncomeTotal = referralStats?.referralIncomeTotal ?? 0;
  const referredUsers = referralStats?.referredUsers ?? [];
  const referralWebLink = `https://play.realmatka.in/auth/register?ref=${encodeURIComponent(referralCode)}`;
  const shareMessage = `Real Matka join karo.\n\nRegister here: ${referralWebLink}\nReferral code auto-fill ho jayega.\n\nReferral code: ${referralCode}`;

  useFocusEffect(
    useCallback(() => {
      if (!sessionToken) {
        return;
      }

      let active = true;

      void (async () => {
        try {
          setLoadingReferrals(true);
          const next = await api.getReferralOverview(sessionToken);
          if (active) {
            setReferralStats(next);
          }
        } catch {
          if (active) {
            setReferralStats(null);
          }
        } finally {
          if (active) {
            setLoadingReferrals(false);
          }
        }
      })();

      return () => {
        active = false;
      };
    }, [sessionToken])
  );

  return (
    <View style={styles.page}>
      <BackHeader title="User Profile" subtitle={undefined} />
      <AppScreen showPromo={false}>
        <View style={styles.topWrap}>
          <View style={styles.avatar}>
            <Ionicons color={colors.surface} name="person-outline" size={34} />
          </View>
          <Text style={styles.name}>{name}</Text>
        </View>

        <SurfaceCard>
          <View style={styles.infoGrid}>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Joined Since</Text>
              <Text style={styles.infoValue}>{joinedAt}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>+91{phone}</Text>
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Referred Users</Text>
              <Text style={styles.statValue}>{referredCount}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Referral Income</Text>
              <Text style={styles.statValue}>Rs {referralIncomeTotal.toFixed(2)}</Text>
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <Text style={styles.referralLabel}>Referral Code</Text>
          <Pressable
            onPress={() => {
              void Share.share({
                message: shareMessage,
                title: "Share Referral Code"
              }).catch(() => {
                Alert.alert("Share failed", "Referral code share abhi open nahi ho paya. Code manually share kar lo.");
              });
            }}
            style={styles.referralBox}
          >
            <View style={styles.referralContent}>
              <Text style={styles.referralValue}>{referralCode}</Text>
              <Text style={styles.referralHint}>Tap karke referral code share karo</Text>
            </View>
            <View style={styles.shareBadge}>
              <Ionicons color={colors.surface} name="share-social-outline" size={18} />
            </View>
          </Pressable>
        </SurfaceCard>

        <SurfaceCard>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Referred Players</Text>
            {loadingReferrals ? <ActivityIndicator color={colors.primary} size="small" /> : null}
          </View>

          {referredUsers.length ? (
            <View style={styles.listWrap}>
              {referredUsers.map((user) => (
                <View key={user.id} style={styles.userRow}>
                  <View style={styles.userIcon}>
                    <Ionicons color={colors.surface} name="person-outline" size={18} />
                  </View>
                  <View style={styles.userMeta}>
                    <Text numberOfLines={1} style={styles.userName}>
                      {user.name}
                    </Text>
                    <Text style={styles.userPhone}>+91{user.phone}</Text>
                  </View>
                  <Text style={styles.userJoined}>
                    {user.joinedAt
                      ? new Date(user.joinedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                      : "--"}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons color="#98a2b3" name="people-outline" size={20} />
              <Text style={styles.emptyText}>Abhi tak koi referred player nahi hai.</Text>
            </View>
          )}
        </SurfaceCard>
      </AppScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background
  },
  topWrap: {
    alignItems: "center",
    gap: 10
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#273caa",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  },
  name: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800"
  },
  infoGrid: {
    flexDirection: "row",
    alignItems: "center"
  },
  infoCell: {
    flex: 1,
    alignItems: "center",
    gap: 6
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "#e5e7eb"
  },
  infoLabel: {
    color: "#98a2b3",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  infoValue: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "800"
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 12
  },
  statLabel: {
    color: "#667085",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  statValue: {
    color: "#273caa",
    fontSize: 18,
    fontWeight: "900"
  },
  referralLabel: {
    color: "#667085",
    fontSize: 13,
    fontWeight: "700"
  },
  referralBox: {
    borderRadius: 14,
    backgroundColor: "#f2f1ff",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  referralContent: {
    flex: 1,
    gap: 4
  },
  referralValue: {
    color: "#273caa",
    fontSize: 18,
    fontWeight: "900"
  },
  referralHint: {
    color: "#667085",
    fontSize: 12,
    fontWeight: "600"
  },
  shareBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  listTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "800"
  },
  listWrap: {
    gap: 10
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#eef2f7",
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  userIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  userMeta: {
    flex: 1,
    gap: 2
  },
  userName: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800"
  },
  userPhone: {
    color: "#667085",
    fontSize: 12,
    fontWeight: "600"
  },
  userJoined: {
    color: "#98a2b3",
    fontSize: 12,
    fontWeight: "700"
  },
  emptyState: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#eef2f7",
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12
  },
  emptyText: {
    color: "#667085",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center"
  }
});
