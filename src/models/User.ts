import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  githubId: String;
  avatar: String;
  provider: String;
  isVerified: boolean;
  passwordResetToken: string | null;
  passwordResetTokenExpiry: Date | null;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function (this: IUser) {
        return this.provider === "local";
      },
      minlength: 6,
    },
    githubId: {
      type: String,
    },
    avatar: String,
    provider: {
      type: String,
      enum: ["local", "github"],
      default: "local",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetTokenExpiry: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model<IUser>("User", UserSchema);
