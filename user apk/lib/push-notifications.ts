import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { api } from "@/lib/api";
import { debugError, debugLog } from "@/lib/debug";

let notificationBehaviorInitialized = false;

export function isExpoGoEnvironment() {
  return Constants.appOwnership === "expo";
}

async function getNotificationsModule() {
  return import("expo-notifications");
}

export async function initializeNotificationBehavior() {
  if (isExpoGoEnvironment()) {
    debugLog("push", "skipping notification behavior in Expo Go");
    return null;
  }

  if (notificationBehaviorInitialized) {
    return getNotificationsModule();
  }

  const Notifications = await getNotificationsModule();
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false
    })
  });

  notificationBehaviorInitialized = true;
  return Notifications;
}

export function getNotificationTargetUrl(data: unknown) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const payload = data as { url?: unknown };
  const rawUrl = typeof payload.url === "string" ? payload.url.trim() : "";
  if (!rawUrl) {
    return null;
  }

  return rawUrl.startsWith("/") ? rawUrl : `/${rawUrl.replace(/^\/+/, "")}`;
}

export async function registerDeviceForPushNotifications(sessionToken: string) {
  if (!sessionToken || Platform.OS === "web") {
    return null;
  }

  if (isExpoGoEnvironment()) {
    debugLog("push", "skipping push registration in Expo Go");
    return null;
  }

  if (!Device.isDevice) {
    debugLog("push", "skipping push registration because device is emulator/simulator");
    return null;
  }

  const Notifications = await initializeNotificationBehavior();
  if (!Notifications) {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#0f62fe"
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;
  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") {
    debugLog("push", "notification permission not granted", { status: finalStatus });
    return null;
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ||
    Constants?.easConfig?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    "";

  if (!projectId) {
    throw new Error("Expo EAS projectId missing for push registration.");
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if (!token) {
    return null;
  }

  await api.registerNotificationDevice(sessionToken, Platform.OS === "ios" ? "ios" : "android", token);
  debugLog("push", "device registered", { platform: Platform.OS, tokenPreview: token.slice(0, 24) });
  return token;
}

export function logPushError(error: unknown) {
  debugError("push", "push registration failed", error);
}
