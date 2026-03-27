import { default as OpenAI } from "openai";

export interface CodeReviewInput {
  challengeTitle: string;
  challengeDescription: string;
  language: string;
  submittedCode: string;
}

export interface CodeReviewResult {
  marks: number;
  scores: {
    logic: number;
    security: number;
    readability: number;
    performance: number;
    cleanliness: number;
  };
  report: string;
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
  model: string;
  tokenUsage?: number | undefined;
}

const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL || "openai/gpt-oss-120b:free";
const DEFAULT_GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const stripMarkdownFence = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
    return trimmed
      .replace(/^```[a-zA-Z]*\n?/, "")
      .replace(/```$/, "")
      .trim();
  }
  return trimmed;
};

const safeArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
};

const clampScore = (value: unknown): number => {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
};

const pickScore = (root: Record<string, unknown>, keys: string[]): number => {
  for (const key of keys) {
    if (key in root) {
      return clampScore(root[key]);
    }
  }
  return 0;
};

const parseReview = (rawText: string): Omit<CodeReviewResult, "model"> => {
  const parsed = JSON.parse(stripMarkdownFence(rawText)) as Record<
    string,
    unknown
  >;

  const rawMarks = typeof parsed.marks === "number" ? parsed.marks : 0;
  const marks = Math.max(0, Math.min(100, Math.round(rawMarks)));
  const scoreRoot =
    parsed.scores && typeof parsed.scores === "object"
      ? (parsed.scores as Record<string, unknown>)
      : parsed;

  const scores = {
    logic: pickScore(scoreRoot, ["logic", "Logic"]),
    security: pickScore(scoreRoot, ["security", "Security"]),
    readability: pickScore(scoreRoot, ["readability", "Readability"]),
    performance: pickScore(scoreRoot, ["performance", "Performance"]),
    cleanliness: pickScore(scoreRoot, ["cleanliness", "Cleanliness"]),
  };

  return {
    marks,
    scores,
    report: typeof parsed.report === "string" ? parsed.report : "No report",
    suggestions: safeArray(parsed.suggestions),
    strengths: safeArray(parsed.strengths),
    weaknesses: safeArray(parsed.weaknesses),
  };
};

const buildPrompt = (input: CodeReviewInput): string => `
You are a senior coding interviewer.
Evaluate the candidate submission for the challenge and return ONLY valid JSON.

Return this exact JSON shape:
{
  "marks": number, // 0 to 100
  "scores": {
    "Logic": number, // 0 to 100
    "Security": number, // 0 to 100
    "Readability": number, // 0 to 100
    "Performance": number, // 0 to 100
    "Cleanliness": number // 0 to 100
  },
  "report": string, // concise overall review
  "strengths": string[], // 1-5 items
  "weaknesses": string[], // 1-5 items
  "suggestions": string[] // practical improvements, 1-8 items
}

Scoring criteria:
- Correctness and logic
- Readability and structure
- Edge case handling
- Time and space complexity awareness

Challenge Title: ${input.challengeTitle}
Challenge Description: ${input.challengeDescription}
Programming Language: ${input.language}

Candidate Code:
${input.submittedCode}
`;

const isOpenRouterPolicyError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("404") &&
    (message.includes("guardrail") ||
      message.includes("privacy") ||
      message.includes("data policy") ||
      message.includes("no endpoints available"))
  );
};

export const reviewCodeWithAI = async (
  input: CodeReviewInput,
): Promise<CodeReviewResult> => {
  const openRouterKey =
    process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY_FREE;
  const groqKey = process.env.GROQ_API_KEY;
  const prompt = buildPrompt(input);

  if (!openRouterKey && !groqKey) {
    throw new Error(
      "Missing AI key. Add OPENROUTER_API_KEY (or OPENAI_API_KEY_FREE) or GROQ_API_KEY in .env.",
    );
  }

  if (openRouterKey) {
    try {
      const client = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openRouterKey,
      });

      const response = await client.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const text = response.choices[0]?.message.content || "";
      if (!text) {
        throw new Error("Empty response from OpenRouter");
      }

      const parsed = parseReview(text);
      return {
        ...parsed,
        model: DEFAULT_MODEL,
        tokenUsage: response.usage?.total_tokens,
      };
    } catch (error) {
      if (!groqKey || !isOpenRouterPolicyError(error)) {
        throw error;
      }
    }
  }

  if (!groqKey) {
    throw new Error(
      "OpenRouter request failed due to privacy/data-policy restrictions. Add GROQ_API_KEY for automatic fallback, or relax OpenRouter privacy settings.",
    );
  }

  const groq = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: groqKey,
  });

  const response = await groq.chat.completions.create({
    model: DEFAULT_GROQ_MODEL,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const text = response.choices[0]?.message.content || "";

  if (!text) {
    throw new Error("Empty response from Groq");
  }

  const parsed = parseReview(text);
  return {
    ...parsed,
    model: DEFAULT_GROQ_MODEL,
    tokenUsage: response.usage?.total_tokens,
  };
};
