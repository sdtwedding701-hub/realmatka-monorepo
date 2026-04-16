import type { ExpoConfig } from "expo/config";

const appName = process.env.EXPO_PUBLIC_APP_NAME || "Real Matka";
const slug = process.env.EXPO_PUBLIC_APP_SLUG || "realmatka-app";
const scheme = process.env.EXPO_PUBLIC_APP_SCHEME || "realmatka";
const firebaseProjectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "";
const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "2ac81200-9842-4a66-87ae-9b5daa9b96c2";
const appBuildProfile = process.env.APP_BUILD_PROFILE || "development";
const productionApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL_PRODUCTION || "https://realmatka-backend.onrender.com";
const localApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_APP_URL || "";
const apiBaseUrl = ["preview", "production"].includes(appBuildProfile) ? productionApiBaseUrl : localApiBaseUrl;

if (["preview", "production"].includes(appBuildProfile)) {
  if (!apiBaseUrl) {
    throw new Error("Preview and production mobile builds require EXPO_PUBLIC_API_BASE_URL to be set.");
  }

  if (!apiBaseUrl.startsWith("https://")) {
    throw new Error("Preview and production mobile builds require EXPO_PUBLIC_API_BASE_URL to use https://");
  }
}

const config: ExpoConfig = {
  name: appName,
  slug,
  scheme,
  version: "1.0.0",
  web: {
    bundler: "metro",
    output: "server"
  },
  plugins: ["expo-notifications"],
  extra: {
    apiBaseUrl,
    firebaseProjectId,
    appBuildProfile,
    ...(easProjectId
      ? {
          eas: {
            projectId: easProjectId
          }
        }
      : {})
  }
};

export default config;
