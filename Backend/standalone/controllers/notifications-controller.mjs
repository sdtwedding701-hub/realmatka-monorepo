import { fail, getJsonBody, ok } from "../http.mjs";
import { requireAuthenticatedUser } from "../middleware/auth-middleware.mjs";
import { getNotificationHistory, markUserNotificationsRead, registerUserNotificationDevice } from "../services/notification-service.mjs";

export async function notificationsHistoryController(request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || 50);
  return ok(await getNotificationHistory(auth.user.id, { limit }), request);
}

export async function notificationsRegisterDeviceController(request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;
  const body = await getJsonBody(request);
  const result = await registerUserNotificationDevice(auth.user.id, body.platform, body.token);
  if (!result.ok) return fail(result.error, result.status, request);
  return ok(result.data, request);
}

export async function notificationsMarkReadController(request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;
  const body = await getJsonBody(request);
  const notificationId = String(body.notificationId ?? "").trim();
  const result = await markUserNotificationsRead(auth.user.id, { notificationId });
  return ok(result, request);
}
