import { listNotificationsForUser, registerNotificationDevice } from "../stores/notification-store.mjs";

export async function getNotificationHistory(userId, options = {}) {
  return listNotificationsForUser(userId, options.limit);
}

export async function registerUserNotificationDevice(userId, platform, token) {
  const normalizedToken = String(token ?? "").trim();
  const normalizedPlatform = String(platform ?? "android").trim();

  if (!normalizedToken) {
    return { ok: false, status: 400, error: "Notification token is required" };
  }

  const device = await registerNotificationDevice(userId, normalizedPlatform, normalizedToken);
  return { ok: true, data: device };
}
