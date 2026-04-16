export function normalizeIndianPhone(input: string) {
  const digits = input.replace(/\D/g, "");

  if (digits.length === 10) {
    return digits;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  return null;
}

export function requireIndianPhone(input: string) {
  const normalized = normalizeIndianPhone(input);
  if (!normalized) {
    throw new Error("Phone number must be a valid 10 digit Indian mobile number");
  }

  return normalized;
}
