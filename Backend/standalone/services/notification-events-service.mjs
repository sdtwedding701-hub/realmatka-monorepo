import { notifyUsers } from "../push.mjs";

export const NOTIFICATION_CHANNELS = ["general", "wallet", "result", "security", "support"];

function normalizeNotificationUrl(value, fallback = "/notifications") {
  const normalized = String(value ?? fallback).trim();
  if (!normalized) {
    return "/notifications";
  }
  return normalized.startsWith("/") ? normalized : `/${normalized.replace(/^\/+/, "")}`;
}

export function normalizeNotificationChannel(value, fallback = "general") {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (NOTIFICATION_CHANNELS.includes(normalized)) {
    return normalized;
  }
  return fallback;
}

export function isValidNotificationChannel(value) {
  return NOTIFICATION_CHANNELS.includes(String(value ?? "").trim().toLowerCase());
}

export async function sendUserNotification({ userId, title, body, channel = "general", url = "/notifications", data = {} }) {
  const normalizedUserId = String(userId ?? "").trim();
  const normalizedTitle = String(title ?? "").trim();
  const normalizedBody = String(body ?? "").trim();

  if (!normalizedUserId || !normalizedTitle || !normalizedBody) {
    return { created: [], pushed: 0, attempted: 0, errors: ["userId, title, and body are required"] };
  }

  return notifyUsers([
    {
      userId: normalizedUserId,
      title: normalizedTitle,
      body: normalizedBody,
      channel: normalizeNotificationChannel(channel),
      data: {
        url: normalizeNotificationUrl(url),
        ...data
      }
    }
  ]);
}

export async function sendUserNotifications(entries) {
  return notifyUsers(
    (Array.isArray(entries) ? entries : []).map((entry) => ({
      userId: String(entry?.userId ?? "").trim(),
      title: String(entry?.title ?? "").trim(),
      body: String(entry?.body ?? "").trim(),
      channel: normalizeNotificationChannel(entry?.channel),
      data: {
        url: normalizeNotificationUrl(entry?.url),
        ...(entry?.data && typeof entry.data === "object" ? entry.data : {})
      }
    }))
  );
}
