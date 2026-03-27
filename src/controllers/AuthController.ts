import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import OTP from "../models/OTP.js";
import {
  sendVerificationOTP,
  sendPasswordResetOTP,
} from "../services/emailService.js";
import { generateOTP, getOTPExpiry } from "../utils/otpUtils.js";
import {
  sendRegisterOtpSchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validations/AuthValidation.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_PER_HOUR = 5;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required");
}

const checkOtpThrottle = async (
  email: string,
  type: "verification" | "password-reset",
): Promise<{
  allowed: boolean;
  message?: string;
  retryAfterSeconds?: number;
}> => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [latestOtp, hourlyCount] = await Promise.all([
    OTP.findOne({ email, type }).sort({ createdAt: -1 }),
    OTP.countDocuments({ email, type, createdAt: { $gte: oneHourAgo } }),
  ]);

  if (hourlyCount >= OTP_MAX_PER_HOUR) {
    return {
      allowed: false,
      message: "Too many OTP requests for this email. Try again later.",
    };
  }

  if (latestOtp) {
    const elapsed = now.getTime() - latestOtp.createdAt.getTime();
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS - elapsed) / 1000,
      );
      return {
        allowed: false,
        message: `Please wait ${retryAfterSeconds}s before requesting a new OTP.`,
        retryAfterSeconds,
      };
    }
  }

  return { allowed: true };
};

// Register - Step 1: Send OTP by email
export const sendRegisterOtp = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email } = sendRegisterOtpSchema.parse(req.body);

    // Check if user already verified
    const existingUser = await User.findOne({ email });
    if (existingUser?.isVerified) {
      res.status(200).json({
        message: "If the email is eligible, a verification code has been sent.",
      });
      return;
    }

    const throttle = await checkOtpThrottle(email, "verification");
    if (!throttle.allowed) {
      if (throttle.retryAfterSeconds) {
        res.setHeader("Retry-After", throttle.retryAfterSeconds.toString());
      }
      res.status(429).json({ message: throttle.message });
      return;
    }

    // Generate and send OTP
    const code = generateOTP();
    const expiresAt = getOTPExpiry();

    await OTP.create({
      email,
      code,
      type: "verification",
      expiresAt,
    });

    const emailResult = await sendVerificationOTP(email, code);
    if (!emailResult.success) {
      res.status(500).json({ message: "Failed to send verification email" });
      return;
    }

    res.status(200).json({
      message: "Verification code sent to email",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("zod")) {
      res.status(400).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: "Server error" });
  }
};

// Register - Step 2: Verify OTP and create account
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, code } = registerSchema.parse(req.body);

    const existingUser = await User.findOne({ email });
    if (existingUser?.isVerified) {
      res.status(409).json({ message: "Email already in use" });
      return;
    }

    // Find latest OTP for this email
    const otp = await OTP.findOne({
      email,
      type: "verification",
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otp) {
      res.status(400).json({ message: "OTP expired or not requested" });
      return;
    }

    // Check attempts
    if (otp.attempts >= 5) {
      res
        .status(429)
        .json({ message: "Too many failed attempts. Request new OTP." });
      return;
    }

    if (otp.code !== code) {
      otp.attempts += 1;
      await otp.save();
      res.status(400).json({ message: "Invalid OTP" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let user = existingUser;

    if (user) {
      user.username = username;
      user.password = hashedPassword;
      user.isVerified = true;
      await user.save();
    } else {
      user = await User.create({
        username,
        email,
        password: hashedPassword,
        isVerified: true,
      });
    }

    // Delete OTP after successful verification
    await OTP.deleteMany({ email, type: "verification" });

    // Generate token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.status(200).json({
      message: "Registration successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("zod")) {
      res.status(400).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // Check if email is verified
    if (!user.isVerified) {
      res.status(403).json({ message: "Please verify your email first" });
      return;
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // Generate token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("zod")) {
      res.status(400).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: "Server error" });
  }
};

// Forgot Password - Request OTP
export const forgotPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists for security
      res.status(200).json({
        message:
          "If an account exists with this email, a password reset OTP has been sent",
      });
      return;
    }

    const throttle = await checkOtpThrottle(email, "password-reset");
    if (!throttle.allowed) {
      if (throttle.retryAfterSeconds) {
        res.setHeader("Retry-After", throttle.retryAfterSeconds.toString());
      }
      res.status(429).json({ message: throttle.message });
      return;
    }

    // Generate and send OTP
    const code = generateOTP();
    const expiresAt = getOTPExpiry();

    await OTP.create({
      email,
      code,
      type: "password-reset",
      expiresAt,
    });

    const emailResult = await sendPasswordResetOTP(email, code);
    if (!emailResult.success) {
      res.status(500).json({ message: "Failed to send password reset email" });
      return;
    }

    res.status(200).json({
      message: "Password reset OTP has been sent to your email",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("zod")) {
      res.status(400).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: "Server error" });
  }
};

// Reset Password with OTP
export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email, code, newPassword } = resetPasswordSchema.parse(req.body);

    // Find latest valid OTP for this email
    const otp = await OTP.findOne({
      email,
      type: "password-reset",
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otp) {
      res.status(400).json({ message: "Invalid or expired OTP" });
      return;
    }

    // Check attempts
    if (otp.attempts >= 5) {
      res
        .status(429)
        .json({ message: "Too many failed attempts. Request new OTP." });
      return;
    }

    if (otp.code !== code) {
      otp.attempts += 1;
      await otp.save();
      res.status(400).json({ message: "Invalid or expired OTP" });
      return;
    }

    // Find user and update password
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetTokenExpiry = null;
    await user.save();

    // Delete OTP after successful reset
    await OTP.deleteOne({ _id: otp._id });

    res.status(200).json({
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("zod")) {
      res.status(400).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: "Server error" });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
