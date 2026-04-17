import { Stack, usePathname, useRouter } from "expo-router";
import { Component, ReactNode, useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { AppState, AppStateStatus, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { clearPersistedUnlockState, readPersistedUnlockState, writePersistedUnlockState } from "@/lib/app-unlock-storage";
import { AppChromeProvider } from "@/components/ui";
import { UniversalBottomTabs } from "@/components/universal-bottom-tabs";
import { AppStateProvider, useAppState } from "@/lib/app-state";
import { clearStoredMpinValue, verifyStoredMpinValue, writeStoredMpinValue } from "@/lib/security-storage";
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
const IDLE_LOCK_MS = 3 * 60 * 1000;

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
  const { currentUser, loading, logout, sessionToken, updateMpin, verifyMpin } = useAppState();
  const [securityMode, setSecurityMode] = useState<"setup" | "unlock" | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [securityError, setSecurityError] = useState("");
  const [submittingPin, setSubmittingPin] = useState(false);
  const [windowGuardBlocked, setWindowGuardBlocked] = useState(false);
  const [windowGuardCloseHint, setWindowGuardCloseHint] = useState(false);
  const [securityBootstrapReady, setSecurityBootstrapReady] = useState(false);
  const pinInputRefs = useRef<Array<TextInput | null>>([]);
  const confirmInputRefs = useRef<Array<TextInput | null>>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInteractionAtRef = useRef(Date.now());
  const backgroundedAtRef = useRef<number | null>(null);
  const unlockedSessionTokenRef = useRef("");
  const lastVerifiedPinRef = useRef("");
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
    if (loading) {
      return;
    }

    if (!sessionToken || !currentUser) {
      setSecurityMode(null);
      unlockedSessionTokenRef.current = "";
      lastVerifiedPinRef.current = "";
      setSecurityBootstrapReady(true);
      void clearPersistedUnlockState();
      return;
    }

    let active = true;

    void (async () => {
      if (unlockedSessionTokenRef.current === sessionToken) {
        if (active) {
          setSecurityBootstrapReady(true);
        }
        return;
      }

      const persistedUnlock = await readPersistedUnlockState();
      if (!active) {
        return;
      }

      if (
        persistedUnlock?.sessionToken === sessionToken &&
        typeof persistedUnlock.lastInteractionAt === "number"
      ) {
        if (Date.now() - persistedUnlock.lastInteractionAt < IDLE_LOCK_MS) {
          unlockedSessionTokenRef.current = sessionToken;
          lastInteractionAtRef.current = persistedUnlock.lastInteractionAt;
          setSecurityMode(null);
          setSecurityBootstrapReady(true);
          return;
        }
      }

      if (!currentUser.hasMpin) {
        setSecurityMode("setup");
        setSecurityBootstrapReady(true);
        return;
      }

      setSecurityMode("unlock");
      setSecurityBootstrapReady(true);
    })();

    return () => {
      active = false;
    };
  }, [currentUser, loading, sessionToken]);

  useEffect(() => {
    if (!sessionToken || !currentUser?.hasMpin || securityMode === "setup") {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const remaining = Math.max(IDLE_LOCK_MS - (Date.now() - lastInteractionAtRef.current), 0);
    timeoutRef.current = setTimeout(() => {
      setSecurityMode("unlock");
      setSecurityError("");
      setPin("");
      setConfirmPin("");
      void clearPersistedUnlockState();
    }, remaining);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [currentUser?.hasMpin, securityMode, sessionToken]);

  useEffect(() => {
    if (!sessionToken || !currentUser?.hasMpin) {
      return;
    }

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "background" || nextState === "inactive") {
        backgroundedAtRef.current = Date.now();
        return;
      }

      if (nextState === "active") {
        const lastBackgroundAt = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (lastBackgroundAt && Date.now() - lastBackgroundAt >= IDLE_LOCK_MS) {
          setSecurityMode("unlock");
          void clearPersistedUnlockState();
        } else {
          markInteraction();
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppState);
    return () => {
      subscription.remove();
    };
  }, [currentUser?.hasMpin, sessionToken]);

  useEffect(() => {
    if (Platform.OS !== "web" || !sessionToken || !currentUser?.hasMpin) {
      return;
    }

    const handleInteraction = () => markInteraction();
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        backgroundedAtRef.current = Date.now();
      } else if (document.visibilityState === "visible") {
        const lastBackgroundAt = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (lastBackgroundAt && Date.now() - lastBackgroundAt >= IDLE_LOCK_MS) {
          setSecurityMode("unlock");
          void clearPersistedUnlockState();
        } else {
          markInteraction();
        }
      }
    };

    window.addEventListener("mousedown", handleInteraction);
    window.addEventListener("mousemove", handleInteraction);
    window.addEventListener("wheel", handleInteraction);
    window.addEventListener("scroll", handleInteraction, true);
    window.addEventListener("keydown", handleInteraction);
    window.addEventListener("touchstart", handleInteraction);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("mousedown", handleInteraction);
      window.removeEventListener("mousemove", handleInteraction);
      window.removeEventListener("wheel", handleInteraction);
      window.removeEventListener("scroll", handleInteraction, true);
      window.removeEventListener("keydown", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [currentUser?.hasMpin, sessionToken]);

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

  function markInteraction() {
    lastInteractionAtRef.current = Date.now();
    if (!sessionToken || securityMode) {
      return;
    }
    void writePersistedUnlockState({
      sessionToken,
      unlockedAt: Date.now(),
      lastInteractionAt: lastInteractionAtRef.current
    });
  }

  function setDigits(value: string, mode: "pin" | "confirm") {
    const digits = value.replace(/[^0-9]/g, "").slice(0, 4);
    if (mode === "pin") {
      setPin(digits);
    } else {
      setConfirmPin(digits);
    }

    if (securityError) {
      setSecurityError("");
    }
  }

  function focusDigit(mode: "pin" | "confirm", index: number) {
    const refs = mode === "pin" ? pinInputRefs.current : confirmInputRefs.current;
    refs[index]?.focus();
  }

  async function submitSecurityPin(nextPin: string, nextConfirmPin: string) {
    if (submittingPin) {
      return;
    }

    try {
      setSubmittingPin(true);
      setSecurityError("");

      if (securityMode === "setup") {
        if (nextPin.length !== 4 || nextConfirmPin.length !== 4) {
          return;
        }
        await updateMpin(nextPin, nextConfirmPin);
        lastVerifiedPinRef.current = nextPin;
      } else {
        if (nextPin.length !== 4) {
          return;
        }

        if (lastVerifiedPinRef.current && lastVerifiedPinRef.current === nextPin) {
          // Same-session unlock can be instant after the first successful PIN verification.
        } else if (currentUser?.id && (await verifyStoredMpinValue(currentUser.id, nextPin))) {
          lastVerifiedPinRef.current = nextPin;
          void verifyMpin(nextPin)
            .then(async () => {
              await writeStoredMpinValue(currentUser.id, nextPin);
            })
            .catch(async (error) => {
              lastVerifiedPinRef.current = "";
              await clearStoredMpinValue(currentUser.id);
              await clearPersistedUnlockState();
              setSecurityMode("unlock");
              setSecurityError(error instanceof Error ? error.message : "PIN verify nahi hua");
              setPin("");
              setConfirmPin("");
              setTimeout(() => {
                focusDigit("pin", 0);
              }, 0);
            });
        } else {
          await verifyMpin(nextPin);
          lastVerifiedPinRef.current = nextPin;
        }
      }

      unlockedSessionTokenRef.current = sessionToken;
      setSecurityMode(null);
      setPin("");
      setConfirmPin("");
      lastInteractionAtRef.current = Date.now();
      await writePersistedUnlockState({
        sessionToken,
        unlockedAt: Date.now(),
        lastInteractionAt: lastInteractionAtRef.current
      });
    } catch (error) {
      setSecurityError(error instanceof Error ? error.message : "PIN verify nahi hua");
      setPin("");
      setConfirmPin("");
      setTimeout(() => {
        focusDigit("pin", 0);
      }, 0);
    } finally {
      setSubmittingPin(false);
    }
  }

  useEffect(() => {
    if (!sessionToken || !securityMode) {
      return;
    }

    setTimeout(() => {
      focusDigit("pin", 0);
    }, 0);
  }, [securityMode, sessionToken]);

  useEffect(() => {
    if (securityMode !== "unlock" || pin.length !== 4) {
      return;
    }

    void submitSecurityPin(pin, confirmPin);
  }, [confirmPin, pin, securityMode]);

  useEffect(() => {
    if (securityMode !== "setup" || pin.length !== 4 || confirmPin.length !== 4) {
      return;
    }

    void submitSecurityPin(pin, confirmPin);
  }, [confirmPin, pin, securityMode]);

  function renderPinInputs(mode: "pin" | "confirm", value: string) {
    const refs = mode === "pin" ? pinInputRefs : confirmInputRefs;
    const label = mode === "pin" ? "PIN" : "Confirm PIN";

    return (
      <View style={{ gap: 8 }}>
        <Text style={{ color: "#475467", fontWeight: "700", fontSize: 13 }}>{label}</Text>
        <View style={{ flexDirection: "row", gap: 10, justifyContent: "center" }}>
          {[0, 1, 2, 3].map((index) => {
            const digit = value[index] ?? "";
            return (
              <TextInput
                key={`${mode}-${index}`}
                keyboardType="number-pad"
                maxLength={1}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, "");
                  const nextValue = value.slice(0, index) + cleaned + value.slice(index + 1);
                  setDigits(nextValue, mode);
                  if (cleaned && index < 3) {
                    setTimeout(() => {
                      focusDigit(mode, index + 1);
                    }, 0);
                  }
                }}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === "Backspace" && !digit && index > 0) {
                    const nextValue = value.slice(0, index - 1) + value.slice(index);
                    setDigits(nextValue, mode);
                    setTimeout(() => {
                      focusDigit(mode, index - 1);
                    }, 0);
                  }
                }}
                ref={(input) => {
                  refs.current[index] = input;
                }}
                secureTextEntry
                selectTextOnFocus
                style={{
                  width: 54,
                  height: 58,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: digit ? colors.primary : "#dbe1ea",
                  backgroundColor: "#f8fafc",
                  color: "#111827",
                  fontSize: 24,
                  fontWeight: "800",
                  textAlign: "center"
                }}
                textContentType="oneTimeCode"
                value={digit}
              />
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View
      style={{ flex: 1 }}
      onTouchStart={() => {
        if (sessionToken && currentUser?.hasMpin && !securityMode) {
          markInteraction();
        }
      }}
      onStartShouldSetResponderCapture={() => {
        if (sessionToken && currentUser?.hasMpin && !securityMode) {
          markInteraction();
        }
        return false;
      }}
    >
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
      <Modal animationType="fade" transparent visible={Boolean(sessionToken && securityBootstrapReady && securityMode)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.65)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ width: "100%", maxWidth: 380, borderRadius: 24, backgroundColor: colors.surface, padding: 22, gap: 14 }}>
            <Text style={{ color: "#111827", fontSize: 24, fontWeight: "900", textAlign: "center" }}>
              {securityMode === "setup" ? "Set Security PIN" : "Unlock App"}
            </Text>
            <Text style={{ color: "#64748b", textAlign: "center", lineHeight: 20 }}>
              {securityMode === "setup"
                ? "Pehli baar 4 digit PIN set karo. Ye app aur web dono me security lock ke liye use hoga."
                : "3 minute inactivity ke baad app lock ho gayi hai. Continue karne ke liye 4 digit PIN dalo."}
            </Text>
            {renderPinInputs("pin", pin)}
            {securityMode === "setup" ? renderPinInputs("confirm", confirmPin) : null}
            <Text style={{ color: "#64748b", textAlign: "center", fontSize: 13 }}>
              {submittingPin
                ? securityMode === "setup"
                  ? "PIN save ho raha hai..."
                  : "PIN verify ho raha hai..."
                : securityMode === "setup"
                  ? "4 digit complete hote hi PIN auto-save ho jayega."
                  : "4th digit enter karte hi app auto-unlock ho jayegi."}
            </Text>
            {securityError ? <Text style={{ color: "#dc2626", fontWeight: "700", textAlign: "center" }}>{securityError}</Text> : null}
            {securityMode === "setup" ? (
              <Pressable
                onPress={() => {
                  setPin("");
                  setConfirmPin("");
                  setSecurityError("");
                  focusDigit("pin", 0);
                }}
                style={{ minHeight: 46, borderRadius: 999, borderWidth: 1, borderColor: "#dbe1ea", alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#111827", fontWeight: "800", fontSize: 15 }}>Clear PIN</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
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
