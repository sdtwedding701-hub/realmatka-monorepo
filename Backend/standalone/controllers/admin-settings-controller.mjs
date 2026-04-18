import { fail, getJsonBody, ok } from "../http.mjs";
import { requireAdminUser } from "../middleware/auth-middleware.mjs";
import { getAdminSettings, getPublicSettings, updateAdminSettings } from "../services/admin-settings-service.mjs";
import { addAuditLog } from "../stores/admin-store.mjs";

export async function adminSettingsGetController(request) {
  const admin = await requireAdminUser(request);
  if (admin.response) return admin.response;
  return ok(await getAdminSettings(), request);
}

export async function adminSettingsPublicController(request) {
  return ok(await getPublicSettings(), request);
}

export async function adminSettingsUpdateController(request) {
  const admin = await requireAdminUser(request);
  if (admin.response) return admin.response;
  const body = await getJsonBody(request);
  const result = await updateAdminSettings(body);
  if (!result.ok) return fail(result.error, result.status, request);
  await addAuditLog({
    actorUserId: admin.user.id,
    action: "SETTINGS_UPDATE",
    entityType: "settings",
    entityId: "app",
    details: JSON.stringify({ keys: result.data.map((item) => item.key) })
  });
  return ok(result.data, request);
}
