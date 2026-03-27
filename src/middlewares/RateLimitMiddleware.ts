import { rateLimit } from "express-rate-limit";

const defaultOptions = {
  standardHeaders: true,
  legacyHeaders: false,
} as const;

export const apiGlobalLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    message: "Too many API requests. Please try again later.",
  },
});

export const publicReadLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 1 * 60 * 1000,
  max: 120,
  message: {
    message: "Too many requests. Please slow down.",
  },
});

export const protectedReadLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 1 * 60 * 1000,
  max: 90,
  message: {
    message: "Too many requests. Please try again in a minute.",
  },
});

export const protectedWriteLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 1 * 60 * 1000,
  max: 40,
  message: {
    message: "Too many write requests. Please try again in a minute.",
  },
});

export const submissionWriteLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 1 * 60 * 1000,
  max: 12,
  message: {
    message: "Too many submission attempts. Please try again in a minute.",
  },
});

export const authLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    message: "Too many requests. Please try again later.",
  },
});

export const loginLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

export const sendOtpLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many OTP requests. Please try again in 10 minutes.",
  },
});

export const verifyOtpLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: {
    message: "Too many verification attempts. Please try again in 10 minutes.",
  },
});

export const forgotPasswordLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many reset requests. Please try again in 10 minutes.",
  },
});

export const resetPasswordLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    message: "Too many reset attempts. Please try again in 10 minutes.",
  },
});
