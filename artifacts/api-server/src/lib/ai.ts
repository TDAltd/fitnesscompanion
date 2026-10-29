import OpenAI from "openai";

/**
 * Which AI service estimates meals. Set in cPanel → Setup Node.js App → Environment variables:
 *   Google Gemini: AI_PROVIDER=gemini, GEMINI_API_KEY=...   (has a free tier)
 *   OpenAI:        AI_PROVIDER=openai (or leave it out), OPENAI_API_KEY=...
 * AI_MODEL overrides the default model for either.
 */
export type AiSetup = {
  client: OpenAI;
  model: string;
  /** Tried in order when a model is busy or unavailable */
  models: string[];
  provider: "gemini" | "openai";
  jsonMode: boolean;
  apiKey: string;
  /** Room for the answer (Gemini's newer models also spend tokens thinking) */
  maxTokens: number;
};

/**
 * Gemini models in order of preference for meal estimates: fast first.
 * The newest "thinking" models are accurate but can take 20+ seconds, too slow for logging a meal.
 * Only models the key can actually use are tried (see availableGeminiModels).
 */
const GEMINI_PREFERRED = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
];

export function aiSetup(): AiSetup | null {
  const provider = (process.env.AI_PROVIDER ?? "").toLowerCase() === "gemini" || (!process.env.OPENAI_API_KEY && process.env.GEMINI_API_KEY) ? "gemini" : "openai";
  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.AI_API_KEY;
    if (!apiKey) return null;
    const model = process.env.AI_MODEL || GEMINI_PREFERRED[0];
    return {
      provider,
      apiKey,
      // Gemini's OpenAI-compatible endpoint: same request format, Google's models
      client: new OpenAI({ apiKey, baseURL: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/", timeout: 20_000, maxRetries: 0 }),
      model,
      models: [...new Set([model, ...GEMINI_PREFERRED])],
      jsonMode: false,
      maxTokens: 4000,
    };
  }
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  return { provider, apiKey, client: new OpenAI({ apiKey, timeout: 30_000, maxRetries: 0 }), model, models: [model], jsonMode: true, maxTokens: 700 };
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

/** A short, key-free description of an AI error, for messages the owner can act on. */
export function aiErrorDetail(err: unknown): string {
  // Walk the cause chain (SDK error → fetch error → network error) for codes like ENOTFOUND or ECONNRESET
  const parts: string[] = [];
  let e = err as { status?: number; code?: string; message?: string; cause?: unknown } | undefined;
  for (let depth = 0; e && depth < 4; depth++) {
    if (e.status) parts.push(`HTTP ${e.status}`);
    if (e.code) parts.push(e.code);
    if (e.message) parts.push(e.message);
    e = e.cause as typeof e;
  }
  return [...new Set(parts)]
    .join(" · ")
    .replace(/(sk-[\w-]{4})[\w-]+|(AIza[\w-]{4})[\w-]+/g, "$1$2…")
    .slice(0, 300);
}

const retryable = (err: unknown) => {
  const status = (err as { status?: number }).status;
  const name = (err as { constructor?: { name?: string } }).constructor?.name ?? "";
  return status === 503 || status === 429 || status === 404 || status === 500 || status === 502 || name.includes("Timeout");
};

// Which Gemini models this key can use, remembered for an hour
let available: { at: number; models: Set<string> } | null = null;
async function availableGeminiModels(apiKey: string): Promise<Set<string> | null> {
  if (available && Date.now() - available.at < 60 * 60 * 1000) return available.models;
  try {
    const l = await geminiModels(apiKey);
    if (l.status !== 200 || !l.models.length) return null;
    available = { at: Date.now(), models: new Set(l.models) };
    return available.models;
  } catch {
    return null; // can't list: just try the preferred order
  }
}

/**
 * Ask for a chat completion, moving on to the next model when one is busy or unavailable.
 * Stops after about 30 seconds in total. Returns the text and the model that answered.
 */
export async function completeWithFallback(
  ai: AiSetup,
  params: Omit<Parameters<OpenAI["chat"]["completions"]["create"]>[0], "model" | "stream">,
): Promise<{ text: string; model: string }> {
  const started = Date.now();
  let lastErr: unknown;
  let models = ai.models;
  if (ai.provider === "gemini" && !process.env.GEMINI_BASE_URL) {
    const have = await availableGeminiModels(ai.apiKey);
    if (have) {
      const usable = models.filter((m) => have.has(m));
      if (usable.length) models = usable;
    }
  }
  for (const model of models) {
    const left = 28_000 - (Date.now() - started);
    if (left < 4_000) break;
    try {
      const r = (await ai.client.chat.completions.create(
        { ...params, model, stream: false },
        { timeout: Math.min(12_000, left) },
      )) as OpenAI.Chat.Completions.ChatCompletion;
      const text = r.choices[0]?.message?.content ?? "";
      if (!text.trim()) throw Object.assign(new Error("The AI returned an empty answer"), { status: 503 });
      return { text, model };
    } catch (err) {
      lastErr = err;
      if (!retryable(err)) throw err;
    }
  }
  throw lastErr;
}

/** Gemini only: which models this key can use (also proves the key and the connection work). */
export async function geminiModels(apiKey: string): Promise<{ status: number; models: string[]; body: string }> {
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
    headers: { "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.text();
  let models: string[] = [];
  try {
    models = ((JSON.parse(body) as { models?: { name: string; supportedGenerationMethods?: string[] }[] }).models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""));
  } catch {
    /* not JSON */
  }
  return { status: res.status, models, body: body.slice(0, 200) };
}
