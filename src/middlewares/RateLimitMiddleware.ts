import { rateLimit } from "express-rate-limit";

export const apiGlobalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { message: "Too many API requests. Please try again later." },
});

export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  message: {
    message:
      "Too many auth requests. Please wait before making another request.",
  },
  skip: (req) => req.method === "GET",
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Please try again later." },
  skip: (req) => req.method === "GET",
});

export const sendOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many OTP requests. Please wait before requesting again.",
  },
  skip: (req) => req.method === "GET",
});

export const verifyOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { message: "Too many OTP verification attempts. Try again later." },
  skip: (req) => req.method === "GET",
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    message:
      "Too many password reset requests. Please wait before trying again.",
  },
  skip: (req) => req.method === "GET",
});

export const resetPasswordLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: {
    message: "Too many password reset attempts. Please try again later.",
  },
  skip: (req) => req.method === "GET",
});

export const publicReadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: { message: "Too many requests. Please try again later." },
  skip: (req) => req.method !== "GET",
});

export const protectedReadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests. Please try again later." },
  skip: (req) => req.method !== "GET",
});

export const protectedWriteLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 40,
  message: { message: "Too many requests. Please try again later." },
  skip: (req) => req.method === "GET",
});

export const submissionWriteLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 12,
  message: {
    message: "Too many submissions. Please wait before submitting again.",
  },
  skip: (req) => req.method === "GET",
});
