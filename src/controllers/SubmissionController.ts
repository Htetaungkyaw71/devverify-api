import type { Request, Response } from "express";
import mongoose from "mongoose";
import Challenge from "../models/Challenge.js";
import Position from "../models/Position.js";
import Submission from "../models/Submission.js";
import { reviewCodeWithAI } from "../services/aiReviewService.js";

const isChallengeInPosition = (
  positionChallenges: Array<{ challengeId?: mongoose.Types.ObjectId | null }>,
  challengeId: string,
): boolean =>
  positionChallenges.some(
    (entry) => entry.challengeId?.toString() === challengeId,
  );

export const submitCode = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { positionId, challengeId, language, submittedCode } = req.body as {
      positionId: string;
      challengeId: string;
      language: string;
      submittedCode: string;
    };

    if (
      !mongoose.Types.ObjectId.isValid(positionId) ||
      !mongoose.Types.ObjectId.isValid(challengeId)
    ) {
      res.status(400).json({ message: "Invalid positionId or challengeId" });
      return;
    }

    const [position, challenge] = await Promise.all([
      Position.findById(positionId).exec(),
      Challenge.findById(challengeId).exec(),
    ]);

    if (!position || !position.isActive) {
      res.status(404).json({ message: "Position not found or inactive" });
      return;
    }

    if (!challenge) {
      res.status(404).json({ message: "Challenge not found" });
      return;
    }

    if (!isChallengeInPosition(position.challenges ?? [], challengeId)) {
      res
        .status(400)
        .json({ message: "Challenge is not assigned to this position" });
      return;
    }

    const submission = await Submission.create({
      userId: req.userId,
      positionId,
      challengeId,
      language,
      submittedCode,
      status: "pending",
    });

    try {
      const start = Date.now();
      const review = await reviewCodeWithAI({
        challengeTitle: challenge.title,
        challengeDescription: challenge.description,
        language,
        submittedCode,
      });

      submission.status = "completed";
      submission.aiModel = review.model;
      submission.marks = review.marks;
      console.log(submission);
      submission.scoreBreakdown = {
        logic: review.scores.logic,
        security: review.scores.security,
        readability: review.scores.readability,
        performance: review.scores.performance,
        cleanliness: review.scores.cleanliness,
      };
      submission.report = review.report;
      submission.suggestions = review.suggestions;
      submission.strengths = review.strengths;
      submission.weaknesses = review.weaknesses;
      submission.metadata = {
        tokenUsage: review.tokenUsage ? review.tokenUsage : undefined,
        processingMs: Date.now() - start,
      };

      await submission.save();
    } catch (aiError) {
      submission.status = "failed";
      submission.report =
        aiError instanceof Error ? aiError.message : "AI review failed";
      await submission.save();
    }

    const hydrated = await Submission.findById(submission._id)
      .populate("challengeId", "title difficulty")
      .populate("positionId", "title")
      .populate("userId", "username email")
      .exec();

    res.status(201).json({
      message: "Code submitted successfully",
      submission: hydrated,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getPositionSubmissions = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const requestedLimit = Number(req.query.limit) || 20;
    const limit = Math.min(100, Math.max(1, requestedLimit));
    const skip = (page - 1) * limit;

    const { positionId } = req.params;

    if (
      !positionId ||
      typeof positionId !== "string" ||
      !mongoose.Types.ObjectId.isValid(positionId)
    ) {
      res.status(400).json({ message: "Invalid positionId" });
      return;
    }

    const position = await Position.findOne({
      _id: new mongoose.Types.ObjectId(positionId),
      recruiterId: req.userId,
    }).exec();

    if (!position) {
      res.status(404).json({ message: "Position not found" });
      return;
    }

    const baseQuery = {
      positionId: new mongoose.Types.ObjectId(positionId),
    };

    const [submissions, total] = await Promise.all([
      Submission.find(baseQuery)
        .populate("userId", "username email")
        .populate("challengeId", "title difficulty")
        .populate("positionId", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Submission.countDocuments(baseQuery),
    ]);

    res.status(200).json({
      submissions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// export const getMySubmissions = async (req: Request, res: Response) => {
//   try {
//     if (!req.userId) {
//       res.status(401).json({ message: "Unauthorized" });
//       return;
//     }

//     const query: Record<string, unknown> = { userId: req.userId };

//     if (typeof req.query.positionId === "string") {
//       query.positionId = req.query.positionId;
//     }

//     if (typeof req.query.challengeId === "string") {
//       query.challengeId = req.query.challengeId;
//     }

//     const submissions = await Submission.find(query)
//       .select(
//         "positionId challengeId language status aiModel marks report suggestions strengths weaknesses createdAt updatedAt metadata",
//       )
//       .populate("challengeId", "title difficulty")
//       .populate("positionId", "title")
//       .sort({ createdAt: -1 })
//       .exec();

//     res.status(200).json({ submissions });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error });
//   }
// };

// export const getMySubmissionById = async (req: Request, res: Response) => {
//   try {
//     if (!req.userId) {
//       res.status(401).json({ message: "Unauthorized" });
//       return;
//     }

//     const { submissionId } = req.params;

//     if (
//       !submissionId ||
//       typeof submissionId !== "string" ||
//       !mongoose.Types.ObjectId.isValid(submissionId)
//     ) {
//       res.status(400).json({ message: "Invalid submissionId" });
//       return;
//     }

//     const submission = await Submission.findOne({
//       _id: new mongoose.Types.ObjectId(submissionId),
//       userId: req.userId,
//     })
//       .populate("challengeId")
//       .populate("positionId", "title recruiterId")
//       .populate("userId", "username email")
//       .exec();

//     if (!submission) {
//       res.status(404).json({ message: "Submission not found" });
//       return;
//     }

//     res.status(200).json({ submission });
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error });
//   }
// };
