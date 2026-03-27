import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");

export const submitCodeSchema = z.object({
  positionId: objectIdSchema,
  challengeId: objectIdSchema,
  language: z.string().min(1, "Language is required").max(50).trim(),
  submittedCode: z
    .string()
    .min(10, "submittedCode is too short")
    .max(100000, "submittedCode is too large"),
});

export const positionIdParamSchema = z.object({
  positionId: objectIdSchema,
});

export const submissionIdParamSchema = z.object({
  submissionId: objectIdSchema,
});
