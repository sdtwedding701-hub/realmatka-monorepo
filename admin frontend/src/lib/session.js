const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const TOKEN_KEY = "admin_token";
const LOGIN_AT_KEY = "admin_login_at";
const EXPIRES_AT_KEY = "admin_session_expires_at";

function getSessionStorage() {
  return window.sessionStorage;
}

export function getAdminToken() {
  return getSessionStorage().getItem(TOKEN_KEY) || "";
}

export function getAdminSessionExpiry() {
  return Number(getSessionStorage().getItem(EXPIRES_AT_KEY) || 0);
}

export function storeAdminSession(token) {
  const storage = getSessionStorage();
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(LOGIN_AT_KEY, String(Date.now()));
  storage.setItem(EXPIRES_AT_KEY, String(Date.now() + ADMIN_SESSION_TTL_MS));
}

export function clearAdminSession() {
  const storage = getSessionStorage();
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(LOGIN_AT_KEY);
  storage.removeItem(EXPIRES_AT_KEY);
}
