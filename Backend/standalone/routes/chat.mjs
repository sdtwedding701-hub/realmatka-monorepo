import { corsPreflight } from "../http.mjs";
import {
  adminConversationsController,
  adminMessagesController,
  adminSendController,
  adminUpdateStatusController,
  userConversationController,
  userSendController
} from "../controllers/chat-controller.mjs";

export function options(request) {
  return corsPreflight(request);
}

export async function userConversation(request) {
  return userConversationController(request);
}

export async function userSend(request) {
  return userSendController(request);
}

export async function adminConversations(request) {
  return adminConversationsController(request);
}

export async function adminMessages(request) {
  return adminMessagesController(request);
}

export async function adminSend(request) {
  return adminSendController(request);
}

export async function adminUpdateStatus(request) {
  return adminUpdateStatusController(request);
}
