import { nanoid } from "nanoid";
import type { Request, Response } from "express";
import Position from "../models/Position.js";
import { deleteCacheByPrefix, getOrSetCache } from "../config/redis.js";

type ChallengeInput = {
  id: string;
  timeLimit: number;
};

const mapChallenges = (challenges: ChallengeInput[]) =>
  challenges.map((challenge) => ({
    challengeId: challenge.id,
    timeLimit: challenge.timeLimit,
  }));

const MAX_POSITIONS_PER_RECRUITER = 20;
const POSITION_INVITE_CACHE_TTL = 60 * 10;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000/";

export const createPosition = async (req: Request, res: Response) => {
  try {
    const { title, challenges } = req.body as {
      title: string;
      challenges: ChallengeInput[];
    };

    if (!req.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const positionCount = await Position.countDocuments({
      recruiterId: req.userId,
    });

    if (positionCount >= MAX_POSITIONS_PER_RECRUITER) {
      res.status(400).json({
        message: `Maximum ${MAX_POSITIONS_PER_RECRUITER} positions allowed per recruiter`,
      });
      return;
    }

    const newPosition = await Position.create({
      title,
      recruiterId: req.userId,
      challenges: mapChallenges(challenges),
      inviteToken: nanoid(10),
    });

    await deleteCacheByPrefix("position:invite:");

    res.status(201).json({
      message: "Position created",
      position: newPosition,
      inviteLink: `${FRONTEND_URL}invite/${newPosition.inviteToken}`,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getMyPositions = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const positions = await Position.find({ recruiterId: req.userId })
      .populate("challenges.challengeId")
      .sort({ createdAt: -1 });

    res.status(200).json({ positions });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const getMyPositionById = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const position = await Position.findOne({
      _id: req.params.id,
      recruiterId: req.userId,
    }).populate("challenges.challengeId");

    if (!position) {
      res.status(404).json({ message: "Position not found" });
      return;
    }

    res.status(200).json({ position });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const updateMyPosition = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { title, challenges, isActive } = req.body as {
      title?: string;
      challenges?: ChallengeInput[];
      isActive?: boolean;
    };

    const updatePayload: Record<string, unknown> = {};
    if (title !== undefined) updatePayload.title = title;
    if (challenges !== undefined)
      updatePayload.challenges = mapChallenges(challenges);
    if (isActive !== undefined) updatePayload.isActive = isActive;

    const position = await Position.findOneAndUpdate(
      {
        _id: req.params.id,
        recruiterId: req.userId,
      },
      updatePayload,
      { new: true },
    ).populate("challenges.challengeId");

    if (!position) {
      res.status(404).json({ message: "Position not found" });
      return;
    }

    await deleteCacheByPrefix("position:invite:");

    res.status(200).json({ message: "Position updated", position });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const deleteMyPosition = async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const deleted = await Position.findOneAndDelete({
      _id: req.params.id,
      recruiterId: req.userId,
    });

    if (!deleted) {
      res.status(404).json({ message: "Position not found" });
      return;
    }

    await deleteCacheByPrefix("position:invite:");

    res.status(200).json({ message: "Position deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const inviteToken = async (req: Request, res: Response) => {
  try {
    const token = req.params.token;

    if (typeof token !== "string" || !token.trim()) {
      res.status(400).json({ message: "Invalid invite token." });
      return;
    }

    const position = await Position.findOne({
      inviteToken: token,
    })
      .populate("challenges.challengeId", "title difficulty description")
      .exec();

    if (!position || !position.isActive) {
      return res
        .status(404)
        .json({ message: "This assessment link is invalid or expired." });
    }
    res.status(200).json(position);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
