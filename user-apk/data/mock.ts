export const gameRates = [
  { code: "SD", label: "Single Digit", value: 10, color: "#2563eb" },
  { code: "JD", label: "Jodi Digit", value: 100, color: "#0f766e" },
  { code: "SP", label: "Single Pana", value: 160, color: "#9333ea" },
  { code: "DP", label: "Double Pana", value: 320, color: "#ea580c" },
  { code: "TP", label: "Triple Pana", value: 1000, color: "#dc2626" },
  { code: "FS", label: "Full Sangam", value: 10000, color: "#111827" }
] as const;

export const profile = {
  name: "RealMatka User",
  phone: "0000000000",
  memberSince: "Joined recently",
  referralCode: "RM2026"
} as const;

export const rules = [
  "Bid place karne se pehle market aur session type verify karo.",
  "Galat digit ya panel entry submit hone ke baad change nahi hogi.",
  "Withdraw request process hone ke liye verified bank account required hai.",
  "Admin approval ke bina naye account se full access available nahi hota.",
  "Result settlement ke baad wallet ledger automatically update hota hai."
] as const;

export const drawerItems = [
  { label: "Profile", href: "/profile", icon: "person-outline" },
  { label: "Game Rates", href: "/game-rates", icon: "grid-outline" },
  { label: "Bonus", href: "/bonus", icon: "gift-outline" },
  { label: "Home", href: "/(tabs)", icon: "home-outline" },
  { label: "Wallet", href: "/wallet/history", icon: "wallet-outline" },
  { label: "Notifications", href: "/notifications", icon: "notifications-outline" },
  { label: "Change Password", href: "/security/reset-password", icon: "lock-closed-outline" },
  { label: "Update PIN", href: "/security/update-pin", icon: "key-outline" },
  { label: "Rules", href: "/rules", icon: "document-text-outline" }
] as const;

const MARKET_TIME_CHANGE_EFFECTIVE_DATE = "2026-04-27";
const MARKET_TIME_CHANGE_OVERRIDES: Record<string, { open: string; close: string }> = {
  "kalyan": { open: "03:45 PM", close: "05:45 PM" },
  "time-bazar": { open: "01:10 PM", close: "02:10 PM" },
  "milan-day": { open: "03:10 PM", close: "05:10 PM" },
  "milan-night": { open: "09:10 PM", close: "11:10 PM" }
};

function getIndiaDateKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
}

function applyMarketTimeOverrides<T extends { slug: string; open: string; close: string }>(markets: T[]) {
  if (getIndiaDateKey() < MARKET_TIME_CHANGE_EFFECTIVE_DATE) {
    return markets;
  }
  return markets.map((market) => {
    const override = MARKET_TIME_CHANGE_OVERRIDES[market.slug];
    return override ? { ...market, open: override.open, close: override.close } : market;
  });
}

const baseMarketCatalog = [
  { slug: "ntr-morning", name: "NTR Morning", category: "games", open: "09:00 AM", close: "10:00 AM" },
  { slug: "sita-morning", name: "Sita Morning", category: "games", open: "09:40 AM", close: "10:40 AM" },
  { slug: "karnataka-day", name: "Karnataka Day", category: "games", open: "09:55 AM", close: "10:55 AM" },
  { slug: "star-tara-morning", name: "Star Tara Morning", category: "games", open: "10:05 AM", close: "11:05 AM" },
  { slug: "milan-morning", name: "Milan Morning", category: "games", open: "10:10 AM", close: "11:10 AM" },
  { slug: "maya-bazar", name: "Maya Bazar", category: "games", open: "10:15 AM", close: "11:15 AM" },
  { slug: "andhra-morning", name: "Andhra Morning", category: "games", open: "10:35 AM", close: "11:35 AM" },
  { slug: "sridevi", name: "Sridevi", category: "games", open: "11:25 AM", close: "12:25 PM" },
  { slug: "mahadevi-morning", name: "Mahadevi Morning", category: "games", open: "11:40 AM", close: "12:40 PM" },
  { slug: "time-bazar", name: "Time Bazar", category: "games", open: "12:45 PM", close: "01:45 PM" },
  { slug: "madhur-day", name: "Madhur Day", category: "games", open: "01:20 PM", close: "02:20 PM" },
  { slug: "sita-day", name: "Sita Day", category: "games", open: "01:40 PM", close: "02:40 PM" },
  { slug: "star-tara-day", name: "Star Tara Day", category: "games", open: "02:15 PM", close: "03:15 PM" },
  { slug: "milan-day", name: "Milan Day", category: "games", open: "02:45 PM", close: "04:45 PM" },
  { slug: "rajdhani-day", name: "Rajdhani Day", category: "games", open: "03:00 PM", close: "05:00 PM" },
  { slug: "andhra-day", name: "Andhra Day", category: "games", open: "03:30 PM", close: "05:30 PM" },
  { slug: "kalyan", name: "Kalyan", category: "games", open: "04:10 PM", close: "06:10 PM" },
  { slug: "mahadevi", name: "Mahadevi", category: "games", open: "04:25 PM", close: "06:25 PM" },
  { slug: "ntr-day", name: "NTR Day", category: "games", open: "04:50 PM", close: "06:50 PM" },
  { slug: "sita-night", name: "Sita Night", category: "games", open: "06:40 PM", close: "07:40 PM" },
  { slug: "sridevi-night", name: "Sridevi Night", category: "games", open: "07:05 PM", close: "08:05 PM" },
  { slug: "star-tara-night", name: "Star Tara Night", category: "games", open: "07:15 PM", close: "08:15 PM" },
  { slug: "mahadevi-night", name: "Mahadevi Night", category: "games", open: "07:45 PM", close: "08:45 PM" },
  { slug: "madhur-night", name: "Madhur Night", category: "games", open: "08:20 PM", close: "10:20 PM" },
  { slug: "supreme-night", name: "Supreme Night", category: "games", open: "08:35 PM", close: "10:35 PM" },
  { slug: "andhra-night", name: "Andhra Night", category: "games", open: "08:40 PM", close: "10:40 PM" },
  { slug: "ntr-night", name: "NTR Night", category: "games", open: "08:50 PM", close: "10:50 PM" },
  { slug: "milan-night", name: "Milan Night", category: "games", open: "08:50 PM", close: "10:50 PM" },
  { slug: "kalyan-night", name: "Kalyan Night", category: "games", open: "09:25 PM", close: "11:25 PM" },
  { slug: "rajdhani-night", name: "Rajdhani Night", category: "games", open: "09:30 PM", close: "11:40 PM" },
  { slug: "main-bazar", name: "Main Bazar", category: "games", open: "09:45 PM", close: "11:55 PM" },
  { slug: "mangal-bazar", name: "Mangal Bazar", category: "games", open: "10:05 PM", close: "11:05 PM" }
] as const;

export const marketCatalog = applyMarketTimeOverrides([...baseMarketCatalog]);
