import mongoose, { Document, Schema } from "mongoose";

type SubmissionStatus = "pending" | "completed" | "failed";

export interface ISubmission extends Document {
  userId: mongoose.Types.ObjectId;
  positionId: mongoose.Types.ObjectId;
  challengeId: mongoose.Types.ObjectId;
  language: string;
  submittedCode: string;
  status: SubmissionStatus;
  aiModel?: string;
  marks?: number;
  scoreBreakdown?: {
    logic?: number | undefined;
    security?: number | undefined;
    readability?: number | undefined;
    performance?: number | undefined;
    cleanliness?: number | undefined;
  };
  report?: string;
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
  metadata?: {
    tokenUsage?: number | undefined;
    processingMs?: number | undefined;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    positionId: {
      type: Schema.Types.ObjectId,
      ref: "Position",
      required: true,
    },
    challengeId: {
      type: Schema.Types.ObjectId,
      ref: "Challenge",
      required: true,
    },
    language: { type: String, required: true, trim: true, lowercase: true },
    submittedCode: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    aiModel: { type: String },
    marks: { type: Number, min: 0, max: 100 },
    scoreBreakdown: {
      logic: { type: Number, min: 0, max: 100 },
      security: { type: Number, min: 0, max: 100 },
      readability: { type: Number, min: 0, max: 100 },
      performance: { type: Number, min: 0, max: 100 },
      cleanliness: { type: Number, min: 0, max: 100 },
    },
    report: { type: String },
    suggestions: [{ type: String }],
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    metadata: {
      tokenUsage: Number,
      processingMs: Number,
    },
  },
  { timestamps: true },
);

SubmissionSchema.index({ userId: 1, createdAt: -1 });
SubmissionSchema.index({ positionId: 1, challengeId: 1, userId: 1 });
SubmissionSchema.index({ positionId: 1, createdAt: -1 });

export default mongoose.model<ISubmission>("Submission", SubmissionSchema);
