import { createHmac, randomBytes } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_DIGITS = 6;
const TOTP_TIME_STEP_SECONDS = 30;
const TOTP_WINDOW_STEPS = 1;

function normalizeBase32(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, "");
}

function decodeBase32(value) {
  const normalized = normalizeBase32(value);
  let bits = 0;
  let bitBuffer = 0;
  const bytes = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      continue;
    }
    bitBuffer = (bitBuffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((bitBuffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function encodeBase32(buffer) {
  let bits = 0;
  let bitBuffer = 0;
  let output = "";

  for (const byte of buffer) {
    bitBuffer = (bitBuffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(bitBuffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(bitBuffer << (5 - bits)) & 31];
  }

  return output;
}

function formatSecretForDisplay(secret) {
  return normalizeBase32(secret).match(/.{1,4}/g)?.join(" ") ?? normalizeBase32(secret);
}

function generateHotp(secret, counter) {
  const key = decodeBase32(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function generateTotpSecret() {
  return encodeBase32(randomBytes(20));
}

export function buildTotpSetupPayload({ secret, issuer, accountName }) {
  const normalizedSecret = normalizeBase32(secret);
  const safeIssuer = String(issuer || "Real Matka").trim() || "Real Matka";
  const safeAccountName = String(accountName || "").trim() || "admin";
  const label = encodeURIComponent(`${safeIssuer}:${safeAccountName}`);
  const params = new URLSearchParams({
    secret: normalizedSecret,
    issuer: safeIssuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_TIME_STEP_SECONDS)
  });

  return {
    secret: normalizedSecret,
    displaySecret: formatSecretForDisplay(normalizedSecret),
    issuer: safeIssuer,
    accountName: safeAccountName,
    otpauthUrl: `otpauth://totp/${label}?${params.toString()}`
  };
}

export function verifyTotpCode(secret, code, now = Date.now()) {
  const normalizedCode = String(code || "").replace(/\D/g, "");
  if (!/^[0-9]{6}$/.test(normalizedCode)) {
    return false;
  }

  const counter = Math.floor(now / 1000 / TOTP_TIME_STEP_SECONDS);
  for (let offset = -TOTP_WINDOW_STEPS; offset <= TOTP_WINDOW_STEPS; offset += 1) {
    if (generateHotp(secret, counter + offset) === normalizedCode) {
      return true;
    }
  }
  return false;
}
