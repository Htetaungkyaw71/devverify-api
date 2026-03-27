import { Router } from "express";
import {
  getPositionSubmissions,
  submitCode,
} from "../controllers/SubmissionController.js";
import { protect } from "../middlewares/AuthMiddleware.js";
import { validate, validateParams } from "../validations/validate.js";
import {
  positionIdParamSchema,
  submissionIdParamSchema,
  submitCodeSchema,
} from "../validations/SubmissionValidation.js";

const submissionRouter = Router();

submissionRouter.post("/", protect, validate(submitCodeSchema), submitCode);

submissionRouter.get(
  "/position/:positionId",
  protect,
  validateParams(positionIdParamSchema),
  getPositionSubmissions,
);

export default submissionRouter;
