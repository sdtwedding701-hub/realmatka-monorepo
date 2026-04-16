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
    throw error;
  }

  return payload.data;
}
