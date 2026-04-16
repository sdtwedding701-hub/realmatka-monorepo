import { createGet, createPost, options } from "./_stub.mjs";

export { options };
export const boardHelper = createGet("bids/board-helper");
export const place = createPost("bids/place");
