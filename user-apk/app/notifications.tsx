import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen, BackHeader, SurfaceCard } from "@/components/ui";
import { api } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { colors } from "@/theme/colors";

type NotificationEntry = {
  id: string;
  title: string;
  body: string;
  channel: string;
  read: boolean;
  createdAt: string;
};

const NOTIFICATIONS_REFRESH_INTERVAL_MS = 30_000;

export default function NotificationsScreen() {
  const { sessionToken } = useAppState();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<NotificationEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!sessionToken) {
        setItems([]);
        setLoading(false);
        return;
      }

      let active = true;

      const load = async (mode: "load" | "refresh") => {
        try {
          if (mode === "load") {
            setLoading(true);
          } else {
            setRefreshing(true);
          }
          const response = await api.notificationHistory(sessionToken);
          if (!active) {
            return;
          }
          setItems(response);
          setError("");
        } catch (loadError) {
          if (!active) {
            return;
          }
          setError(loadError instanceof Error ? loadError.message : "Notifications load nahi hui.");
        } finally {
          if (!active) {
            return;
          }
          setLoading(false);
          setRefreshing(false);
        }
      };

      void load("load");
      const interval = setInterval(() => {
        void load("refresh");
      }, NOTIFICATIONS_REFRESH_INTERVAL_MS);

      return () => {
        active = false;
        clearInterval(interval);
      };
    }, [sessionToken])
  );

  return (
    <View style={styles.page}>
      <BackHeader title="Notifications" subtitle="Market result aur system updates yahan milenge." />
      <AppScreen onRefresh={sessionToken ? () => void refreshNow() : undefined} refreshing={refreshing} showPromo={false}>
        <View style={styles.hero}>
          <Text style={styles.heading}>Notification Center</Text>
          <Text style={styles.subheading}>Result, wallet, security aur support related updates yahan history me save rahenge.</Text>
        </View>

        {loading ? (
          <SurfaceCard style={styles.stateCard}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.stateText}>Notifications load ho rahi hain...</Text>
          </SurfaceCard>
        ) : null}

        {!loading && error ? (
          <SurfaceCard style={styles.stateCard}>
            <Text style={[styles.stateText, styles.errorText]}>{error}</Text>
            <Pressable onPress={() => void refreshNow()} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </SurfaceCard>
        ) : null}

        {!loading && !error && !items.length ? (
          <SurfaceCard style={styles.stateCard}>
            <Text style={styles.stateText}>Abhi koi notification nahi aayi hai.</Text>
          </SurfaceCard>
        ) : null}

        {!loading && !error
          ? items.map((item) => (
              <SurfaceCard key={item.id} style={styles.itemCard}>
                <View style={styles.badgeRow}>
                  <View style={styles.channelBadge}>
                    <Text style={styles.channelText}>{item.channel || "general"}</Text>
                  </View>
                  <Text style={styles.timeText}>{formatDate(item.createdAt)}</Text>
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
              </SurfaceCard>
            ))
          : null}
      </AppScreen>
    </View>
  );

  async function refreshNow() {
    if (!sessionToken) {
      return;
    }

    try {
      setRefreshing(true);
      const response = await api.notificationHistory(sessionToken);
      setItems(response);
      setError("");
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Notifications refresh nahi hui.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }
}

function formatDate(value: string) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background
  },
  hero: {
    gap: 6,
    marginBottom: 6
  },
  heading: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center"
  },
  subheading: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center"
  },
  stateCard: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 22
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center"
  },
  errorText: {
    color: colors.danger
  },
  retryButton: {
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  retryText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "800"
  },
  itemCard: {
    gap: 10
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  channelBadge: {
    borderRadius: 999,
    backgroundColor: colors.infoSoft,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  channelText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  timeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "800"
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21
  }
});
