---
doc: prd
status: approved
---

# Show Me Once — Product Requirements

A web app where a **helper** shows a phone task once (a screen recording or screenshots), AI turns it into a step-by-step spotlight tour, and their **parent** follows it alone on their own phone, with each step read aloud.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
Source: `scope.md > The Core Loop`.

1. **Landing.** The helper opens the site and sees the tagline "Show it once. They've got it forever.", a 3-step explainer, and one big **Make a guide** button.
2. **Create.** The helper types the task name (e.g. "Join the family video call on WhatsApp") and picks a screen recording (3–90 s). They can upload 2–15 screenshots in order instead. A notice before upload says not to record passwords, PINs or balances.
3. **Building.** A progress screen shows friendly stages that change as it works: "Reading your video…", "Finding the taps…", "Writing the steps…". Under them: "Please keep this page open."
4. **Review.** The helper sees every step as a screenshot with a circle on the target and an instruction underneath. They can drag the circle, edit the text, and delete a step. Low-confidence steps are highlighted to check, and a sensitive-content banner appears when the AI flags something. They tap **Publish**.
5. **Share.** The share page shows the link, an editable WhatsApp message, a big **Send on WhatsApp** button and a **Copy link** button.
6. **Learn.** The parent opens the link and sees the task title and a huge **Start** button. They go through the steps (real screenshot, spotlight, large instruction read aloud), moving forward with **Got it, next** or by tapping the glowing circle.
7. **Success.** "You did it!" with **Start again**. The parent can reopen the same link any time they forget.

## Screens and Layout
Five surfaces, all mobile-first and usable at 360 px wide.

| Screen | Address | Who | Contents |
|---|---|---|---|
| Landing + Create | `/` | Helper | Tagline, 3-step explainer, **Make a guide**, which reveals the create form (task name, video picker, "use screenshots instead" switch, privacy notice) and then the building progress |
| Review | `/g/[id]/review` | Helper (needs edit token) | Sensitive banner (if flagged), list of step cards, **Publish**, **Delete this guide** |
| Share | `/g/[id]/share` | Helper | Link, editable message box, **Send on WhatsApp**, **Copy link**, link back to review |
| Tour | `/g/[id]` | Parent (public) | Start screen → step screens → "You did it!" screen |
| Not found | any bad / draft / deleted guide link | Anyone | Friendly "missing guide" message |

## Look and Feel
Source: `scope.md > Inspiration & Identity`.
- **Feel:** warm, calm, reassuring, never techy. "A patient person sitting next to you." Reference: **Headspace** (calm, warm, rounded).
- **Colors:**
  - Warm cream background.
  - **Coral** for main actions. Use a **deeper coral** wherever white text sits on coral, so it passes contrast.
  - **Soft sage for success states only.**
  - Warm charcoal background in dark mode.
- **Spotlight ring:** bright coral with a **white outer outline**, so it stands out on any screenshot.
- **Type:** **Fredoka** for headings, **Nunito** for body text.
- **Shapes:** rounded corners, soft shadows, generous spacing.
- **Tour accessibility:** body text ≥ 22 px, tap targets ≥ 56 px, high contrast, light and dark mode, motion (pulsing, transitions) switched off when the phone asks for reduced motion.

## Features and Behavior

### Creating a guide
Source: `scope.md > The POC Boundary` (Create).
- The task name is required. The helper picks one video **or** 2–15 screenshots (in the order selected, with a visible preview of that order).
- Before upload: "Please don't record passwords, PINs or bank balances."
- **Make my guide** stays disabled until there is a task name and valid input.
- Video path: the app pulls still frames from the video on the helper's device, then sends them for AI analysis. Screenshot path: the screenshots are sent the same way.
- While building, the progress stages change in order and "Please keep this page open." is shown. On success the helper lands on Review automatically.
  - [ ] An iPhone screen recording of a WhatsApp task produces a guide and opens Review.
  - [ ] An Android screen recording of a WhatsApp task produces a guide and opens Review.
  - [ ] 2–15 screenshots produce a guide and open Review.
  - [ ] Progress stages visibly change while waiting.

### AI step building
Source: `scope.md > The POC Boundary` (AI step building). This is where the learning goal lives.
- A step is a moment where the user taps something that changes the screen. It is shown on the screenshot **before** the change, with the tapped element circled.
- Duplicates, scrolling-only moments, loading screens and the home screen are skipped (unless tapping the app icon is the first step).
- Each instruction is under 12 words, uses the button's visible label or its color and position in plain words, has no jargon, and never says "click". Each step also has a friendly spoken version as one sentence.
- The AI suggests the guide title, rates its confidence for each step, and flags sensitive content (passwords, balances, card numbers).
- If the AI's answer comes back malformed, it is retried once automatically before showing an error.
  - [ ] For the real WhatsApp recordings, the steps match what was actually tapped, in order, and at most minor circle moves are needed.
  - [ ] No instruction contains "click", and none is longer than 12 words.

### Reviewing and publishing
Source: `scope.md > The POC Boundary` (Review).
- Each step card shows the step number, the screenshot with the circle, and the instruction in an editable box.
  - **Drag the circle** to move it. It stays inside the screenshot.
  - **Edit the text.** Whatever the helper types is both shown and spoken in the tour.
  - **Delete step**, with a quick confirm.
- Steps with confidence below 0.6 have a visible "Please check this step" highlight.
- If sensitive content was flagged: a clear banner at the top ("This recording may show private info like a password or balance. Check each step, or delete this guide and record again.").
- **Publish** saves the steps and makes the tour live, then goes to Share. If the guide is already published, the button reads **Save changes**, and edits show up in the live tour.
- **Delete this guide** asks to confirm, then removes the guide and all its screenshots. Afterwards the helper sees "Guide deleted" with a link home, and the tour link shows the missing-guide message.
- The review link works for the creator. Their browser remembers it, and the review link itself contains the secret edit key.
  - [ ] Dragging a circle, editing text and deleting a step are all reflected in the tour after publishing.
  - [ ] Editing a published guide and saving changes the live tour.
  - [ ] Deleting a guide makes its tour link show the missing-guide message.

### Sharing
Source: `scope.md > The Core Loop` (step 4).
- Shows the tour link, a **Copy link** button (with a "Copied!" confirmation), and an editable message box prefilled with:
  > Hi! I made you a simple step-by-step guide for [task]. Just tap the link and follow along at your own pace. 💛 [link]
- **Send on WhatsApp** opens WhatsApp with **whatever is in the box**. If the helper removed the tour link from the box, the link is added back automatically on a new line at the end.
  - [ ] Tapping Send on WhatsApp on a phone opens WhatsApp with the edited message and a working link.
  - [ ] Deleting the link from the box and sending still produces a message with the link on its own last line.

### The tour
Source: `scope.md > The Core Loop` (step 5), `scope.md > What "Working" Looks Like`.
- **Start screen:** task title and a huge **Start** button. Tapping it also allows the voice to play.
- **Step screen:**
  - The real screenshot fills the screen. Everything is dimmed except a bright spotlight on the target, with a pulsing coral ring outlined in white.
  - A tooltip shows the instruction in very large text, placed above or below the target depending on space.
  - A progress bar shows "Step 3 of 7".
  - Huge **Got it, next** and **Back** buttons. Back is hidden or disabled on step 1.
- **Voice:** the instruction is read aloud automatically on each step, a little slower than normal (about 0.9 speed). **Hear again** repeats it. Moving on stops any speech in progress.
- **Tapping the glowing circle** moves to the next step. **Tapping anywhere else** on the screenshot does *not* move on. Instead the ring pulses once and the tooltip briefly shows "Tap the glowing circle."
- **Final screen:** "You did it!" (in sage) and **Start again**, which returns to step 1.
  - [ ] On a phone browser, a parent can go Start → every step → "You did it!" using only the glowing circle or Got it, next.
  - [ ] Each step's instruction is heard aloud, and Hear again repeats it.
  - [ ] A tap outside the spotlight doesn't advance and shows "Tap the glowing circle."
  - [ ] The spotlight sits on the right target at 360 px wide, in portrait.

## States and Boundaries
- **First visit (helper):** landing page with the explainer. Nothing to list; there are no dashboards.
- **Unreadable video** (e.g. a format the browser can't open): "This video won't open in your browser. No problem — take screenshots of each step and upload those instead." There is a button that switches to screenshot upload.
- **Video too short (under 3 s):** "That recording is too short — try recording the whole task." with **Choose another video** and the screenshot option.
- **Video too long (over 90 s):** "Shorter is clearer! Record just this one task, under 90 seconds." with **Choose another video** and the screenshot option.
- **Wrong number of screenshots** (fewer than 2 or more than 15): an inline message, and Make my guide stays disabled.
- **AI failure** (including still malformed after the retry): "Something went wrong building your guide." with a **Try again** button. The upload is kept, so trying again doesn't mean re-picking files.
- **No steps found:** "I couldn't spot any taps in this one." with **Try again** and a nudge to record more slowly or use screenshots.
- **All steps deleted on review:** Publish is disabled with "Keep at least one step."
- **Empty instruction:** that step can't be published until it has text.
- **Review link without the edit key** (wrong or missing): "This link can't edit this guide." No editing controls are shown.
- **Missing guide:** an unknown, draft or deleted guide link shows a warm "We can't find this guide. Ask the person who sent it for a new link." page.
- **No voice available:** the tour works text-only and **Hear again** is hidden.
- **Reduced motion:** no pulsing or animated transitions. The ring is shown steady.
- **Persistence:** guides and their screenshots stay online until the helper deletes them. The parent's progress isn't saved; reopening the link starts at the Start screen.
- **Who can do what:** anyone with the tour link can view a published guide. Only someone with the edit key can review, edit, publish or delete it.

## Product Decisions
- **Drag-to-move only, no circle resize.** Dragging fixes most AI misses and keeps review small.
- **"Delete this guide" is in the PoC.** Screenshots of someone's phone shouldn't stay online with no way to remove them, and the edit key makes it simple.
- **The screenshot fallback is in the PoC.** It gives the "video won't open" message somewhere to send people.
- **Published guides stay editable** through the same review link. Changes go live, so mistakes can be fixed after sending.
- **Tapping the spotlight advances; tapping elsewhere coaches** ("Tap the glowing circle") instead of advancing. It mirrors the real action without letting stray taps skip steps.
- **Voice at about 0.9 speed**, text-only fallback. Slower is kinder for the learner.
- **The share message is editable**, with no hardcoded "Mum". Helpers are writing to different people.
- **The spotlight ring is coral with a white outline; sage is for success only.** It must stand out on any screenshot.
- **Deeper coral under white text,** for contrast.
- **Videos 3–90 s accepted; outside that, a friendly rejection.** Very short clips can't show a task, and long ones make for muddled guides.
- **The tour link is always in the message.** It's added back if removed, because a message without the link is useless.
- **Deploying on Vercel is a must-have.** The demo is a parent opening a real WhatsApp link.

## What We're Building
- Landing with tagline, explainer and **Make a guide**.
- Create from a video (3–90 s) or from 2–15 screenshots, with the privacy notice and friendly progress.
- AI step building with a checked answer and one automatic retry.
- Review: drag the circle, edit text, delete a step, low-confidence highlight, sensitive banner, publish / save changes, delete the guide.
- Share: editable message, Send on WhatsApp, copy link.
- Tour: start, spotlight steps with voice, tap-to-advance and coaching, progress, back, completion, start again.
- Every state listed in **States and Boundaries**.
- Public deployment with a working link; README; scope, PRD and spec committed.

## Deferred From the POC
- **Circle resize:** moving fixes most misses; resizing can come later.
- **Remembering the parent's progress:** the tour is short, so restarting is fine.
- **A list of my guides:** each guide lives at its own link, and the review link is the helper's handle. A list would need accounts or extra storage.

## Possible Later Enhancements
- Resizable circle, and reordering steps.
- Recording a custom voice note per step instead of the built-in voice.
- Multiple languages for the instructions and voice.

## Non-Goals
- **Accounts/login:** the edit key is enough for one helper.
- **Payments, analytics:** they don't help prove the idea.
- **A live overlay on other apps, native apps:** the web tour over real screenshots is the idea.
- **Editing beyond move, text and delete:** review only fixes small misses.
- **Guide lists or dashboards:** one guide per link.

## Open Questions
None. Both earlier assumptions (video length limits, a removed link) were resolved by the learner.
