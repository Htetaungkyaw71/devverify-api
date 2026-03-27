import { Router } from "express";
// import { protect } from "../middlewares/AuthMiddleware.js";

import { getAllTags } from "../controllers/TagController.js";
import { publicReadLimiter } from "../middlewares/RateLimitMiddleware.js";

const tagRouter = Router();

tagRouter.use(publicReadLimiter);

tagRouter.get("/", getAllTags);

export default tagRouter;
