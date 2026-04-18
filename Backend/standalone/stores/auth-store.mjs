import {
  createSession as createSessionRecord,
  findUserByPhone as findUserByPhoneRecord,
  getAppSettings as getAppSettingsRecord,
  requireUserByToken as requireUserByTokenRecord,
  requireUserSnapshotByToken as requireUserSnapshotByTokenRecord,
  verifyCredential
} from "../db/auth-db.mjs";

export function verifyUserPassword(password, passwordHash) {
  return verifyCredential(password, passwordHash);
}

export async function findUserByPhone(phone) {
  return findUserByPhoneRecord(phone);
}

export async function createSession(userId) {
  return createSessionRecord(userId);
}

export async function getAppSettings() {
  return getAppSettingsRecord();
}

export async function requireUserSnapshotByToken(token) {
  return requireUserSnapshotByTokenRecord(token);
}

export async function requireUserByToken(token) {
  return requireUserByTokenRecord(token);
}
