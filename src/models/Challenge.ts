import mongoose, { Document, Schema } from "mongoose";

export interface IChallenge extends Document {
  title: string;
  slug: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string; // e.g., "Algorithms", "Database"
  tags: string[];
  hints: string[]; // Array of strings for step-by-step help
  boilerplateCode: {
    javascript?: string;
    typescript?: string;
    python?: string;
    java?: string;
    cpp?: string;
    ruby?: string;
    go?: string;
    rust?: string;
    php?: string;
  };
  testcaseCode?: {
    javascript?: string;
    typescript?: string;
    python?: string;
    java?: string;
    cpp?: string;
    ruby?: string;
    go?: string;
    rust?: string;
    php?: string;
  };
  createdBy: mongoose.Types.ObjectId;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChallengeSchema = new Schema<IChallenge>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, required: true, lowercase: true },
    description: { type: String, required: false },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      default: "Easy",
    },
    category: { type: String, default: "General" },
    tags: [{ type: String, trim: true }],
    hints: [{ type: String }],
    boilerplateCode: {
      javascript: String,
      typescript: String,
      python: String,
      java: String,
      cpp: String,
      ruby: String,
      go: String,
      rust: String,
      php: String,
    },
    testcaseCode: {
      javascript: String,
      typescript: String,
      python: String,
      java: String,
      cpp: String,
      ruby: String,
      go: String,
      rust: String,
      php: String,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ChallengeSchema.index({ title: "text", tags: "text", category: "text" });
// Add this to your Challenge Schema file
ChallengeSchema.index({ difficulty: 1, category: 1 });
ChallengeSchema.index({ tags: 1 });
ChallengeSchema.index({ isPublic: 1, createdAt: -1 });

export default mongoose.model<IChallenge>("Challenge", ChallengeSchema);
