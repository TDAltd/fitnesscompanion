import OpenAI from "openai";

/**
 * Which AI service estimates meals. Set in cPanel → Setup Node.js App → Environment variables:
 *   Google Gemini: AI_PROVIDER=gemini, GEMINI_API_KEY=...   (has a free tier)
 *   OpenAI:        AI_PROVIDER=openai (or leave it out), OPENAI_API_KEY=...
 * AI_MODEL overrides the default model for either.
 */
export type AiSetup = { client: OpenAI; model: string; provider: "gemini" | "openai"; jsonMode: boolean };

export function aiSetup(): AiSetup | null {
  const provider = (process.env.AI_PROVIDER ?? "").toLowerCase() === "gemini" || (!process.env.OPENAI_API_KEY && process.env.GEMINI_API_KEY) ? "gemini" : "openai";
  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.AI_API_KEY;
    if (!apiKey) return null;
    return {
      provider,
      // Gemini's OpenAI-compatible endpoint: same request format, Google's models
      client: new OpenAI({ apiKey, baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/" }),
      model: process.env.AI_MODEL || "gemini-3.8-flash",
      jsonMode: false,
    };
  }
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY;
  if (!apiKey) return null;
  return { provider, client: new OpenAI({ apiKey }), model: process.env.AI_MODEL || "gpt-4o-mini", jsonMode: true };
}

/** Pull the JSON object out of a reply, even if it's wrapped in ```json fences or a sentence. */
export function parseJsonReply(text: string): Record<string, unknown> {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    throw new SyntaxError("No JSON in AI reply");
  }
}
