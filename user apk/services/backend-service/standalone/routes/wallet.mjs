import { createGet, createPost, options } from "./_stub.mjs";

export { options };
export const history = createGet("wallet/history");
export const deposit = createPost("wallet/deposit");
export const withdraw = createPost("wallet/withdraw");
