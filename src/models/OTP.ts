import mongoose, { Document, Schema } from "mongoose";

export interface IOTP extends Document {
  email: string;
  code: string;
  type: "verification" | "password-reset";
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

const OTPSchema = new Schema<IOTP>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    code: { type: String, required: true },
    type: {
      type: String,
      enum: ["verification", "password-reset"],
      required: true,
    },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0, max: 5 },
  },
  { timestamps: true },
);

OTPSchema.index({ email: 1, type: 1 });
OTPSchema.index({ email: 1, type: 1, createdAt: -1 });
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IOTP>("OTP", OTPSchema);
