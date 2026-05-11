import { fail, ok } from "../http.mjs";
import { requireAdminUser } from "../middleware/auth-middleware.mjs";
import { getAdminReferralReport } from "../services/admin-referral-service.mjs";

export async function adminReferralSummaryController(request) {
  const admin = await requireAdminUser(request);
  if (admin.response) return admin.response;

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 300);
  try {
    return ok(await getAdminReferralReport({ limit }), request);
  } catch (error) {
    return fail(error?.message || "Unable to load referral report", 500, request);
  }
}
