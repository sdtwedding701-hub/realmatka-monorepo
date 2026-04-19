const localApiBase = "http://localhost:3000";
const productionApiBase =
  window.ADMIN_DEFAULT_API_BASE ||
  "https://api.realmatka.in";

window.ADMIN_DEFAULT_API_BASE =
  window.ADMIN_DEFAULT_API_BASE ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname) ? localApiBase : productionApiBase);
window.ADMIN_BRAND_NAME = window.ADMIN_BRAND_NAME || "Real Matka";
window.ADMIN_BRAND_SUBTITLE =
  window.ADMIN_BRAND_SUBTITLE || "Deploy-ready operator access for approvals, reports, results, and full daily monitoring.";
