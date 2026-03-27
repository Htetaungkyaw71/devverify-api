import "dotenv/config";
import express, { json, urlencoded } from "express";
import mongoose from "mongoose";
import authRouter from "./routes/AuthRoute.js";
import passport from "./config/passport.js";
import cors from "cors";
import challengeRouter from "./routes/ChallengeRoute.js";
import tagRouter from "./routes/TagRoute.js";
import posRouter from "./routes/PositionRoute.js";
import submissionRouter from "./routes/SubmissionRoute.js";
import { initializeRedis } from "./config/redis.js";
import { apiGlobalLimiter } from "./middlewares/RateLimitMiddleware.js";

let app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/devVerify";

app.set("trust proxy", 1);

app.use(json());
app.use(urlencoded({ extended: true }));

app.use(passport.initialize());

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(
  cors({
    origin: [FRONTEND_URL],
  }),
);

app.get("/", (req, res) => {
  res.json({
    mesage: "Hello world",
  });
});

app.use("/api", apiGlobalLimiter);
app.use("/api", authRouter);
app.use("/api/challenges", challengeRouter);
app.use("/api/tags", tagRouter);
app.use("/api/positions", posRouter);
app.use("/api/submissions", submissionRouter);

const connectDb = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");
};

initializeRedis().catch(() => undefined);

connectDb()
  .then((connection) => {
    app.listen(PORT, () => {
      console.log(`server is runnung at ${PORT}`);
    });
  })
  .catch((e) => console.error(e));
