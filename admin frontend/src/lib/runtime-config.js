export const adminRuntimeConfig = {
  apiBase:
    window.ADMIN_DEFAULT_API_BASE ||
    `${window.location.protocol}//${window.location.hostname}:3000`,
  brandName: window.ADMIN_BRAND_NAME || "Real Matka",
  brandSubtitle:
    window.ADMIN_BRAND_SUBTITLE || "Deploy-ready operator access for approvals, reports, results, and full daily monitoring."
};

export function normalizeApiBase(value) {
  const trimmed = String(value || "").trim();
  return trimmed.replace(/\/$/, "") || adminRuntimeConfig.apiBase;
}
