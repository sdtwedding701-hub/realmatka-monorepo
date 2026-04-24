const fallbackApiBaseUrl = "https://api.realmatka.in";

function normalizeBaseUrl(value?: string) {
  return String(value || fallbackApiBaseUrl).trim().replace(/\/$/, "");
}

export async function getLatestApkUrl() {
  const apiBaseUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  const fallbackApkUrl = "https://pub-6623a0d99133406b850cfa8224871d15.r2.dev/app-release.apk";

  try {
    const response = await fetch(`${apiBaseUrl}/api/settings`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return fallbackApkUrl;
    }

    const payload = (await response.json()) as {
      ok?: boolean;
      data?: Array<{ key?: string; value?: string }>;
    };

    const settings = Array.isArray(payload?.data) ? payload.data : [];
    const settingsMap = new Map(settings.map((item) => [String(item.key || "").trim(), String(item.value || "").trim()]));
    return settingsMap.get("latest_app_apk_url") || fallbackApkUrl;
  } catch {
    return fallbackApkUrl;
  }
}
