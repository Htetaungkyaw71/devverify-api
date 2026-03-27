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
import {
  protectedReadLimiter,
  submissionWriteLimiter,
} from "../middlewares/RateLimitMiddleware.js";

const submissionRouter = Router();

submissionRouter.post(
  "/",
  submissionWriteLimiter,
  protect,
  validate(submitCodeSchema),
  submitCode,
);

submissionRouter.get(
  "/position/:positionId",
  protectedReadLimiter,
  protect,
  validateParams(positionIdParamSchema),
  getPositionSubmissions,
);

export default submissionRouter;
