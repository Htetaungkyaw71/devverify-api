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

const authrouter = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

authrouter.post(
  "/register/send-otp",
  validate(sendRegisterOtpSchema),
  sendRegisterOtp,
);
authrouter.post("/register", validate(registerSchema), register);
authrouter.post("/login", validate(loginSchema), login);
authrouter.post(
  "/forgot-password",
  validate(forgotPasswordSchema),
  forgotPassword,
);
authrouter.post(
  "/reset-password",
  validate(resetPasswordSchema),
  resetPassword,
);
authrouter.get("/me", protect, getMe);

authrouter.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["user:email"] }),
);

authrouter.get(
  "/auth/github/callback",
  passport.authenticate("github", { session: false }),
  (req: any, res) => {
    res.redirect(`${FRONTEND_URL}/oauth-success?token=${req.user.token}`);
  },
);

export default authrouter;
