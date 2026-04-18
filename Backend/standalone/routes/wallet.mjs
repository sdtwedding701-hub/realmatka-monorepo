import { corsPreflight } from "../http.mjs";
import {
  walletConfirmWithdrawController,
  walletDepositController,
  walletHistoryController,
  walletRequestWithdrawOtpController,
  walletWithdrawController
} from "../controllers/wallet-controller.mjs";

export function options(request) {
  return corsPreflight(request);
}

export async function history(request) {
  return walletHistoryController(request);
}

export async function deposit(request) {
  return walletDepositController(request);
}

export async function withdraw(request) {
  return walletWithdrawController(request);
}

export async function requestWithdrawOtp(request) {
  return walletRequestWithdrawOtpController(request);
}

export async function confirmWithdraw(request) {
  return walletConfirmWithdrawController(request);
}
