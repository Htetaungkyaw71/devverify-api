import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");

const challengeSchema = z.object({
  id: objectIdSchema,
  timeLimit: z.number().int().positive("timeLimit must be greater than 0"),
});

export const createPositionSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(120, "Title is too long")
    .trim(),
  challenges: z
    .array(challengeSchema)
    .min(1, "At least one challenge is required")
    .max(50, "Too many challenges"),
});

export const updatePositionSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(120, "Title is too long")
      .trim()
      .optional(),
    challenges: z.array(challengeSchema).min(1).max(50).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required for update",
  });

export const positionIdParamSchema = z.object({
  id: objectIdSchema,
});
