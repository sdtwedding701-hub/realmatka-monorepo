import {
  listNotificationsForUser as listNotificationsForUserRecord,
  markNotificationsReadForUser as markNotificationsReadForUserRecord,
  registerNotificationDevice as registerNotificationDeviceRecord
} from "../db/notification-db.mjs";

export const listNotificationsForUser = listNotificationsForUserRecord;
export const markNotificationsReadForUser = markNotificationsReadForUserRecord;
export const registerNotificationDevice = registerNotificationDeviceRecord;
