import { getAppSettings, upsertAppSetting } from "../stores/admin-store.mjs";

const allowedPublicSettingKeys = new Set([
  "notice_text",
  "support_phone",
  "support_hours",
  "bonus_enabled",
  "bonus_text",
  "latest_app_version",
  "latest_app_apk_url",
  "latest_app_update_required",
  "latest_app_update_title",
  "latest_app_update_message"
]);

export async function getAdminSettings() {
  return getAppSettings();
}

export async function getPublicSettings() {
  const settings = await getAppSettings();
  return settings.filter((item) => allowedPublicSettingKeys.has(item.key));
}

export async function updateAdminSettings(body) {
  const entries = Object.entries(body || {}).filter(([key]) => typeof key === "string" && key.trim());
  if (!entries.length) {
    return { ok: false, status: 400, error: "At least one setting is required" };
  }

  const updated = [];
  for (const [key, value] of entries) {
    updated.push(await upsertAppSetting(key, String(value ?? "")));
  }

  return { ok: true, data: updated };
}
