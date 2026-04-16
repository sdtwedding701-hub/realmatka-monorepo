import { createGet, createPost, options } from "./_stub.mjs";

export { options };
export const history = createGet("notifications/history");
export const registerDevice = createPost("notifications/devices/register");
