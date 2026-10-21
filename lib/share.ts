// Share-message helpers (prd.md > Sharing). Pure, so they're unit-tested.

export function defaultMessage(task: string, link: string): string {
  return `Hi! I made you a simple step-by-step guide for "${task}". Just tap the link and follow along at your own pace. 💛 ${link}`;
}

/** The text that's sent: whatever is in the box, with the tour link added back on its own line if it was removed. */
export function messageWithLink(message: string, link: string): string {
  const text = message.trim();
  if (text.includes(link)) return text;
  return text ? `${text}\n${link}` : link;
}

export function whatsAppUrl(message: string, link: string): string {
  return `https://wa.me/?text=${encodeURIComponent(messageWithLink(message, link))}`;
}
