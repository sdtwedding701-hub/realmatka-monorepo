import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { standaloneConfig } from "../config.mjs";
import { logger } from "../ops/logger.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDataDir = path.resolve(__dirname, "..", "..", "..", "data");
const chartFileCache = new Map();
const r2ObjectCache = new Map();
let cachedS3Client = undefined;

function normalizePrefix(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

function getChartObjectKey(slug) {
  return `${normalizePrefix(standaloneConfig.r2ChartsPrefix)}${slug}.chart.json`;
}

function getLocalChartFilePath(slug) {
  return path.join(projectDataDir, `${slug}.chart.json`);
}

function getR2BucketEndpoint() {
  if (standaloneConfig.r2BucketEndpoint) {
    return standaloneConfig.r2BucketEndpoint.replace(/\/+$/, "");
  }
  if (standaloneConfig.r2AccountId) {
    return `https://${standaloneConfig.r2AccountId}.r2.cloudflarestorage.com`;
  }
  return "";
}

function hasPrivateR2Config() {
  return Boolean(
    standaloneConfig.r2AccountId &&
      standaloneConfig.r2AccessKeyId &&
      standaloneConfig.r2SecretAccessKey &&
      standaloneConfig.r2BucketName
  );
}

async function getS3Client() {
  if (cachedS3Client !== undefined) {
    return cachedS3Client;
  }

  if (!hasPrivateR2Config()) {
    cachedS3Client = null;
    return cachedS3Client;
  }

  try {
    const { S3Client } = await import("@aws-sdk/client-s3");
    cachedS3Client = new S3Client({
      region: "auto",
      endpoint: getR2BucketEndpoint(),
      credentials: {
        accessKeyId: standaloneConfig.r2AccessKeyId,
        secretAccessKey: standaloneConfig.r2SecretAccessKey
      }
    });
  } catch (error) {
    logger.warn("R2 SDK unavailable, chart source will skip private R2 access", {
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    cachedS3Client = null;
  }

  return cachedS3Client;
}

async function readChartJsonFromPrivateR2(slug) {
  const cacheKey = `private:${slug}`;
  if (r2ObjectCache.has(cacheKey)) {
    return r2ObjectCache.get(cacheKey);
  }

  const client = await getS3Client();
  if (!client) {
    return null;
  }

  try {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const response = await client.send(
      new GetObjectCommand({
        Bucket: standaloneConfig.r2BucketName,
        Key: getChartObjectKey(slug)
      })
    );
    const raw = await response.Body?.transformToString?.();
    const parsed = raw ? JSON.parse(raw) : null;
    r2ObjectCache.set(cacheKey, parsed);
    return parsed;
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "";
    if (errorName !== "NoSuchKey") {
      logger.warn("Private R2 chart read failed, falling back", {
        marketSlug: slug,
        errorMessage: error instanceof Error ? error.message : String(error)
      });
    }
    r2ObjectCache.set(cacheKey, null);
    return null;
  }
}

async function readChartJsonFromPublicR2(slug) {
  if (!standaloneConfig.r2PublicBaseUrl) {
    return null;
  }

  const cacheKey = `public:${slug}`;
  if (r2ObjectCache.has(cacheKey)) {
    return r2ObjectCache.get(cacheKey);
  }

  const baseUrl = standaloneConfig.r2PublicBaseUrl.replace(/\/+$/, "");
  const objectUrl = `${baseUrl}/${getChartObjectKey(slug)}`;
  try {
    const response = await fetch(objectUrl);
    if (!response.ok) {
      r2ObjectCache.set(cacheKey, null);
      return null;
    }
    const parsed = await response.json();
    r2ObjectCache.set(cacheKey, parsed);
    return parsed;
  } catch (error) {
    logger.warn("Public R2 chart read failed, falling back", {
      marketSlug: slug,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    r2ObjectCache.set(cacheKey, null);
    return null;
  }
}

function readChartJsonFromLocalFile(slug) {
  const filePath = getLocalChartFilePath(slug);
  if (!existsSync(filePath)) {
    return null;
  }

  if (!chartFileCache.has(filePath)) {
    try {
      chartFileCache.set(filePath, JSON.parse(readFileSync(filePath, "utf8")));
    } catch {
      chartFileCache.set(filePath, null);
    }
  }

  return chartFileCache.get(filePath);
}

export async function loadChartRowsForMarket(slug, chartType) {
  const r2Payload =
    (await readChartJsonFromPrivateR2(slug)) ??
    (await readChartJsonFromPublicR2(slug));
  const localPayload = !r2Payload ? readChartJsonFromLocalFile(slug) : null;
  const payload = r2Payload ?? localPayload;
  const rows = payload?.[chartType];
  return Array.isArray(rows) ? rows : [];
}
