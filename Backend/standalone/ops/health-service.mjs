import { access } from "node:fs/promises";
import { isStandalonePostgresEnabled, standaloneConfig } from "../config.mjs";
import { __internalGetReadyPgPool, __internalGetSqlite } from "../db.mjs";
import { validateEnvironment } from "./env-validator.mjs";

async function checkManifest(routesManifestPath) {
  try {
    await access(routesManifestPath);
    return { status: "ok", mode: "expo-dist" };
  } catch (error) {
    const isMissingManifest = error?.code === "ENOENT";
    return {
      status: isMissingManifest ? "warn" : "error",
      mode: isMissingManifest ? "standalone-only" : "unknown",
      message: isMissingManifest
        ? "Expo routes manifest not found. Running with standalone API routes only."
        : error instanceof Error
          ? error.message
          : "Manifest unavailable"
    };
  }
}

async function checkDatabase() {
  if (isStandalonePostgresEnabled()) {
    try {
      const pool = await __internalGetReadyPgPool();
      await pool.query("SELECT 1");
      return {
        status: "ok",
        provider: "postgres"
      };
    } catch (error) {
      return {
        status: "error",
        provider: "postgres",
        message: error instanceof Error ? error.message : "Postgres unavailable"
      };
    }
  }

  try {
    __internalGetSqlite().prepare("SELECT 1 AS health").get();
    return {
      status: "ok",
      provider: "sqlite"
    };
  } catch (error) {
    return {
      status: "error",
      provider: "sqlite",
      message: error instanceof Error ? error.message : "SQLite unavailable"
    };
  }
}

export async function getHealthSnapshot({ startedAt, routesManifestPath }) {
  const env = validateEnvironment();
  const [manifest, database] = await Promise.all([checkManifest(routesManifestPath), checkDatabase()]);
  const checks = {
    env: {
      status: env.ok ? (env.warnings.length ? "warn" : "ok") : "error",
      errors: env.errors,
      warnings: env.warnings
    },
    manifest,
    database
  };

  const statuses = Object.values(checks).map((item) => item.status);
  const overallStatus = statuses.includes("error") ? "error" : statuses.includes("warn") ? "warn" : "ok";

  return {
    ok: overallStatus !== "error",
    status: overallStatus,
    service: "realmatka-api",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    runtime: {
      node: process.version,
      pid: process.pid,
      env: process.env.NODE_ENV || "development",
      port: standaloneConfig.port
    },
    config: {
      databaseProvider: standaloneConfig.databaseProvider,
      appUrl: standaloneConfig.appUrl,
      apiUrl: standaloneConfig.apiUrl,
      adminDomain: standaloneConfig.adminDomain
    },
    checks,
    memory: process.memoryUsage()
  };
}
