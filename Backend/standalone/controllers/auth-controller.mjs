import { fail, getJsonBody, getSessionToken, normalizeIndianPhone, ok, unauthorized } from "../http.mjs";
import { getCurrentSessionUser, loginWithPassword, verifyAdminTwoFactorLogin } from "../services/auth-service.mjs";

export async function loginController(request) {
  const body = await getJsonBody(request);
  const rawPhone = String(body.phone ?? "");
  const phone = normalizeIndianPhone(rawPhone) ?? rawPhone.trim();
  const password = String(body.password ?? "");

  const result = await loginWithPassword(phone, password);
  if (!result.ok) {
    return fail(result.error, result.status, request);
  }

  return ok(result.data, request);
}

export async function verifyAdminTwoFactorController(request) {
  const body = await getJsonBody(request);
  const challengeId = String(body.challengeId ?? "").trim();
  const otp = String(body.otp ?? "").trim();

  if (!challengeId || !/^[0-9]{6}$/.test(otp)) {
    return fail("Valid challengeId and 6 digit OTP are required", 400, request);
  }

  const result = await verifyAdminTwoFactorLogin(challengeId, otp);
  if (!result.ok) {
    return fail(result.error, result.status, request);
  }

  return ok(result.data, request);
}

export async function meController(request) {
  const user = await getCurrentSessionUser(getSessionToken(request));
  if (!user) {
    return unauthorized(request);
  }

  return ok(user, request);
}
