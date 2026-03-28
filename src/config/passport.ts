import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = "devVerify--Secret";
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
        let user = await User.findOne({ githubId: profile.id });

        if (!user) {
          user = await User.create({
            username: profile.username,
            email: profile.emails?.[0]?.value,
            githubId: profile.id,
            avatar: profile.photos?.[0]?.value,
            provider: "github",
          });
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
