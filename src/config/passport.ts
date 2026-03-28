import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "devVerify--Secret";
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:5001";
const GITHUB_CALLBACK_URL =
  process.env.GITHUB_CALLBACK_URL || `${API_BASE_URL}/api/auth/github/callback`;

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: GITHUB_CALLBACK_URL,
    },
    async (_accessToken: any, _refreshToken: any, profile: any, done: any) => {
      try {
        const githubId = String(profile.id || "");
        const profileEmail =
          typeof profile.emails?.[0]?.value === "string"
            ? profile.emails[0].value.toLowerCase().trim()
            : null;
        const profileUsername =
          (typeof profile.username === "string" && profile.username.trim()) ||
          (typeof profile.displayName === "string" &&
            profile.displayName.trim()) ||
          `github_${githubId}`;
        const avatar =
          typeof profile.photos?.[0]?.value === "string"
            ? profile.photos[0].value
            : undefined;

        let user = await User.findOne({ githubId });

        if (!user && profileEmail) {
          user = await User.findOne({ email: profileEmail });
        }

        if (!user) {
          user = await User.create({
            username: profileUsername,
            email: profileEmail || `${githubId}@users.devverify.local`,
            githubId,
            avatar,
            provider: "github",
            isVerified: true,
          });
        } else {
          const updates: Record<string, unknown> = {
            githubId,
            provider: "github",
          };

          if (!user.username && profileUsername) {
            updates.username = profileUsername;
          }

          if (!user.email && profileEmail) {
            updates.email = profileEmail;
          }

          if (avatar) {
            updates.avatar = avatar;
          }

          await User.updateOne({ _id: user._id }, { $set: updates });
          user = await User.findById(user._id);
        }

        if (!user) {
          return done(new Error("Failed to resolve OAuth user"), null);
        }

        const token = jwt.sign({ id: user._id }, JWT_SECRET, {
          expiresIn: "7d",
        });

        return done(null, { user, token });
      } catch (error) {
        return done(error, null);
      }
    },
  ),
);

export default passport;
