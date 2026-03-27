import type { Request, Response } from "express";
import Challenge from "../models/Challenge.js";
import mongoose from "mongoose";
import { getOrSetCache } from "../config/redis.js";

const CHALLENGE_LIST_CACHE_TTL = 60 * 10;
const CHALLENGE_DETAIL_CACHE_TTL = 60 * 30;

const asSingleString = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value.find((item) => typeof item === "string");
    return typeof first === "string" ? first : undefined;
  }
  return undefined;
};

const buildQueryCacheFragment = (query: Request["query"]): string => {
  const entries = Object.entries(query).sort(([a], [b]) => a.localeCompare(b));
  return entries
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}=${value.join(",")}`;
      }
      return `${key}=${value ?? ""}`;
    })
    .join("&");
};

export const getAllChallenges = async (req: Request, res: Response) => {
  try {
    // 1. Destructure query parameters with defaults
    const rawPage = Number.parseInt(asSingleString(req.query.page) || "1", 10);
    const rawLimit = Number.parseInt(
      asSingleString(req.query.limit) || "10",
      10,
    );
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit =
      Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 10;
    const difficulty = asSingleString(req.query.difficulty);
    const category = asSingleString(req.query.category);
    const tags = asSingleString(req.query.tags);
    const search = asSingleString(req.query.search);

    // 2. Build the Filter Object
    const query: any = { isPublic: true };

    if (difficulty) query.difficulty = difficulty;
    if (category) query.category = category;

    // Improved Tag Logic
    if (tags) {
      // If 'tags' is a string from a single click, split still works.
      // Example: "Array" -> ["Array"] | "Array,Math" -> ["Array", "Math"]
      const tagsArray = (tags as string).split(",");

      // Use $all if you want challenges that have ALL selected tags
      // Use $in if you want challenges that have AT LEAST ONE of the tags
      query.tags = { $in: tagsArray };
    }

    // Fuzzy search for title
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    // 3. Execute query with Pagination
    const skip = (page - 1) * limit;

    const queryKeyPart = buildQueryCacheFragment(req.query);
    const cacheKey = `challenges:list:${queryKeyPart}`;

    const payload = await getOrSetCache(
      cacheKey,
      CHALLENGE_LIST_CACHE_TTL,
      async () => {
        const challenges = await Challenge.find(query)
          .select("title slug difficulty category tags")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec();

        const total = await Challenge.countDocuments(query);

        return {
          success: true,
          count: challenges.length,
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          data: challenges,
        };
      },
    );

    res.status(200).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: message });
  }
};

export const getChallengeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Matches /api/challenges/:id

    // 1. Check if id is missing or not a string (Narrowing)
    if (!id || typeof id !== "string") {
      res
        .status(400)
        .json({ success: false, message: "Challenge ID is required" });
      return;
    }

    // 1. Validate if the ID is a proper MongoDB format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res
        .status(400)
        .json({ success: false, message: "Invalid Challenge ID format" });
      return;
    }

    const cacheKey = `challenge:detail:${id}`;
    const challenge = await getOrSetCache(
      cacheKey,
      CHALLENGE_DETAIL_CACHE_TTL,
      async () => Challenge.findById(id),
    );

    // 3. Handle "Not Found"
    if (!challenge) {
      res.status(404).json({ success: false, message: "Challenge not found" });
      return;
    }

    // 4. Success
    res.status(200).json({ success: true, data: challenge });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: message });
  }
};
