import { fail, getSessionToken, unauthorized } from "../http.mjs";
import { requireUserByToken } from "../stores/auth-store.mjs";

export async function requireAuthenticatedUser(request) {
  const user = await requireUserByToken(getSessionToken(request));
  if (!user) {
    return { user: null, response: unauthorized(request) };
  }
  return { user, response: null };
}

export async function requireAdminUser(request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) {
    return auth;
  }
  if (auth.user.role !== "admin") {
    return { user: null, response: fail("Admin access required", 403, request) };
  }
  return auth;
}
