import { Router } from "express";
// import { protect } from "../middlewares/AuthMiddleware.js";
import {
  getAllChallenges,
  getChallengeById,
} from "../controllers/ChallengeController.js";

const challengeRouter = Router();

challengeRouter.get("/", getAllChallenges);
challengeRouter.get("/:id", getChallengeById);

export default challengeRouter;
