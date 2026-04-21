import { corsPreflight } from "../http.mjs";
import { notificationsHistoryController, notificationsMarkReadController, notificationsRegisterDeviceController } from "../controllers/notifications-controller.mjs";

export function options(request) {
  return corsPreflight(request);
}

export async function history(request) {
  return notificationsHistoryController(request);
}

export async function registerDevice(request) {
  return notificationsRegisterDeviceController(request);
}

export async function markRead(request) {
  return notificationsMarkReadController(request);
}
