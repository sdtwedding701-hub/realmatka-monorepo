import type { ExpoConfig } from "expo/config";

const appName = process.env.EXPO_PUBLIC_APP_NAME || "Real Matka";
const slug = process.env.EXPO_PUBLIC_APP_SLUG || "realmatka-app";
const scheme = process.env.EXPO_PUBLIC_APP_SCHEME || "realmatka";
const expoOwner = process.env.EXPO_PUBLIC_EXPO_OWNER || "siddhantborkar";
const firebaseProjectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "";
const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || "9fa7873a-3033-40f2-b845-41d7dbd6e447";
const androidPackage = process.env.EXPO_PUBLIC_ANDROID_PACKAGE || "com.realmatka.app";
const iosBundleIdentifier = process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER || "com.realmatka.app";
const appBuildProfile = process.env.APP_BUILD_PROFILE || "development";
const webOutput = process.env.EXPO_PUBLIC_WEB_OUTPUT || "single";
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
  owner: expoOwner,
  scheme,
  version: "1.0.0",
  icon: "./assets/images/app-icon.png",
  splash: {
    image: "./assets/images/app-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  android: {
    package: androidPackage,
    jsEngine: "hermes",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff"
    }
  },
  ios: {
    bundleIdentifier: iosBundleIdentifier
  },
  web: {
    bundler: "metro",
    output: webOutput as "single" | "server",
    favicon: "./assets/images/app-icon.png"
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
