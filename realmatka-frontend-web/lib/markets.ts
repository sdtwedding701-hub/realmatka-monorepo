export type SessionKey = "morning" | "day" | "night";
export type MarketKey = "sita" | "kamal" | "andhra" | "star-tara" | "sridevi" | "bharat" | "mahadevi";
export const SESSIONS: Record<SessionKey, { name: string }> = { morning:{name:"Morning"}, day:{name:"Day"}, night:{name:"Night"} };
export const MARKETS: Record<MarketKey, { name: string; hasSessions: SessionKey[] }> = {
  "sita": { name: "Sita", hasSessions: ["morning","day","night"] },
  "kamal": { name: "Kamal", hasSessions: ["morning","day","night"] },
  "andhra": { name: "Andhra", hasSessions: ["morning","day","night"] },
  "star-tara": { name: "Star Tara", hasSessions: ["morning","day","night"] },
  "sridevi": { name: "Sridevi", hasSessions: ["morning","day","night"] },
  "bharat": { name: "Bharat", hasSessions: ["morning","day","night"] },
  "mahadevi": { name: "Mahadevi", hasSessions: ["morning","day","night"] },
};
export function isMarket(key: string): key is MarketKey { return Object.keys(MARKETS).includes(key); }
export function isSession(key: string): key is SessionKey { return Object.keys(SESSIONS).includes(key); }
