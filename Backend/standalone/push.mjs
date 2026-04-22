import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { createNotification, listEnabledNotificationDevicesByUserIds } from "./db.mjs";
import { logger } from "./ops/logger.mjs";

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function getFirebaseAdminConfig() {
  const rawServiceAccount = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim();
  if (rawServiceAccount) {
    const parsed = JSON.parse(rawServiceAccount);
    if (parsed.private_key && typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  }

  const projectId = String(process.env.FIREBASE_PROJECT_ID || "").trim();
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey
  };
}

function getFirebaseMessagingClient() {
  const config = getFirebaseAdminConfig();
  if (!config) {
    logger.warn("FCM config missing", {
      hasServiceAccountJson: Boolean(String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim()),
      hasProjectId: Boolean(String(process.env.FIREBASE_PROJECT_ID || "").trim()),
      hasClientEmail: Boolean(String(process.env.FIREBASE_CLIENT_EMAIL || "").trim()),
      hasPrivateKey: Boolean(String(process.env.FIREBASE_PRIVATE_KEY || "").trim())
    });
    return null;
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert(config)
    });
  }

  return getMessaging();
}

function normalizeNotificationData(data) {
  const normalized = {};
  for (const [key, value] of Object.entries(data && typeof data === "object" ? data : {})) {
    if (value === undefined || value === null) {
      continue;
    }
    normalized[key] = typeof value === "string" ? value : JSON.stringify(value);
  }
  return normalized;
}

async function sendFcmBatch(messages) {
  if (!messages.length) {
    return { successCount: 0, failureCount: 0, responses: [] };
  }

  const messaging = getFirebaseMessagingClient();
  if (!messaging) {
    throw new Error("Firebase Admin SDK is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.");
  }

  logger.info("Sending FCM batch", { messageCount: messages.length });
  return messaging.sendEach(messages);
}

export async function notifyUsers(entries) {
  const normalizedEntries = (entries || [])
    .map((entry) => ({
      userId: String(entry?.userId || "").trim(),
      title: String(entry?.title || "").trim(),
      body: String(entry?.body || "").trim(),
      channel: String(entry?.channel || "general").trim(),
      data: entry?.data && typeof entry.data === "object" ? entry.data : {}
    }))
    .filter((entry) => entry.userId && entry.title && entry.body);

  if (!normalizedEntries.length) {
    return { created: [], pushed: 0, attempted: 0, errors: [] };
  }

  logger.info("Preparing notifications", {
    entryCount: normalizedEntries.length,
    channels: [...new Set(normalizedEntries.map((entry) => entry.channel))]
  });

  const created = await Promise.all(
    normalizedEntries.map((entry) =>
      createNotification({
        userId: entry.userId,
        title: entry.title,
        body: entry.body,
        channel: entry.channel
      })
    )
  );

  const devices = await listEnabledNotificationDevicesByUserIds(normalizedEntries.map((entry) => entry.userId));
  const devicesByUserId = new Map();
  for (const device of devices) {
    const bucket = devicesByUserId.get(device.userId) || [];
    bucket.push(device);
    devicesByUserId.set(device.userId, bucket);
  }

  const messages = [];
  for (const entry of normalizedEntries) {
    const userDevices = devicesByUserId.get(entry.userId) || [];
    for (const device of userDevices) {
      const token = String(device.token || "").trim();
      if (!token) {
        continue;
      }
      messages.push({
        token,
        notification: {
          title: entry.title,
          body: entry.body
        },
        android: {
          priority: "high",
          notification: {
            channelId: "default",
            sound: "default"
          }
        },
        data: {
          channel: entry.channel,
          ...normalizeNotificationData(entry.data)
        }
      });
    }
  }

  const errors = [];
  let pushed = 0;

  logger.info("Resolved notification devices", {
    entryCount: normalizedEntries.length,
    createdCount: created.length,
    deviceCount: devices.length,
    messageCount: messages.length
  });

  for (const chunk of chunkArray(messages, 100)) {
    try {
      const batchResponse = await sendFcmBatch(chunk);
      pushed += Number(batchResponse?.successCount || 0);
      logger.info("FCM batch result", {
        attempted: chunk.length,
        successCount: Number(batchResponse?.successCount || 0),
        failureCount: Number(batchResponse?.failureCount || 0)
      });
      (Array.isArray(batchResponse?.responses) ? batchResponse.responses : [])
        .filter((response) => !response?.success)
        .forEach((response) => {
          const message = response?.error?.message || "FCM push send failed";
          errors.push(message);
          logger.warn("FCM delivery error", { message });
        });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Push send failed");
      logger.error("FCM batch request failed", { error, attempted: chunk.length });
    }
  }

  logger.info("Notification dispatch completed", {
    createdCount: created.length,
    pushed,
    attempted: messages.length,
    errorCount: errors.length
  });

  return {
    created,
    pushed,
    attempted: messages.length,
    errors
  };
}
