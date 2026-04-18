import {
  createAdminSession as createAdminSessionRecord,
  createSession as createSessionRecord,
  findAdminById as findAdminByIdRecord,
  findUserByPhone as findUserByPhoneRecord,
  getAppSettings as getAppSettingsRecord,
  requireAdminByToken as requireAdminByTokenRecord,
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

export async function findAdminByPhone(phone) {
  const { findAdminByPhone: findAdminByPhoneRecord } = await import("../db/auth-db.mjs");
  return findAdminByPhoneRecord(phone);
}

export async function findAdminById(adminId) {
  return findAdminByIdRecord(adminId);
}

export async function createSession(userId) {
  return createSessionRecord(userId);
}

export async function createAdminSession(adminId) {
  return createAdminSessionRecord(adminId);
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

export async function requireAdminByToken(token) {
  return requireAdminByTokenRecord(token);
}
