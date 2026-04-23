import { Platform } from "react-native";

function getUserAgent() {
  if (typeof navigator === "undefined") {
    return "";
  }
  return String(navigator.userAgent || "");
}

export function isAndroidMobileWeb() {
  if (Platform.OS !== "web") {
    return false;
  }

  const userAgent = getUserAgent().toLowerCase();
  return userAgent.includes("android") && userAgent.includes("mobile");
}

export function isSupportedAddFundPlatform() {
  if (Platform.OS === "android") {
    return true;
  }

  return isAndroidMobileWeb();
}

export function getAddFundUnsupportedMessage() {
  return "Add Fund sirf Android app ya Android mobile browser me available hai.";
}
