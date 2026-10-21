import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AiGuideSchema, type AiGuide } from "./schema";
import { checkGuide } from "./validate";
import { SYSTEM_PROMPT, buildUserContent, retryMessage } from "./prompt";

type BetaMessageParam = Anthropic.Beta.Messages.BetaMessageParam;

export type BuildResult =
  | { ok: true; guide: AiGuide; attempts: number }
  | { ok: false; error: "no_steps" | "ai_failed"; attempts: number };

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const MAX_ATTEMPTS = 2; // the first try plus one retry — never more

const client = new Anthropic();
// Flipped off for the rest of the process if the API rejects fallbacks with parse().
let useFallback = true;

export async function buildGuide(frames: string[], taskName: string): Promise<BuildResult> {
  const messages: BetaMessageParam[] = [{ role: "user", content: buildUserContent(frames, taskName) }];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let response;
    try {
      response = await callClaude(messages);
    } catch (err) {
      console.error("[build] Claude call failed", { attempt, error: describe(err) });
      return { ok: false, error: "ai_failed", attempts: attempt };
    }

    const log = {
      attempt,
      model: response.model,
      stop_reason: response.stop_reason,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    };

    if (response.stop_reason === "refusal") {
      console.warn("[build] refused", { ...log, stop_details: response.stop_details });
      return { ok: false, error: "ai_failed", attempts: attempt };
    }

    let problems: string[];
    const parsed = response.parsed_output;
    if (response.stop_reason === "max_tokens") {
      problems = ["Your answer was cut off. Return the complete guide."];
    } else if (!parsed) {
      problems = ["Your answer did not match the required JSON shape."];
    } else {
      const check = checkGuide(parsed, frames.length);
      console.info("[build] checked", { ...log, steps: parsed.steps.length, hard: check.hard, softFixes: check.softFixes });
      if (!check.hard.length) {
        return check.guide.steps.length
          ? { ok: true, guide: check.guide, attempts: attempt }
          : { ok: false, error: "no_steps", attempts: attempt };
      }
      problems = check.hard;
    }
    console.warn("[build] needs retry", { ...log, problems });

    // Append-only history: Claude's reply exactly as returned, then the problems.
    messages.push({ role: "assistant", content: response.content.map(stripParsed) });
    messages.push({ role: "user", content: retryMessage(problems) });
  }

  return { ok: false, error: "ai_failed", attempts: MAX_ATTEMPTS };
}

async function callClaude(messages: BetaMessageParam[]) {
  const params = {
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages,
    output_config: { effort: "medium" as const, format: betaZodOutputFormat(AiGuideSchema) },
  };
  if (useFallback) {
    try {
      return await client.beta.messages.parse({ ...params, betas: [FALLBACK_BETA], fallbacks: "default" });
    } catch (err) {
      if (err instanceof Anthropic.BadRequestError && /fallback/i.test(err.message)) {
        console.warn("[build] fallbacks rejected with parse(); continuing without them", describe(err));
        useFallback = false;
      } else {
        throw err;
      }
    }
  }
  return client.beta.messages.parse(params);
}

// The SDK adds parsed fields to text blocks; send back only what the API returned.
function stripParsed<T extends object>(block: T): T {
  if (!("parsed_output" in block)) return block;
  const rest: Partial<T & { parsed_output: unknown }> = { ...block };
  delete rest.parsed_output;
  return rest as T;
}

function describe(err: unknown) {
  if (err instanceof Anthropic.APIError) return { status: err.status, message: err.message };
  return { message: err instanceof Error ? err.message : String(err) };
}
