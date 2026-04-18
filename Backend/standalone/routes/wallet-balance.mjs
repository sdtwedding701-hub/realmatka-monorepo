import { corsPreflight } from "../http.mjs";
import { walletBalanceController } from "../controllers/wallet-controller.mjs";

export function options(request) {
  return corsPreflight(request);
}

export async function balance(request) {
  return walletBalanceController(request);
}
