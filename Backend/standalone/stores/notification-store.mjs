import {
  listNotificationsForUser as listNotificationsForUserRecord,
  registerNotificationDevice as registerNotificationDeviceRecord
} from "../db/notification-db.mjs";

export const listNotificationsForUser = listNotificationsForUserRecord;
export const registerNotificationDevice = registerNotificationDeviceRecord;
