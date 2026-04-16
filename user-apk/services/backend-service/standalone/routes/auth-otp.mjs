import { createPost, options } from "./_stub.mjs";

export { options };
export const requestOtp = createPost("auth/request-otp");
export const otpLogin = createPost("auth/otp-login");
export const forgotPassword = createPost("auth/forgot-password");
