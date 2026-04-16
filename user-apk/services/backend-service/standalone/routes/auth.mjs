import { createGet, createPost, options } from "./_stub.mjs";

export { options };
export const me = createGet("auth/me");
export const login = createPost("auth/login");
