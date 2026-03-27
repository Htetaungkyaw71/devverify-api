import type { ZodSchema } from "zod";
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export const validate =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: err.issues, // 👈 THIS IS THE KEY
        });
      }
    }
  };

export const validateParams =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.params);
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          message: "Invalid parameters",
          errors: err.issues, // 👈 THIS IS THE KEY
        });
      }
    }
  };
