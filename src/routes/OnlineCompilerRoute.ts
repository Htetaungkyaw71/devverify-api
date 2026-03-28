import { Router } from "express";
import { executeCode } from "../controllers/OnlineCompilerController.js";

const onlineCompilerRouter = Router();

onlineCompilerRouter.post("/execute", executeCode);

export default onlineCompilerRouter;
