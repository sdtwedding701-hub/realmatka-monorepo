import { randomBytes } from "node:crypto";
import { createSession, findUserByPhone, getAppSettings, requireUserSnapshotByToken, verifyUserPassword } from "../stores/auth-store.mjs";
import { issueOtp, verifyOtp } from "../routes/auth-otp.mjs";

const adminTwoFactorChallenges = new Map();

function sanitizeSessionUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    hasMpin: user.hasMpin,
    referralCode: user.referralCode,
    joinedAt: user.joinedAt
  };
}

function assertApprovedActiveUser(user) {
  if (user.deactivatedAt) {
    throw new Error("Your account is deactivated. Contact support.");
  }
  if (user.blockedAt) {
    throw new Error("Your account is blocked. Contact support.");
  }
  if (user.approvalStatus !== "Approved") {
    throw new Error(
      user.approvalStatus === "Rejected"
        ? "Your account registration was rejected. Contact support."
        : "Your account is pending admin approval."
    );
  }
}

function cleanupExpiredAdminTwoFactorChallenges() {
  const now = Date.now();
  for (const [challengeId, challenge] of adminTwoFactorChallenges.entries()) {
    if (new Date(challenge.expiresAt).getTime() <= now) {
      adminTwoFactorChallenges.delete(challengeId);
    }
  }
}

export async function isAdminTwoFactorEnabled() {
  const settings = await getAppSettings();
  const match = settings.find((item) => item.key === "admin_two_factor_enabled");
  return String(match?.value ?? "true").trim().toLowerCase() !== "false";
}

export async function loginWithPassword(phone, password) {
  const user = await findUserByPhone(phone);
  if (!user || !verifyUserPassword(password, user.passwordHash)) {
    return { ok: false, status: 401, error: "Invalid phone or password" };
  }

  try {
    assertApprovedActiveUser(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return { ok: false, status: message.includes("pending admin approval") ? 403 : 403, error: message };
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

    return {
      ok: true,
      data: {
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
      }
    };
  }

  const { rawToken } = await createSession(user.id);
  return {
    ok: true,
    data: {
      token: rawToken,
      user: sanitizeSessionUser(user)
    }
  };
}

export async function verifyAdminTwoFactorLogin(challengeId, otp) {
  cleanupExpiredAdminTwoFactorChallenges();

  const challenge = adminTwoFactorChallenges.get(challengeId);
  if (!challenge) {
    return { ok: false, status: 400, error: "2FA challenge expired. Login again." };
  }
  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    adminTwoFactorChallenges.delete(challengeId);
    return { ok: false, status: 400, error: "2FA challenge expired. Login again." };
  }

  let valid = false;
  try {
    valid = await verifyOtp(challenge.phone, "admin_login", otp);
  } catch (error) {
    return { ok: false, status: 500, error: error instanceof Error ? error.message : "Unable to verify 2FA code" };
  }

  if (!valid) {
    return { ok: false, status: 400, error: "Invalid or expired 2FA code" };
  }

  const user = await findUserByPhone(challenge.phone);
  adminTwoFactorChallenges.delete(challengeId);

  if (!user || user.id !== challenge.userId || user.role !== "admin") {
    return { ok: false, status: 403, error: "Admin account not available for 2FA completion" };
  }
  if (user.deactivatedAt) {
    return { ok: false, status: 403, error: "Your account is deactivated. Contact support." };
  }
  if (user.blockedAt) {
    return { ok: false, status: 403, error: "Your account is blocked. Contact support." };
  }
  if (user.approvalStatus !== "Approved") {
    return { ok: false, status: 403, error: "Your account is not approved for admin access." };
  }

  const { rawToken } = await createSession(user.id);
  return {
    ok: true,
    data: {
      token: rawToken,
      user: sanitizeSessionUser(user)
    }
  };
}

export async function getCurrentSessionUser(token) {
  const user = await requireUserSnapshotByToken(token);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    hasMpin: user.hasMpin,
    referralCode: user.referralCode,
    joinedAt: user.joinedAt,
    walletBalance: Number(user.walletBalance ?? 0)
  };
}
