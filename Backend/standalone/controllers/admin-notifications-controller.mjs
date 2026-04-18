import { fail, getJsonBody, ok } from "../http.mjs";
import { requireAdminUser } from "../middleware/auth-middleware.mjs";
import { addAuditLog } from "../stores/admin-store.mjs";
import { getAdminNotifications, getAdminNotificationsSummary, sendAdminNotification } from "../services/admin-notification-service.mjs";

export async function adminNotificationsListController(request) {
  const admin = await requireAdminUser(request);
  if (admin.response) return admin.response;
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || 100);
  const offset = Number(url.searchParams.get("offset") || 0);
  return ok(await getAdminNotifications({ limit, offset }), request);
}

export async function adminNotificationsSummaryController(request) {
  const admin = await requireAdminUser(request);
  if (admin.response) return admin.response;
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || 500);
  return ok(await getAdminNotificationsSummary({ limit }), request);
}

export async function adminNotificationsSendController(request) {
  const admin = await requireAdminUser(request);
  if (admin.response) return admin.response;
  const body = await getJsonBody(request);
  const result = await sendAdminNotification(body);
  if (!result.ok) return fail(result.error, result.status, request);
  await addAuditLog({
    actorUserId: admin.user.id,
    action: "NOTIFICATION_SENT",
    entityType: "notification",
    entityId: String(body.userId ?? "").trim() || "broadcast",
    details: JSON.stringify({ title: result.data.title, channel: result.data.channel, count: result.data.sent })
  });
  return ok({ sent: result.data.sent, items: result.data.items }, request);
}
