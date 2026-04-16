import { createNotification, listEnabledNotificationDevicesByUserIds } from "./db.mjs";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function isExpoPushToken(token) {
  return /^ExponentPushToken\[.+\]$/.test(token) || /^ExpoPushToken\[.+\]$/.test(token);
}

async function sendExpoPushBatch(messages) {
  if (!messages.length) {
    return [];
  }

  const response = await fetch(EXPO_PUSH_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(messages)
  });

  if (!response.ok) {
    const preview = await response.text();
    throw new Error(`Expo push request failed (${response.status}): ${preview.slice(0, 200)}`);
  }

  const payload = await response.json();
  return Array.isArray(payload?.data) ? payload.data : [];
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
      if (!isExpoPushToken(device.token)) {
        continue;
      }
      messages.push({
        to: device.token,
        title: entry.title,
        body: entry.body,
        sound: "default",
        priority: "high",
        channelId: "default",
        data: {
          channel: entry.channel,
          ...entry.data
        }
      });
    }
  }

  const errors = [];
  let pushed = 0;

  for (const chunk of chunkArray(messages, 100)) {
    try {
      const tickets = await sendExpoPushBatch(chunk);
      pushed += tickets.filter((ticket) => ticket?.status === "ok").length;
      tickets
        .filter((ticket) => ticket?.status && ticket.status !== "ok")
        .forEach((ticket) => errors.push(ticket?.message || "Push ticket error"));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Push send failed");
    }
  }

  return {
    created,
    pushed,
    attempted: messages.length,
    errors
  };
}
