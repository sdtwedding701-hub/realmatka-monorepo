import { Stack, usePathname, useRouter } from "expo-router";
import { Component, ReactNode, useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Platform, Pressable, Text, View } from "react-native";
import { AppChromeProvider } from "@/components/ui";
import { UniversalBottomTabs } from "@/components/universal-bottom-tabs";
import { AppStateProvider, useAppState } from "@/lib/app-state";
import {
  getNotificationTargetUrl,
  initializeNotificationBehavior,
  isExpoGoEnvironment,
  logPushError,
  registerDeviceForPushNotifications
} from "@/lib/push-notifications";
import { colors } from "@/theme/colors";

const WEB_ACTIVE_WINDOW_KEY = "realmatka.active-web-window";
const WEB_WINDOW_HEARTBEAT_MS = 3000;
const WEB_WINDOW_STALE_MS = 9000;

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <AppStateProvider>
        <AppChromeProvider>
          <RootNavigator />
        </AppChromeProvider>
      </AppStateProvider>
    </RootErrorBoundary>
  );
}

function RootNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, loading, sessionToken } = useAppState();
  const [windowGuardBlocked, setWindowGuardBlocked] = useState(false);
  const [windowGuardCloseHint, setWindowGuardCloseHint] = useState(false);
  const registeredPushSessionTokenRef = useRef("");
  const webWindowIdRef = useRef(`web_${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    if (loading) {
      return;
    }

    const isAuthRoute = pathname.startsWith("/auth");
    const isAuthenticated = Boolean(sessionToken && currentUser);

    if (!isAuthenticated && !isAuthRoute) {
      router.replace("/auth/login");
      return;
    }

    if (isAuthenticated && isAuthRoute) {
      router.replace("/(tabs)");
    }
  }, [currentUser, loading, pathname, router, sessionToken]);

  useEffect(() => {
    if (isExpoGoEnvironment()) {
      return;
    }

    const navigateFromNotification = (data: unknown) => {
      const nextUrl = getNotificationTargetUrl(data);
      if (nextUrl) {
        router.push(nextUrl);
      }
    };

    let responseSubscription: { remove: () => void } | null = null;

    void (async () => {
      const Notifications = await initializeNotificationBehavior();
      if (!Notifications) {
        return;
      }

      responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
        navigateFromNotification(response.notification.request.content.data);
      });

      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        navigateFromNotification(response.notification.request.content.data);
      }
    })();

    return () => {
      responseSubscription?.remove();
    };
  }, [router]);

  useEffect(() => {
    if (!sessionToken || !currentUser || isExpoGoEnvironment()) {
      if (!sessionToken) {
        registeredPushSessionTokenRef.current = "";
      }
      return;
    }

    if (registeredPushSessionTokenRef.current === sessionToken) {
      return;
    }

    let active = true;

    void registerDeviceForPushNotifications(sessionToken)
      .then(() => {
        if (active) {
          registeredPushSessionTokenRef.current = sessionToken;
        }
      })
      .catch((error) => {
        logPushError(error);
      });

    return () => {
      active = false;
    };
  }, [currentUser, sessionToken]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    const windowId = webWindowIdRef.current;
    const storage = window.localStorage;

    const readOwner = () => {
      try {
        const raw = storage.getItem(WEB_ACTIVE_WINDOW_KEY);
        if (!raw) {
          return null;
        }

        const parsed = JSON.parse(raw) as {
          sessionToken?: string;
          tabId?: string;
          updatedAt?: number;
          userId?: string;
        };

        if (!parsed?.tabId || !parsed?.userId || typeof parsed.updatedAt !== "number") {
          return null;
        }

        return parsed;
      } catch {
        return null;
      }
    };

    const writeOwner = () => {
      if (!sessionToken || !currentUser) {
        return;
      }

      storage.setItem(
        WEB_ACTIVE_WINDOW_KEY,
        JSON.stringify({
          tabId: windowId,
          userId: currentUser.id,
          sessionToken,
          updatedAt: Date.now()
        })
      );
    };

    const clearOwner = () => {
      const existing = readOwner();
      if (existing?.tabId === windowId) {
        storage.removeItem(WEB_ACTIVE_WINDOW_KEY);
      }
    };

    const attemptClaim = () => {
      if (!sessionToken || !currentUser) {
        setWindowGuardBlocked(false);
        clearOwner();
        return true;
      }

      const existing = readOwner();
      const sameUserOtherWindow =
        existing &&
        existing.userId === currentUser.id &&
        existing.tabId !== windowId &&
        typeof existing.updatedAt === "number" &&
        Date.now() - existing.updatedAt < WEB_WINDOW_STALE_MS;

      if (sameUserOtherWindow) {
        setWindowGuardBlocked(true);
        return false;
      }

      setWindowGuardBlocked(false);
      writeOwner();
      return true;
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== WEB_ACTIVE_WINDOW_KEY) {
        return;
      }

      if (!sessionToken || !currentUser) {
        return;
      }

      const nextOwner = readOwner();
      if (
        nextOwner &&
        nextOwner.userId === currentUser.id &&
        nextOwner.tabId !== windowId &&
        typeof nextOwner.updatedAt === "number" &&
        Date.now() - nextOwner.updatedAt < WEB_WINDOW_STALE_MS
      ) {
        setWindowGuardBlocked(true);
        return;
      }

      if (!windowGuardBlocked) {
        writeOwner();
      } else {
        attemptClaim();
      }
    };

    const handleBeforeUnload = () => {
      clearOwner();
    };

    const heartbeat = window.setInterval(() => {
      attemptClaim();
    }, WEB_WINDOW_HEARTBEAT_MS);

    attemptClaim();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      clearOwner();
    };
  }, [currentUser, sessionToken, windowGuardBlocked]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || !windowGuardBlocked) {
      setWindowGuardCloseHint(false);
      return;
    }

    const timer = window.setTimeout(() => {
      try {
        window.close();
      } catch {
        // Ignore close errors on browsers that block script-based close.
      }
      setWindowGuardCloseHint(true);
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [windowGuardBlocked]);

  return (
    <View style={{ flex: 1 }}>
      {windowGuardBlocked ? (
        <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <StatusBar style="dark" />
          <View style={{ width: "100%", maxWidth: 380, borderRadius: 24, backgroundColor: colors.surface, padding: 22, gap: 14 }}>
            <Text style={{ color: "#111827", fontSize: 24, fontWeight: "900", textAlign: "center" }}>Window Already Active</Text>
            <Text style={{ color: "#64748b", textAlign: "center", lineHeight: 20 }}>
              There is an active browser tab, this page will auto close.
            </Text>
            {windowGuardCloseHint ? (
              <Text style={{ color: "#64748b", textAlign: "center", fontSize: 13 }}>
                Browser ne auto-close block kiya ho to is tab ko manually close kar do.
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }} />
          <UniversalBottomTabs />
        </>
      )}
    </View>
  );
}

class RootErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("Root runtime error", error);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, padding: 24, gap: 12 }}>
        <StatusBar style="dark" />
        <Text style={{ color: "#111827", fontSize: 22, fontWeight: "800", textAlign: "center" }}>App Runtime Error</Text>
        <Text style={{ color: "#475467", textAlign: "center", lineHeight: 20 }}>
          {this.state.error.message || "Something went wrong while opening the app."}
        </Text>
        <Pressable
          onPress={() => this.setState({ error: null })}
          style={{ minHeight: 46, borderRadius: 999, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 }}
        >
          <Text style={{ color: colors.surface, fontWeight: "800" }}>Try Again</Text>
        </Pressable>
      </View>
    );
  }
}
