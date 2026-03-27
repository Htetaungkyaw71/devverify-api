import { Router } from "express";
// import { protect } from "../middlewares/AuthMiddleware.js";

import { getAllTags } from "../controllers/TagController.js";

const tagRouter = Router();

tagRouter.get("/", getAllTags);

export default tagRouter;
