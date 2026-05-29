export const cricketTeamFlagMap: Record<string, string> = {
  india: "🇮🇳",
  ind: "🇮🇳",
  bharat: "🇮🇳",
  australia: "🇦🇺",
  aus: "🇦🇺",
  england: "🏴",
  eng: "🏴",
  "new zealand": "🇳🇿",
  nz: "🇳🇿",
  pakistan: "🇵🇰",
  pak: "🇵🇰",
  "south africa": "🇿🇦",
  sa: "🇿🇦",
  sri_lanka: "🇱🇰",
  "sri lanka": "🇱🇰",
  sl: "🇱🇰",
  bangladesh: "🇧🇩",
  ban: "🇧🇩",
  bd: "🇧🇩",
  afghanistan: "🇦🇫",
  afg: "🇦🇫",
  west_indies: "🏝️",
  "west indies": "🏝️",
  wi: "🏝️",
  ireland: "🇮🇪",
  ire: "🇮🇪",
  scotland: "🏴",
  sco: "🏴",
  nepal: "🇳🇵",
  nep: "🇳🇵",
  uae: "🇦🇪",
  usa: "🇺🇸"
};

export function getCricketTeamFlag(name: string) {
  const normalized = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!normalized) return "";
  return cricketTeamFlagMap[normalized] || cricketTeamFlagMap[normalized.replace(/\s+/g, "_")] || "";
}
