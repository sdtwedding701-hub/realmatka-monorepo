import { addBankAccount, getBankAccountsForUser } from "../db.mjs";
import { requireAuthenticatedUser } from "../middleware/auth-middleware.mjs";
import { corsPreflight, fail, getJsonBody, ok } from "../http.mjs";

export function options(request) {
  return corsPreflight(request);
}

export async function list(request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;

  return ok(await getBankAccountsForUser(auth.user.id), request);
}

export async function add(request) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response) return auth.response;

  const body = await getJsonBody(request);
  const accountNumber = String(body.accountNumber ?? "");
  const holderName = String(body.holderName ?? "");
  const ifsc = String(body.ifsc ?? "");

  if (!accountNumber || !holderName || !ifsc) {
    return fail("accountNumber, holderName, and ifsc are required", 400, request);
  }

  return ok(await addBankAccount({ userId: auth.user.id, accountNumber, holderName, ifsc }), request);
}
