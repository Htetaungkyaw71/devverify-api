import type { Request, Response } from "express";
import Tag from "../models/Tag.js";
import { getOrSetCache, setCache } from "../config/redis.js";

const TAGS_CACHE_TTL = 60 * 60 * 6;

export const getAllTags = async (req: Request, res: Response) => {
  try {
    const payload = await getOrSetCache(
      "tags:all",
      TAGS_CACHE_TTL,
      async () => {
        const tags = await Tag.find().sort({ count: -1 }).exec();

        return {
          success: true,
          data: tags,
        };
      },
    );

    if (Array.isArray(payload.data) && payload.data.length === 0) {
      const tags = await Tag.find().sort({ count: -1 }).exec();

      if (tags.length > 0) {
        const refreshedPayload = {
          success: true,
          data: tags,
        };

        await setCache("tags:all", refreshedPayload, TAGS_CACHE_TTL);
        res.status(200).json(refreshedPayload);
        return;
      }
    }

    res.status(200).json(payload);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching tags", error });
  }
};
