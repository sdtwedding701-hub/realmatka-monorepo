import { createPost, options } from "./_stub.mjs";

export { options };
export const createOrder = createPost("payments/create-order");
export const webhook = createPost("payments/webhook");
