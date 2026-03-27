import mongoose from "mongoose";
import Submission from "./Submission.js";

const positionSchema = new mongoose.Schema({
  title: { type: String, required: true }, // e.g., "Full-stack Developer"
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  challenges: [
    {
      challengeId: { type: mongoose.Schema.Types.ObjectId, ref: "Challenge" },
      timeLimit: { type: Number, required: true }, // In minutes (15, 30, 60)
    },
  ],
  inviteToken: { type: String, unique: true }, // The unique part of the URL
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

positionSchema.index({ recruiterId: 1, createdAt: -1 });

positionSchema.pre("findOneAndDelete", async function () {
  const filter = this.getFilter() as { _id?: mongoose.Types.ObjectId | string };

  if (filter?._id) {
    await Submission.deleteMany({ positionId: filter._id });
  }
});

export default mongoose.model("Position", positionSchema);
