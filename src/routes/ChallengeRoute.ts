import { Router } from "express";
// import { protect } from "../middlewares/AuthMiddleware.js";
import {
  getAllChallenges,
  getChallengeById,
} from "../controllers/ChallengeController.js";
import { publicReadLimiter } from "../middlewares/RateLimitMiddleware.js";

const challengeRouter = Router();

challengeRouter.use(publicReadLimiter);

challengeRouter.get("/", getAllChallenges);
challengeRouter.get("/:id", getChallengeById);

export default challengeRouter;
