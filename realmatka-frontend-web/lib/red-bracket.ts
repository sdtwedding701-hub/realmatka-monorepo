const RED_BRACKET_JODI = new Set([
  "00",
  "05",
  "11",
  "16",
  "22",
  "27",
  "33",
  "38",
  "44",
  "49",
  "50",
  "55",
  "61",
  "66",
  "72",
  "77",
  "83",
  "88",
  "94",
  "99"
]);

export function isRedBracketJodi(value: string) {
  return RED_BRACKET_JODI.has(String(value ?? "").trim());
}
