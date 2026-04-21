import { findUserById } from "../db.mjs";
import { getUsersList, listAllNotifications } from "../stores/admin-store.mjs";
import { getNotificationsAdminSummary } from "../db/notification-db.mjs";
import { isValidNotificationChannel, normalizeNotificationChannel, sendUserNotifications } from "./notification-events-service.mjs";

export async function getAdminNotifications(options = {}) {
  return listAllNotifications({
    limit: options.limit ?? 100,
    offset: options.offset ?? 0
  });
}

export async function getAdminNotificationsSummary(options = {}) {
  return getNotificationsAdminSummary(options.limit ?? 500);
}

export async function sendAdminNotification(body) {
  const title = String(body.title ?? "").trim();
  const message = String(body.body ?? "").trim();
  const rawChannel = String(body.channel ?? "general").trim().toLowerCase() || "general";
  const channel = normalizeNotificationChannel(rawChannel);
  const userId = String(body.userId ?? "").trim();

  if (!title || !message) {
    return { ok: false, status: 400, error: "title and body are required" };
  }

  if (!isValidNotificationChannel(rawChannel)) {
    return { ok: false, status: 400, error: "Invalid notification channel" };
  }

  const targets = userId ? [await findUserById(userId)].filter(Boolean) : (await getUsersList()).filter((user) => user.role !== "admin");
  if (!targets.length) {
    return { ok: false, status: 400, error: "No notification targets found" };
  }

  const dispatch = await sendUserNotifications(
    targets.map((target) => ({
      userId: target.id,
      title,
      body: message,
      channel,
      url: "/notifications",
      data: {
        url: "/notifications"
      }
    }))
  );

  return {
    ok: true,
    data: {
      sent: Array.isArray(dispatch.created) ? dispatch.created.length : 0,
      items: dispatch.created ?? [],
      pushed: Number(dispatch.pushed || 0),
      attempted: Number(dispatch.attempted || 0),
      errors: Array.isArray(dispatch.errors) ? dispatch.errors : [],
      channel,
      title
    }
  };
}
