import { createPost, options } from "./_stub.mjs";

export { options };
export const logout = createPost("auth/logout");
export const updatePassword = createPost("auth/update-password");
export const updateMpin = createPost("auth/update-mpin");
