import {
  addWalletEntry,
  completePaymentLinkOrder,
  completePaymentOrder,
  createPaymentOrder,
  findPaymentOrderByReferenceForUser,
  findPaymentOrderForCheckout,
  findUserById,
  findWalletEntryByReferenceId,
  getUserBalance,
  handlePaymentWebhook,
  rebalanceWalletEntriesForUser,
  updateWalletEntryAdmin
} from "../stores/payment-store.mjs";
import { standaloneConfig } from "../config.mjs";

function roundToPaise(amount) {
  return Math.round(Number(amount || 0) * 100);
}

function validateDepositAmount(amountPaise) {
  if (amountPaise < 10000) {
    return "Minimum deposit is Rs. 100";
  }
  if (amountPaise % 10000 !== 0) {
    return "Deposit amount must be a multiple of Rs. 100";
  }
  return "";
}

function normalizeUpiClientStatus(value) {
  const status = String(value ?? "").trim().toUpperCase();
  if (status === "SUCCESS" || status === "SUBMITTED") {
    return "INITIATED";
  }
  if (status === "FAILED") {
    return "FAILED";
  }
  if (status === "CANCELLED") {
    return "CANCELLED";
  }
  return "";
}

export async function createHostedPaymentOrder({ user, amount, createPaymentLink }) {
  const amountPaise = roundToPaise(amount);
  const validationError = validateDepositAmount(amountPaise);
  if (validationError) {
    return { ok: false, status: 400, error: validationError };
  }

  await rebalanceWalletEntriesForUser(user.id);

  const paymentOrderId = `payment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const reference = `RM${Date.now()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`.slice(0, 40);
  const checkoutToken = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID().replace(/-/g, "") : `${Date.now()}${Math.random().toString(16).slice(2)}`;
  const paymentLink = await createPaymentLink({
    amountPaise,
    receipt: reference,
    paymentOrderId,
    user
  });

  const order = await createPaymentOrder({
    id: paymentOrderId,
    userId: user.id,
    amount,
    provider: "razorpay_payment_link",
    reference,
    checkoutToken,
    gatewayOrderId: paymentLink.id,
    redirectUrl: paymentLink.short_url
  });

  return { ok: true, data: order };
}

export async function createNativePaymentOrder({ user, amount, createOrder, getKeyId }) {
  const amountPaise = roundToPaise(amount);
  const validationError = validateDepositAmount(amountPaise);
  if (validationError) {
    return { ok: false, status: 400, error: validationError };
  }

  await rebalanceWalletEntriesForUser(user.id);

  const paymentOrderId = `payment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const reference = `RM${Date.now()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`.slice(0, 40);
  const checkoutToken = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID().replace(/-/g, "") : `${Date.now()}${Math.random().toString(16).slice(2)}`;
  const gatewayOrder = await createOrder({
    amountPaise,
    receipt: reference,
    paymentOrderId,
    user
  });

  const order = await createPaymentOrder({
    id: paymentOrderId,
    userId: user.id,
    amount,
    provider: "razorpay_checkout",
    reference,
    checkoutToken,
    gatewayOrderId: gatewayOrder.id,
    redirectUrl: null
  });

  return {
    ok: true,
    data: {
      ...order,
      checkoutMode: "native",
      gatewayOrderId: gatewayOrder.id,
      keyId: getKeyId(),
      displayName: standaloneConfig.paymentDisplayName || "Wallet Services",
      description: standaloneConfig.paymentDescription || "Wallet Top Up"
    }
  };
}

export async function getPaymentOrderStatusSnapshot({ userId, referenceId, isProviderEnabled, fetchPaymentLinkStatus }) {
  if (!referenceId) {
    return { ok: false, status: 400, error: "referenceId is required" };
  }

  let order = await findPaymentOrderByReferenceForUser(userId, referenceId);
  if (!order) {
    return { ok: false, status: 404, error: "Payment order not found" };
  }

  if (order.status === "PENDING" && order.provider === "razorpay_payment_link" && order.gatewayOrderId && isProviderEnabled) {
    const paymentLink = await fetchPaymentLinkStatus(order.gatewayOrderId);
    const remoteStatus = String(paymentLink?.status || "").trim().toLowerCase();

    if (remoteStatus === "paid") {
      await rebalanceWalletEntriesForUser(order.userId);
      order = await completePaymentLinkOrder({
        reference: order.reference,
        gatewayOrderId: String(order.gatewayOrderId || paymentLink.id || "").trim(),
        gatewayPaymentId: String(paymentLink.payment_id || paymentLink.payments?.[0]?.payment_id || paymentLink.payments?.[0]?.id || "").trim(),
        gatewaySignature: "payment_link_status_poll"
      });
    } else if (remoteStatus === "cancelled" || remoteStatus === "expired") {
      order = await handlePaymentWebhook(order.reference, "FAILED");
    } else {
      order = {
        ...order,
        remoteStatus: remoteStatus || "created"
      };
    }
  }

  return { ok: true, data: order };
}

export async function confirmNativePaymentOrder({ userId, referenceId, payload }) {
  if (!referenceId) {
    return { ok: false, status: 400, error: "referenceId is required" };
  }

  if (!payload?.razorpayPaymentId || !payload?.razorpayOrderId || !payload?.razorpaySignature) {
    return { ok: false, status: 400, error: "Payment confirmation payload is incomplete" };
  }

  const order = await findPaymentOrderByReferenceForUser(userId, referenceId);
  if (!order) {
    return { ok: false, status: 404, error: "Payment order not found" };
  }

  await rebalanceWalletEntriesForUser(order.userId);
  const updatedOrder = await completePaymentOrder({
    paymentOrderId: order.id,
    gatewayOrderId: payload.razorpayOrderId,
    gatewayPaymentId: payload.razorpayPaymentId,
    gatewaySignature: payload.razorpaySignature
  });

  return { ok: true, data: updatedOrder ?? order };
}

export async function startUpiDepositEntry({ userId, amount, appName, referenceId }) {
  if (amount <= 0) {
    return { ok: false, status: 400, error: "Amount must be greater than 0" };
  }
  if (!referenceId) {
    return { ok: false, status: 400, error: "referenceId is required" };
  }

  const existing = await findWalletEntryByReferenceId(userId, referenceId);
  if (existing) {
    return { ok: true, data: existing };
  }

  await rebalanceWalletEntriesForUser(userId);
  const beforeBalance = await getUserBalance(userId);
  const entry = await addWalletEntry({
    userId,
    type: "DEPOSIT",
    status: "INITIATED",
    amount,
    beforeBalance,
    afterBalance: beforeBalance,
    referenceId,
    note: JSON.stringify({
      channel: "upi_intent",
      appName,
      appReportedStatus: "STARTED"
    })
  });

  return { ok: true, data: entry };
}

export async function reportUpiDepositEntry({ userId, referenceId, appName, rawResponse, utr, appReportedStatus }) {
  if (!referenceId) {
    return { ok: false, status: 400, error: "referenceId is required" };
  }
  const mappedStatus = normalizeUpiClientStatus(appReportedStatus);
  if (!mappedStatus) {
    return { ok: false, status: 400, error: "Unsupported appReportedStatus" };
  }

  const existing = await findWalletEntryByReferenceId(userId, referenceId);
  if (!existing) {
    return { ok: false, status: 404, error: "Deposit request not found" };
  }

  const nextNote = [
    `UPI App: ${appName}`,
    `Client Status: ${String(appReportedStatus ?? "").trim().toUpperCase()}`,
    utr ? `UTR: ${utr}` : "",
    rawResponse ? `Raw: ${rawResponse}` : ""
  ]
    .filter(Boolean)
    .join(" | ");

  const updated = await updateWalletEntryAdmin(existing.id, {
    status: mappedStatus,
    referenceId: utr || referenceId,
    note: nextNote
  });

  return { ok: true, data: updated };
}

export async function getUpiDepositEntry({ userId, referenceId }) {
  if (!referenceId) {
    return { ok: false, status: 400, error: "referenceId is required" };
  }

  const existing = await findWalletEntryByReferenceId(userId, referenceId);
  if (!existing) {
    return { ok: false, status: 404, error: "Deposit request not found" };
  }

  return { ok: true, data: existing };
}

export async function resolveCheckoutSession({ paymentOrderId, checkoutToken }) {
  const paymentOrder = await findPaymentOrderForCheckout(paymentOrderId, checkoutToken);
  if (!paymentOrder) {
    return { ok: false, status: 404, error: "Invalid payment link" };
  }

  const user = await findUserById(paymentOrder.userId);
  return { ok: true, data: { paymentOrder, user } };
}

export async function completeCheckoutSession({ paymentOrderId, checkoutToken, payload }) {
  const paymentOrder = await findPaymentOrderForCheckout(paymentOrderId, checkoutToken);
  if (!paymentOrder) {
    return { ok: false, status: 404, error: "Payment session invalid" };
  }

  if (!payload?.razorpayPaymentId || !payload?.razorpayOrderId || !payload?.razorpaySignature) {
    return { ok: false, status: 400, error: "Payment confirmation payload is incomplete", data: { paymentOrder } };
  }

  await rebalanceWalletEntriesForUser(paymentOrder.userId);
  const updatedOrder = await completePaymentOrder({
    paymentOrderId: paymentOrder.id,
    gatewayOrderId: payload.razorpayOrderId,
    gatewayPaymentId: payload.razorpayPaymentId,
    gatewaySignature: payload.razorpaySignature
  });

  return { ok: true, data: { paymentOrder: updatedOrder ?? paymentOrder } };
}

export async function processPaymentWebhook({ event, reference, gatewayOrderId, gatewayPaymentId, gatewaySignature }) {
  if (event === "payment_link.paid") {
    const updated = await completePaymentLinkOrder({
      reference,
      gatewayOrderId,
      gatewayPaymentId,
      gatewaySignature
    });

    if (!updated) {
      return { ok: false, status: 404, error: "Payment link order not found" };
    }

    return { ok: true, data: { received: true, event, status: "SUCCESS", order: updated } };
  }

  return { ok: true, data: { received: true, event, status: "IGNORED" } };
}
