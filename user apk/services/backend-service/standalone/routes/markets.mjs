import { createGet, options } from "./_stub.mjs";

export { options };
export const list = createGet("markets/list");
export const detail = createGet("markets/detail");
export const chart = createGet("charts/detail");
