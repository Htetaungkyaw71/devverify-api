import type { Request, Response } from "express";

const ONLINE_COMPILER_BASE_URL =
  process.env.ONLINECOMPILER_BASE_URL || "https://api.onlinecompiler.io";
const ONLINE_COMPILER_SYNC_PATH = "/api/run-code-sync/";

export const executeCode = async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.ONLINECOMPILER_API_KEY;

    if (!apiKey) {
      res.status(500).json({
        success: false,
        message: "ONLINECOMPILER_API_KEY is missing",
      });
      return;
    }

    if (!req.body || typeof req.body !== "object") {
      res.status(400).json({
        success: false,
        message: "Request body must be a JSON object",
      });
      return;
    }

    const response = await fetch(
      `${ONLINE_COMPILER_BASE_URL}${ONLINE_COMPILER_SYNC_PATH}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: apiKey,
        },
        body: JSON.stringify(req.body),
      },
    );

    const rawText = await response.text();
    let parsed: unknown = null;

    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = rawText;
    }

    if (!response.ok) {
      res.status(response.status).json({
        success: false,
        message: "OnlineCompiler request failed",
        error: parsed,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
