import { Router } from "express";
import {
  createPosition,
  deleteMyPosition,
  getMyPositionById,
  getMyPositions,
  inviteToken,
  updateMyPosition,
} from "../controllers/PositionController.js";
import { protect } from "../middlewares/AuthMiddleware.js";
import { validate, validateParams } from "../validations/validate.js";
import {
  createPositionSchema,
  positionIdParamSchema,
  updatePositionSchema,
} from "../validations/PositionValidation.js";
import {
  protectedReadLimiter,
  protectedWriteLimiter,
  publicReadLimiter,
} from "../middlewares/RateLimitMiddleware.js";

const posRouter = Router();

posRouter.post(
  "/",
  protectedWriteLimiter,
  protect,
  validate(createPositionSchema),
  createPosition,
);
posRouter.get("/", protectedReadLimiter, protect, getMyPositions);
posRouter.get("/invite/:token", publicReadLimiter, inviteToken);

posRouter.get(
  "/:id",
  protectedReadLimiter,
  protect,
  validateParams(positionIdParamSchema),
  getMyPositionById,
);
posRouter.patch(
  "/:id",
  protectedWriteLimiter,
  protect,
  validateParams(positionIdParamSchema),
  validate(updatePositionSchema),
  updateMyPosition,
);
posRouter.delete(
  "/:id",
  protectedWriteLimiter,
  protect,
  validateParams(positionIdParamSchema),
  deleteMyPosition,
);

export default posRouter;
