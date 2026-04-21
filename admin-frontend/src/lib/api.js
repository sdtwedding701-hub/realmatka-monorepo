export function normalizeAdminApiBase(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  return raw
    .replace(/\/api\/auth\/login\/?$/i, "")
    .replace(/\/api\/auth\/me\/?$/i, "")
    .replace(/\/+$/, "");
}

export async function postJson(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error(`API server connect nahi ho raha. API Base URL check karo: ${url.replace(/\/api\/auth\/login$/, "")}`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`API JSON response nahi de raha. URL check karo: ${url}`);
  }

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload.data;
}

export async function fetchApi(apiBase, path, token, options = {}) {
  const normalizedBase = normalizeAdminApiBase(apiBase);
  let response;
  try {
    response = await fetch(`${normalizedBase}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {})
    });
  } catch {
    throw new Error(`API server connect nahi ho raha. API Base URL check karo: ${normalizedBase || apiBase}`);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    const message = payload?.error || "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.requestId = response.headers.get("x-request-id") || "";
    throw error;
  }

  return payload.data;
}

export async function fetchHealth(apiBase) {
  const normalizedBase = normalizeAdminApiBase(apiBase);
  let response;
  try {
    response = await fetch(`${normalizedBase}/health`);
  } catch {
    throw new Error(`API server connect nahi ho raha. API Base URL check karo: ${normalizedBase || apiBase}`);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.service) {
    const error = new Error(payload?.error || "Health check failed");
    error.status = response.status;
    error.requestId = response.headers.get("x-request-id") || "";
    throw error;
  }

  return {
    ...payload,
    requestId: response.headers.get("x-request-id") || ""
  };
}

function mapUserFacingError(message, fallback) {
  const normalized = String(message || "").trim();
  const lower = normalized.toLowerCase();

  if (!normalized) {
    return fallback;
  }
  if (lower.includes("invalid phone or password")) {
    return "Wrong phone number ya password.";
  }
  if (lower.includes("invalid otp")) {
    return "Wrong OTP. Dobara try karo.";
  }
  if (lower.includes("invalid authenticator code")) {
    return "Wrong 2FA code. Dobara try karo.";
  }
  if (lower.includes("challenge expired") || lower.includes("setup required")) {
    return "Session expire ho gaya. Dobara login karo.";
  }
  if (lower.includes("admin access required")) {
    return "Admin access required.";
  }
  if (lower.includes("api server connect nahi ho raha")) {
    return "Server connect nahi ho raha. Thodi der baad retry karo.";
  }
  if (lower.includes("request failed")) {
    return fallback;
  }

  return normalized;
}

export function formatApiError(error, fallback = "Request failed") {
  return mapUserFacingError(error?.message || fallback, fallback);
}
