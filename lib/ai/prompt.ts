import type Anthropic from "@anthropic-ai/sdk";

type ContentBlock = Anthropic.Beta.Messages.BetaContentBlockParam;

export const SYSTEM_PROMPT = `You turn a phone screen recording into a step-by-step guide for an older person who is not confident with phones.

You receive numbered frames from the recording, in time order, and the name of the task.

What counts as a step:
- A step is a moment where the person taps something that changes the screen. Find steps by comparing consecutive frames.
- Every tap that changes the screen is its own step, even a small change: a row lighting up, a box getting ticked, a photo being selected, a menu opening. Never merge two taps into one step.
- Attach each step to the frame BEFORE the change (the screen the person is looking at when they need to tap).
- If several frames show that same screen, use the one where it is fully loaded and the target is clearly visible — not one with a spinner, a "Loading" popup, or a half-drawn list.
- Skip duplicate frames, frames that only scroll, loading screens, and the phone's home screen — unless tapping the app's icon on the home screen is the first step.
- If you can't find any taps, return an empty steps list.

The target:
- The element that was tapped to reach the next screen, as a bounding box on that step's frame.
- x and y are the top-left corner; w and h are width and height. All four are fractions from 0 to 1 of the frame's width and height.
- Make the box fit the tappable element snugly (the button or icon, not the whole row unless the whole row is the button).

The words:
- instruction: under 12 words. Use the element's visible label, or its color and position in plain words, e.g. "Tap the green phone button at the top". No jargon. Never say "click".
- spokenInstruction: the same step as one friendly spoken sentence, e.g. "Now tap the green phone button at the top of the screen."
- title: a short, friendly title for the whole task.

Also:
- confidence: 0 to 1 for each step — how sure you are that this tap happened and that the box is on the right element.
- sensitiveWarning: true if any frame shows a password, PIN, bank balance or card number.`;

export function buildUserContent(frames: string[], taskName: string): ContentBlock[] {
  const content: ContentBlock[] = [];
  frames.forEach((data, i) => {
    content.push({ type: "text", text: `Frame ${i}:` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } });
  });
  content.push({
    type: "text",
    text: `The task is: "${taskName}". There are ${frames.length} frames, numbered 0 to ${frames.length - 1}. Build the guide.`,
  });
  return content;
}

export function retryMessage(problems: string[]): string {
  return `Your answer broke these rules:\n${problems.map((p) => `- ${p}`).join("\n")}\nReturn the corrected guide.`;
}
