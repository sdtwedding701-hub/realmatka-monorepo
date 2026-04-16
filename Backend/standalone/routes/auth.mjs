import { randomBytes } from "node:crypto";
import { createSession, findUserByPhone, getAppSettings, getUserBalance, requireUserByToken, verifyCredential } from "../db.mjs";
import { corsPreflight, fail, getJsonBody, getSessionToken, normalizeIndianPhone, ok, unauthorized } from "../http.mjs";
import { issueOtp, verifyOtp } from "./auth-otp.mjs";

const adminTwoFactorChallenges = new Map();

function cleanupExpiredAdminTwoFactorChallenges() {
  const now = Date.now();
  for (const [challengeId, challenge] of adminTwoFactorChallenges.entries()) {
    if (new Date(challenge.expiresAt).getTime() <= now) {
      adminTwoFactorChallenges.delete(challengeId);
    }
  }
}

async function isAdminTwoFactorEnabled() {
  const settings = await getAppSettings();
  const match = settings.find((item) => item.key === "admin_two_factor_enabled");
  return String(match?.value ?? "true").trim().toLowerCase() !== "false";
}

export function options(request) {
  return corsPreflight(request);
}

export async function login(request) {
  const body = await getJsonBody(request);
  const rawPhone = String(body.phone ?? "");
  const phone = normalizeIndianPhone(rawPhone) ?? rawPhone.trim();
  const password = String(body.password ?? "");

  const user = await findUserByPhone(phone);
  if (!user || !verifyCredential(password, user.passwordHash)) {
    return fail("Invalid phone or password", 401, request);
  }

  if (user.deactivatedAt) {
    return fail("Your account is deactivated. Contact support.", 403, request);
  }
  if (user.blockedAt) {
    return fail("Your account is blocked. Contact support.", 403, request);
  }

  if (user.approvalStatus !== "Approved") {
    return fail(
      user.approvalStatus === "Rejected"
        ? "Your account registration was rejected. Contact support."
        : "Your account is pending admin approval.",
      403,
      request
    );
  }

  if (user.role === "admin" && await isAdminTwoFactorEnabled()) {
    cleanupExpiredAdminTwoFactorChallenges();
    const otpState = await issueOtp(user.phone, "admin_login");
    const challengeId = `admin_2fa_${randomBytes(12).toString("hex")}`;
    adminTwoFactorChallenges.set(challengeId, {
      userId: user.id,
      phone: user.phone,
      expiresAt: otpState.expiresAt
    });

    return ok(
      {
        requiresTwoFactor: true,
        challengeId,
        expiresAt: otpState.expiresAt,
        provider: otpState.provider,
        devCode: otpState.devCode,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          role: user.role
        }
      },
      request
    );
  }

  const { rawToken } = await createSession(user.id);
  return ok(
    {
      token: rawToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        hasMpin: user.hasMpin,
        referralCode: user.referralCode,
        joinedAt: user.joinedAt
      }
    },
    request
  );
}

export async function verifyAdminTwoFactor(request) {
  cleanupExpiredAdminTwoFactorChallenges();
  const body = await getJsonBody(request);
  const challengeId = String(body.challengeId ?? "").trim();
  const otp = String(body.otp ?? "").trim();

  if (!challengeId || !/^[0-9]{6}$/.test(otp)) {
    return fail("Valid challengeId and 6 digit OTP are required", 400, request);
  }

  const challenge = adminTwoFactorChallenges.get(challengeId);
  if (!challenge) {
    return fail("2FA challenge expired. Login again.", 400, request);
  }
  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    adminTwoFactorChallenges.delete(challengeId);
    return fail("2FA challenge expired. Login again.", 400, request);
  }

  let valid = false;
  try {
    valid = await verifyOtp(challenge.phone, "admin_login", otp);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to verify 2FA code", 500, request);
  }

  if (!valid) {
    return fail("Invalid or expired 2FA code", 400, request);
  }

  const user = await findUserByPhone(challenge.phone);
  adminTwoFactorChallenges.delete(challengeId);
  if (!user || user.id !== challenge.userId || user.role !== "admin") {
    return fail("Admin account not available for 2FA completion", 403, request);
  }
  if (user.deactivatedAt) {
    return fail("Your account is deactivated. Contact support.", 403, request);
  }
  if (user.blockedAt) {
    return fail("Your account is blocked. Contact support.", 403, request);
  }
  if (user.approvalStatus !== "Approved") {
    return fail("Your account is not approved for admin access.", 403, request);
  }

  const { rawToken } = await createSession(user.id);
  return ok(
    {
      token: rawToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        hasMpin: user.hasMpin,
        referralCode: user.referralCode,
        joinedAt: user.joinedAt
      }
    },
    request
  );
}

export async function me(request) {
  const user = await requireUserByToken(getSessionToken(request));
  if (!user) {
    return unauthorized(request);
  }

  return ok(
    {
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      hasMpin: user.hasMpin,
      referralCode: user.referralCode,
      joinedAt: user.joinedAt,
      walletBalance: await getUserBalance(user.id)
    },
    request
  );
}
