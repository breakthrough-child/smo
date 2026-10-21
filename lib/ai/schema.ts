import { z } from "zod";

// What Claude must return. Structured outputs guarantees this *shape*;
// lib/ai/validate.ts checks the *meaning* (see spec.md > AI step builder).
// Numeric ranges are deliberately not encoded here: they're checked in validate.ts.
export const TargetSchema = z.object({
  x: z.number().describe("Left edge of the tapped element, 0–1 of the frame width"),
  y: z.number().describe("Top edge, 0–1 of the frame height"),
  w: z.number().describe("Width, 0–1 of the frame width"),
  h: z.number().describe("Height, 0–1 of the frame height"),
});

export const AiStepSchema = z.object({
  frameIndex: z.number().int().describe("Index of the frame BEFORE the tap changes the screen"),
  instruction: z.string().describe("Under 12 words, plain words, never 'click'"),
  spokenInstruction: z.string().describe("The same step as one friendly spoken sentence"),
  target: TargetSchema,
  confidence: z.number().describe("0–1: how sure you are about this step and its target"),
});

export const AiGuideSchema = z.object({
  title: z.string().describe("Short, friendly title for the task"),
  steps: z.array(AiStepSchema),
  sensitiveWarning: z.boolean().describe("True if any frame shows passwords, PINs, balances or card numbers"),
});

export type Target = z.infer<typeof TargetSchema>;
export type AiStep = z.infer<typeof AiStepSchema>;
export type AiGuide = z.infer<typeof AiGuideSchema>;

// A reviewed step as stored in guides.steps (spec.md > Data Model).
export const StepSchema = z.object({
  id: z.string().uuid(),
  imagePath: z.string().min(1),
  instruction: z.string().trim().min(1).max(200),
  spokenInstruction: z.string().trim().max(400),
  target: z.object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().gt(0).max(1),
    h: z.number().gt(0).max(1),
  }),
  confidence: z.number().min(0).max(1),
});

export type Step = z.infer<typeof StepSchema>;

export const LOW_CONFIDENCE = 0.6;
