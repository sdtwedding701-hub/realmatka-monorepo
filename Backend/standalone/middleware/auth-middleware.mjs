import { fail, getSessionToken, unauthorized } from "../http.mjs";
import { requireAdminByToken, requireUserByToken } from "../stores/auth-store.mjs";

export async function requireAuthenticatedUser(request) {
  const user = await requireUserByToken(getSessionToken(request));
  if (!user) {
    return { user: null, response: unauthorized(request) };
  }
  return { user, response: null };
}

export async function requireAdminUser(request) {
  const admin = await requireAdminByToken(getSessionToken(request));
  if (!admin) {
    return { user: null, response: unauthorized(request) };
  }
  if (!["admin", "super_admin"].includes(String(admin.role || "").toLowerCase())) {
    return { user: null, response: fail("Admin access required", 403, request) };
  }
  return { user: admin, response: null };
}
