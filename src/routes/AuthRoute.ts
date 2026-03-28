import { Router } from "express";
import {
  getMe,
  login,
  sendRegisterOtp,
  register,
  forgotPassword,
  resetPassword,
} from "../controllers/AuthController.js";
import { protect } from "../middlewares/AuthMiddleware.js";
import { validate } from "../validations/validate.js";
import {
  loginSchema,
  sendRegisterOtpSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validations/AuthValidation.js";
import passport from "../config/passport.js";
import {
  authLimiter,
  loginLimiter,
  sendOtpLimiter,
  verifyOtpLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} from "../middlewares/RateLimitMiddleware.js";

const authrouter = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

authrouter.use(authLimiter);

authrouter.post(
  "/register/send-otp",
  sendOtpLimiter,
  validate(sendRegisterOtpSchema),
  sendRegisterOtp,
);
authrouter.post(
  "/register",
  verifyOtpLimiter,
  validate(registerSchema),
  register,
);
authrouter.post("/login", loginLimiter, validate(loginSchema), login);
authrouter.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  forgotPassword,
);
authrouter.post(
  "/reset-password",
  resetPasswordLimiter,
  validate(resetPasswordSchema),
  resetPassword,
);
authrouter.get("/me", protect, getMe);

authrouter.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["user:email"] }),
);

authrouter.get("/auth/github/callback", (req, res, next) => {
  passport.authenticate(
    "github",
    { session: false },
    (error: unknown, user: any) => {
      if (error) {
        const message =
          error instanceof Error
            ? error.message
            : "OAuth authentication failed";
        res.redirect(
          `${FRONTEND_URL}/oauth-error?message=${encodeURIComponent(message)}`,
        );
        return;
      }

      if (!user?.token) {
        res.redirect(
          `${FRONTEND_URL}/oauth-error?message=${encodeURIComponent("Missing OAuth token")}`,
        );
        return;
      }

      res.redirect(`${FRONTEND_URL}/oauth-success?token=${user.token}`);
    },
  )(req, res, next);
});

export default authrouter;
