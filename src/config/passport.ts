import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const JWT_SECRET = "devVerify--Secret";

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: "/api/auth/github/callback",
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
