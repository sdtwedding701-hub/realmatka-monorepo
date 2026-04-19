import { standaloneConfig, isStandalonePostgresEnabled } from "../config.mjs";

function maskUrl(value) {
  if (!value) {
    return "";
  }
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`;
  } catch {
    return value.slice(0, 24);
  }
}

export function validateEnvironment() {
  const errors = [];
  const warnings = [];
  const isProduction = process.env.NODE_ENV === "production";
  const summaries = {
    nodeEnv: process.env.NODE_ENV || "development",
    databaseProvider: standaloneConfig.databaseProvider,
    appUrl: maskUrl(standaloneConfig.appUrl),
    apiUrl: maskUrl(standaloneConfig.apiUrl),
    adminDomain: maskUrl(standaloneConfig.adminDomain),
    otpProvider: String(process.env.OTP_PROVIDER || "local").trim().toLowerCase(),
    paymentsEnabled: Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim()),
    paymentWebhooksEnabled: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim())
  };
  const hasR2AccountId = Boolean(standaloneConfig.r2AccountId);
  const hasR2AccessKeyId = Boolean(standaloneConfig.r2AccessKeyId);
  const hasR2SecretAccessKey = Boolean(standaloneConfig.r2SecretAccessKey);
  const hasR2BucketName = Boolean(standaloneConfig.r2BucketName);
  const hasR2PublicBaseUrl = Boolean(standaloneConfig.r2PublicBaseUrl);

  if (!Number.isFinite(standaloneConfig.port) || standaloneConfig.port <= 0) {
    errors.push("PORT must be a valid positive number");
  }

  if (isStandalonePostgresEnabled() && !standaloneConfig.databaseUrl) {
    errors.push("DATABASE_URL is required when DATABASE_PROVIDER=postgres");
  }

  if (isProduction) {
    if (!/^https:\/\//i.test(standaloneConfig.apiUrl || "")) {
      errors.push("Production requires EXPO_PUBLIC_API_BASE_URL to use https");
    }
    if (!/^https:\/\//i.test(standaloneConfig.appUrl || "")) {
      errors.push("Production requires EXPO_PUBLIC_APP_URL to use https");
    }
    if (!/^https:\/\//i.test(standaloneConfig.adminDomain || "")) {
      errors.push("Production requires ADMIN_DOMAIN to use https");
    }
    if (standaloneConfig.allowDefaultAdminSeed) {
      errors.push("ALLOW_DEFAULT_ADMIN_SEED must be false in production");
    }
  }

  if (summaries.otpProvider === "twilio") {
    const twilioIssues = [];
    if (!process.env.TWILIO_ACCOUNT_SID?.trim()) twilioIssues.push("TWILIO_ACCOUNT_SID");
    if (!process.env.TWILIO_AUTH_TOKEN?.trim()) twilioIssues.push("TWILIO_AUTH_TOKEN");
    if (!process.env.TWILIO_VERIFY_SERVICE_SID?.trim()) twilioIssues.push("TWILIO_VERIFY_SERVICE_SID");
    if (twilioIssues.length) {
      const message = `${twilioIssues.join(", ")} missing while OTP_PROVIDER=twilio`;
      if (isProduction) {
        errors.push(message);
      } else {
        warnings.push(message);
      }
    }
  }

  const hasRazorpayId = Boolean(process.env.RAZORPAY_KEY_ID?.trim());
  const hasRazorpaySecret = Boolean(process.env.RAZORPAY_KEY_SECRET?.trim());
  const hasRazorpayWebhook = Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim());
  if ((hasRazorpayId || hasRazorpaySecret) && !(hasRazorpayId && hasRazorpaySecret)) {
    const message = "Razorpay key env is partially configured";
    if (isProduction) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }

  if ((hasRazorpayId || hasRazorpaySecret) && !hasRazorpayWebhook) {
    warnings.push("RAZORPAY_WEBHOOK_SECRET missing, webhook verification route will stay disabled");
  }

  if (!/^https?:\/\//i.test(standaloneConfig.apiUrl || "")) {
    warnings.push("EXPO_PUBLIC_API_BASE_URL should be an absolute URL");
  }

  if (hasR2PublicBaseUrl && !/^https:\/\//i.test(standaloneConfig.r2PublicBaseUrl)) {
    warnings.push("R2_PUBLIC_BASE_URL should use https");
  }

  if (hasR2BucketName || hasR2PublicBaseUrl || hasR2AccountId || hasR2AccessKeyId || hasR2SecretAccessKey) {
    const hasPrivateR2Config = hasR2AccountId && hasR2AccessKeyId && hasR2SecretAccessKey && hasR2BucketName;
    const hasPublicR2Config = hasR2PublicBaseUrl;
    if (!hasPrivateR2Config && !hasPublicR2Config) {
      warnings.push("R2 config is partial. Set either R2_PUBLIC_BASE_URL or full private R2 credentials with bucket name");
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: summaries
  };
}
