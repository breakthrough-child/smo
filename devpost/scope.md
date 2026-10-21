---
doc: scope
status: approved
---

# Show Me Once

Show a phone task once on video, and AI turns it into an onboarding-style tour your parents can follow alone, on any app.

## The Unique Kernel
The helper shows the task **once**, and the parent gets a tour built from **real screenshots of the real app**. Each screenshot has a spotlight on exactly what to tap, and the instruction is read aloud. It isn't generic help or a how-to article. It's *their* screens, the way the helper actually did it, and it works for any app because it only needs a recording.

## Who It's For
- **Helper (primary user):** an adult child who keeps getting called to explain the same phone task, like joining the family WhatsApp video call or sending a photo to a group. Today they explain it over the phone, which frustrates both people.
- **Learner:** a parent or grandparent who isn't confident with phones. They need big text, one step at a time, a clear "tap here", and spoken instructions. Apps never onboard older users.

## The Core Loop
1. The helper records the task with the phone's built-in screen recorder (3–90 s). They upload it and type the task name. If the video won't work, they upload 2–15 screenshots instead.
2. AI picks out the real steps, finds what was tapped, and writes plain instructions.
3. The helper reviews the steps: moves a circle if it's off, edits the text, deletes a step. Then they publish.
4. The helper sends the link on WhatsApp.
5. The parent opens it and follows the tour alone. One screenshot at a time, with a spotlight on the target, large text, the instruction read aloud, "Got it, next", and finally "You did it!"

The helper comes back each time a new "how do I…?" call happens. The parent comes back to the same link whenever they forget.

## Inspiration & Identity
Warm, calm and reassuring, never techy: soft colors, rounded shapes, a friendly display font. The tour should feel like "a patient person sitting next to you." The tour is large and accessible: big text, big buttons, high contrast, light and dark mode, and it respects reduced motion. The landing page tagline is **"Show it once. They've got it forever."**

## Why This Matters to the Learner
It comes from their own family: being the person who gets called to explain the same phone task again and again. The learning goal is to get reliable structured output from a vision model, meaning the prompt, zod validation and a retry loop. Claude's vision API and client-side video frame extraction are both new to them.

## What "Working" Looks Like
- A real WhatsApp task recording goes from upload to a published tour with correct steps. Only minor circle moves are needed.
- Both phones, both tested for real: a WhatsApp recording made with the **iPhone's** built-in screen recorder and one made with the **Android phone's** built-in recorder each produce a correct published tour. If either video can't be decoded in the browser, the friendly message appears and the **screenshot fallback** works with that phone's screenshots.
- The tour works end to end in a phone browser, with audio.
- It's deployed on Vercel at a real public URL.
- Every failure shows a friendly message: an undecodable video, an AI failure, no steps found, and a missing guide.
- **The "oh, that's cool" moment:** their parent opens the WhatsApp link on her own phone and follows the tour, spotlight and voice included, without help.

## The POC Boundary
- Create: video upload with client-side frame extraction, or 2–15 screenshots as the fallback, plus a task name.
- AI step building: a server-side Claude vision call that returns strict JSON. The JSON is checked with zod and retried once if invalid. Steps with low confidence are flagged.
- Review: drag the circle to move it, edit the text, delete a step, publish. A sensitive-content banner appears when the AI flags something, and a "don't record passwords" notice appears before upload.
- Share page: link, "Send on WhatsApp", copy link.
- Public tour: spotlight, pulsing ring, large tooltip, speech with "Hear again", Back/Next, progress, a completion screen.
- Unguessable guide links. The edit token is held by the creator's browser.
- "Delete this guide" on review: checks the edit token, then removes the row and its frames.
- Deployed on Vercel. The README covers setup and env vars. scope.md, prd.md and spec.md are committed.

## Later
- **Resizing the circle** (drag-to-move only for now).

## Explicitly Cut
- **Accounts/login:** the edit token in the browser and the URL is enough for a single helper.
- **Payments, analytics:** they don't help prove the kernel.
- **Live overlay on other apps, native apps:** the web tour over real screenshots *is* the idea, and native apps are far beyond the time budget.
- **Multiple languages:** one language proves the loop.
- **Editing beyond move, text and delete:** the AI does the heavy lifting, and review only fixes small misses.
- **Guide lists or dashboards:** one guide per link is the whole flow.

## Build revisions

The kernel, core loop and boundary held. Changes during the build (see `prd.md > Build revisions` and `spec.md > Build revisions`):

- The Android checkpoint found guides with too few steps; the cause was frame dedupe dropping small changes (a ticked photo, a highlighted row), not the AI — fixed by a finer comparison.
- Voice on Android Chrome needed workarounds for its speech quirks; the iPhone is tested in the final phone round.
- Everything in **The POC Boundary** was built, including "Delete this guide"; circle resize stays in **Later**.
