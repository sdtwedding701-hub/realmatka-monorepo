import { findUserById } from "../db.mjs";
import { getUsersList, listAllNotifications } from "../stores/admin-store.mjs";
import { getNotificationsAdminSummary } from "../db/notification-db.mjs";
import { notifyUsers } from "../push.mjs";

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
  const channel = String(body.channel ?? "general").trim() || "general";
  const userId = String(body.userId ?? "").trim();

  if (!title || !message) {
    return { ok: false, status: 400, error: "title and body are required" };
  }

  const targets = userId ? [await findUserById(userId)].filter(Boolean) : (await getUsersList()).filter((user) => user.role !== "admin");
  if (!targets.length) {
    return { ok: false, status: 400, error: "No notification targets found" };
  }

  const dispatch = await notifyUsers(
    targets.map((target) => ({
      userId: target.id,
      title,
      body: message,
      channel,
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
      channel,
      title
    }
  };
}
