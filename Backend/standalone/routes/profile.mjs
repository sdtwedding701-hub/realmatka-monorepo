import { getReferralOverview, getUserBalance, updateUserProfile } from "../db.mjs";
import { requireAuthenticatedUser } from "../middleware/auth-middleware.mjs";
import { corsPreflight, fail, getJsonBody, normalizeIndianPhone, ok } from "../http.mjs";

export function options(request) {
  return corsPreflight(request);
}

export async function update(request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;

  const body = await getJsonBody(request);
  const name = String(body.name ?? "").trim();
  const phone = normalizeIndianPhone(String(body.phone ?? "")) ?? String(body.phone ?? "").trim();

  if (!name || !phone) {
    return fail("name and phone are required", 400, request);
  }

  const updated = await updateUserProfile(auth.user.id, { name, phone });
  if (!updated) {
    return fail("User not found", 404, request);
  }

  return ok(
    {
      id: updated.id,
      phone: updated.phone,
      name: updated.name,
      referralCode: updated.referralCode,
      joinedAt: updated.joinedAt,
      walletBalance: await getUserBalance(updated.id)
    },
    request
  );
}

export async function referrals(request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;

  const overview = await getReferralOverview(auth.user.id);

  return ok(
    {
      referralCode: auth.user.referralCode,
      referredCount: overview.referredCount,
      referralIncomeTotal: overview.referralIncomeTotal,
      referredUsers: overview.referredUsers
    },
    request
  );
}
