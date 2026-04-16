import { createGet, createPost, options } from "./_stub.mjs";

export { options };
export const list = createGet("bank/list");
export const add = createPost("bank/add");
