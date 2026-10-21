import { describe, expect, it } from "vitest";
import { defaultMessage, messageWithLink, whatsAppUrl } from "@/lib/share";

const link = "https://show-me-once.example/g/abc";

describe("share message", () => {
  it("prefills the PRD message with the task and link", () => {
    expect(defaultMessage("Join the family call", link)).toBe(
      `Hi! I made you a simple step-by-step guide for "Join the family call". Just tap the link and follow along at your own pace. 💛 ${link}`,
    );
  });

  it("sends exactly what's in the box when the link is still there", () => {
    expect(messageWithLink(`Mum, try this: ${link}`, link)).toBe(`Mum, try this: ${link}`);
  });

  it("adds the link back on its own last line if it was removed", () => {
    expect(messageWithLink("Mum, try this when you have a minute", link)).toBe(`Mum, try this when you have a minute\n${link}`);
  });

  it("sends just the link if the box is empty", () => {
    expect(messageWithLink("   ", link)).toBe(link);
  });

  it("builds a wa.me link that decodes back to the message", () => {
    const url = whatsAppUrl("Hi Dad 💛 & welcome", link);
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toBe(`Hi Dad 💛 & welcome\n${link}`);
  });
});
