import { corsPreflight } from "../http.mjs";
import { loginController, meController, verifyAdminTwoFactorController } from "../controllers/auth-controller.mjs";

export function options(request) {
  return corsPreflight(request);
}

export async function login(request) {
  return loginController(request);
}

export async function verifyAdminTwoFactor(request) {
  return verifyAdminTwoFactorController(request);
}

export async function me(request) {
  return meController(request);
}
