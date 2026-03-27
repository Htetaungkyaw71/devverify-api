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

const posRouter = Router();

posRouter.post("/", protect, validate(createPositionSchema), createPosition);
posRouter.get("/", protect, getMyPositions);
posRouter.get("/invite/:token", inviteToken);

posRouter.get(
  "/:id",
  protect,
  validateParams(positionIdParamSchema),
  getMyPositionById,
);
posRouter.patch(
  "/:id",
  protect,
  validateParams(positionIdParamSchema),
  validate(updatePositionSchema),
  updateMyPosition,
);
posRouter.delete(
  "/:id",
  protect,
  validateParams(positionIdParamSchema),
  deleteMyPosition,
);

export default posRouter;
