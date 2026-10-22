---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast (chosen in `learner-profile.md`: "build end to end without stopping for approval at each step")

## Slices

- [x] **1. A real recording becomes AI steps you can see**
  Becomes usable: On `/`, the helper types a task name, picks a screen recording, and lands on a plain review page listing every step Claude found: the screenshot, a circle on the target, and the instruction. The real pipeline runs end to end: frames extracted in the browser → draft created → frames uploaded to the private bucket → Claude builds the steps.
  Why now: The two riskiest, newest parts (in-browser frame extraction and the Claude vision call with structured output) are the kernel. If either fails on the real recordings, everything after changes. Bootstrapping happens here too: the Next.js scaffold, Tailwind tokens, fonts, Supabase setup and env.
  PRD ref: `prd.md > Creating a guide`, `prd.md > AI step building`, `prd.md > The Core Journey` (steps 1–4, minimal)
  Spec ref: `spec.md > Frame extraction (client)`, `spec.md > AI step builder`, `spec.md > Guide API (server route handlers)` (POST create, POST build, GET), `spec.md > Data Model`, `spec.md > Stack`, `spec.md > Where It Runs and How Someone Tries It`
  Build:
  - Scaffold Next.js 16 + TypeScript + Tailwind 4 per `spec.md > File Structure`. Add zod, `@anthropic-ai/sdk`, `@supabase/supabase-js`, `server-only` and Vitest.
  - Look-and-feel base: `globals.css` tokens and Fredoka/Nunito fonts.
  - Supabase: `supabase/schema.sql` and `scripts/check-supabase.mjs`.
  - Frames: `lib/frames/extract.ts` and `select.ts`.
  - AI: `lib/ai/*` (schema, prompt, validate, buildGuide), with retry-once and the refusal fallback.
  - Plumbing: `lib/editKey.ts`, `lib/supabase/*`, `lib/guides.ts`.
  - Routes: `POST /api/guides`, `POST /api/guides/[id]/build`, `GET /api/guides/[id]`.
  - Screens: a minimal `CreateForm` (task + video) with basic progress, and a read-only review page.
  Verify (mechanical):
  - `npm run build` and `npm run lint` pass.
  - `npx vitest run` passes `tests/select.test.ts` and `tests/validate.test.ts` (hard vs soft rules on fixture outputs).
  - `node --env-file=.env.local scripts/check-supabase.mjs` is all ✓. This includes RLS hiding rows from the publishable key, and a signed upload with the publishable key (verify-early #3).
  - In the in-app browser against `npm run dev`, run `extract()` on **all three** files in `test-recordings/`. Record each file's frame count, the size of the long side, and that there are no black frames (verify-early #4, desktop part).
  - **Exactly one** real Claude call, on one recording, through the app. Confirm `zodOutputFormat` accepted the schema (verify-early #1) and whether the fallback beta works with `parse()` (verify-early #2). Check that the logged attempts and hard errors are sensible, and compare the steps with the recording. Budget about $0.05; no loops.
  Learner check: Run `npm run dev`, open http://localhost:3000, make a guide from one of your recordings, and read the steps. Did Claude find the taps you actually made, in order, with circles on the right buttons?
  Commit: `Scaffold app and build guides from real recordings with Claude`

- [x] **2. Your parent can follow the published tour, on a real phone**
  Becomes usable: A **Publish** button on the review page makes the guide live. `/g/[id]` is the full tour: Start screen, real screenshot with dimmed background, spotlight, coral/white pulsing ring, large tooltip, voice at 0.9 with Hear again, tap-the-circle to advance, "Tap the glowing circle." coaching, progress, Back, and "You did it!" with Start again. A missing or draft link shows the friendly not-found page. The app is deployed on Vercel so it can be tried on phones.
  Why now: The tour is the other half of the kernel and the demo moment. Deploying now means the iPhone Safari risks (frame extraction and speech unlock) are tested on a real phone early, while there's time to react.
  PRD ref: `prd.md > The tour`, `prd.md > States and Boundaries` (missing guide, no voice, reduced motion), `prd.md > Product Decisions` (Vercel deploy)
  Spec ref: `spec.md > Tour`, `spec.md > Not found`, `spec.md > Guide API (server route handlers)` (PUT publish, GET images), `spec.md > Look and Feel`, `spec.md > Where It Runs and How Someone Tries It`
  Build:
  - Server: `PUT /api/guides/[id]` (publish only for now) and `GET /api/guides/[id]/images`.
  - Pages and components: `app/g/[id]/page.tsx`, `not-found.tsx`, `components/tour/*`, `lib/speech.ts`, `components/ui/Button.tsx`.
  - Image-refresh-on-error.
  - README setup and deploy steps.
  - Deploy to Vercel with the learner's env vars (the learner connects the repo and sets them).
  Verify (mechanical):
  - `npm run build` and `npm run lint` pass.
  - In the in-app browser at 360×800 (mobile preset):
    - Start → each step → done works.
    - A tap off-target shows the coaching and doesn't advance.
    - The spotlight sits over the stored target box (the box is checked with `getBoundingClientRect`).
    - Back is hidden on step 1.
    - Dark color scheme renders.
  - An unknown id and a draft id both show not-found.
  - A deliberately broken image URL triggers a refresh.
  - The deployed URL returns 200 for `/` and for a published tour.
  Learner check: On your **iPhone** and your **Android** phone, open the deployed site, make a guide from that phone's own recording, publish it, and open the tour link. Does the voice play after Start? Does the spotlight land on the right spots? Does tapping the circle feel natural?
  Commit: `Add the spotlight tour with voice and deploy to Vercel`

- [x] **3. The helper can fix the AI's steps and delete the guide**
  Becomes usable: Review becomes the full editor:
  - Drag the circle (and nudge it with arrow keys), edit the text (the spoken text follows it), delete a step.
  - A "Please check this step" badge on low-confidence steps, and the sensitive-content banner.
  - **Publish** / **Save changes** with the "Keep at least one step." and empty-text rules. Edits go live.
  - **Delete this guide** removes the frames and the row and shows "Guide deleted".
  - The edit key comes from `#key=` or localStorage. Without it the page shows "This link can't edit this guide."
  Why now: With real AI output seen in slices 1–2, we know how much correcting is actually needed. Deleting is the privacy promise from scope.
  PRD ref: `prd.md > Reviewing and publishing`, `prd.md > States and Boundaries` (all steps deleted, empty instruction, review link without the edit key, persistence)
  Spec ref: `spec.md > Review`, `spec.md > Guide API (server route handlers)` (PUT full validation, DELETE), `spec.md > Data Model` (where each piece of data lives)
  Build: `components/review/ReviewEditor.tsx`, `StepCard.tsx`, `SensitiveBanner.tsx`, `lib/editKeyClient.ts`; full `PUT` validation; `DELETE`.
  Verify (mechanical):
  - `npm run build` and `npm run lint` pass.
  - In the in-app browser on the guide from slice 1:
    - Drag a circle, edit text and delete a step, then Save changes. The live tour reflects all three.
    - Zero steps disables Publish.
    - Opening review without the key shows the can't-edit message.
    - `curl` PUT/DELETE with a wrong key returns 403.
    - Delete this guide: the tour link then shows not-found, and the bucket folder for that id is empty (checked via the script).
  Learner check: Open the review link for a guide, move a circle, reword a step, delete one, and save. Open the tour on your phone; are the changes there? Then delete a test guide and confirm its link no longer works.
  Commit: `Add the review editor, save changes, and delete guide`

- [x] **4. Send it on WhatsApp**
  Becomes usable: After publishing, the helper lands on `/g/[id]/share`. It shows the link, **Copy link** ("Copied!" in sage), and the editable message prefilled with the PRD text. **Send on WhatsApp** opens WhatsApp with exactly what's in the box, and adds the link back on its own line if it was removed. A "Back to review" link appears when this browser has the key.
  Why now: Sharing closes the helper's loop and is the start of the demo. It's small and depends on publishing (slices 2–3).
  PRD ref: `prd.md > Sharing`
  Spec ref: `spec.md > Share`
  Build: `app/g/[id]/share/page.tsx`, `components/share/ShareBox.tsx`; Publish redirects to Share.
  Verify (mechanical):
  - `npm run build` and `npm run lint` pass.
  - In the in-app browser, the generated `wa.me` URL decodes to the box text.
  - With the link deleted from the box, the decoded text ends with `\n<tour URL>`.
  - Copy shows "Copied!".
  - A draft guide's share page shows not-found.
  Learner check: On your phone, publish a guide, edit the message, tap Send on WhatsApp and send it to yourself. Does the message read the way you want, and does the link open the tour?
  Commit: `Add the share page with WhatsApp and copy link`

- [x] **5. Screenshots, every friendly error, and the finished landing page**
  Becomes usable:
  - **Landing:** the full landing page with "Show it once. They've got it forever.", the 3-step explainer and **Make a guide**.
  - **Create form:**
    - The privacy notice, and the "Use screenshots instead" path (2–15 images with an order preview).
    - **Make my guide** is disabled until the input is valid.
    - The three progress stages, with "Please keep this page open."
  - **Every error screen from the PRD:**
    - Too short (under 3 s) and too long (over 90 s), each with Choose another video and screenshots.
    - Unreadable video, with a switch to screenshots.
    - AI failure, where Try again re-runs only the build.
    - No steps found.
  - **Accessibility pass:** contrast, 56 px targets, reduced motion, dark mode, 360 px.
  - The README is complete.
  Why now: These are the edges around a core that already works. Doing them last means they wrap real behavior instead of guesses.
  PRD ref: `prd.md > Creating a guide`, `prd.md > States and Boundaries`, `prd.md > Look and Feel`, `prd.md > Screens and Layout`
  Spec ref: `spec.md > Landing and Create`, `spec.md > Frame extraction (client)` (screenshots), `spec.md > Important Failure Modes`, `spec.md > Look and Feel`
  Build: `app/page.tsx` landing, `components/create/CreateForm.tsx` (full), `components/create/BuildProgress.tsx`, `lib/frames/screenshots.ts`, README.
  Verify (mechanical):
  - `npm run build`, `npm run lint` and `npx vitest run` pass.
  - In the in-app browser:
    - A video under 3 s and one over 90 s (generated locally with ffmpeg from the test recordings, so no real screens are committed) show the right messages.
    - A non-video file renamed `.mp4` shows the unreadable screen.
    - Screenshots (frames exported locally from a recording) build a guide. This is **the second and last planned Claude call**.
    - The AI failure and no-steps screens are shown by forcing the error codes with a dev-only query flag. **No Claude call** for these.
  - Reduced motion and dark mode are checked with emulation.
  - Contrast of the coral-deep buttons against white is ≥ 4.5:1.
  Learner check: Try to break it: a very long video, a short one, a random file, and then screenshots from your phone. Does every message feel kind and tell you what to do next?
  Commit: `Add screenshot upload, friendly error screens, and the finished landing page`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 2, on the deployed URL (learner pushed to GitHub and deployed on Vercel; tested on Android). Findings: only ~4 steps per guide, voice only on "Hear again", slow uploads → fixed in the post-checkpoint round. iPhone moves to the final phone tests.
- [x] Final kick-the-tires exploration and feedback completed — learner tested the live URL on iPhone (Safari) and Android (Chrome): video upload including the HEVC iPhone original, steps, review editing, publish, WhatsApp share, voice on every step, the screenshots path, error messages and delete all worked; circles were accurate.

## Final Review

- [x] Final review complete — feedback resolved and learner confirms ready to ship
  Outcome: no changes requested in the final round. Afterwards all test guides (they showed real WhatsApp chats) and their screenshots were deleted at the learner's request; Supabase is empty.

## Code Tour and App Map

- [x] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [x] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: Prior practice connected (focused alternative). The learning goal (reliable structured output) was exercised during the build: `tests/validate.test.ts` covers shape-valid but meaning-broken replies; build logs for three development builds showed `attempt: 1, hard: []`; the "only 4 steps" checkpoint bug was traced by counting frames at each stage to dedupe, not the model (Revisions).
Route and stops: Reference route in the app map (not toured interactively): `lib/frames/extract.ts` `extractVideoFrames` + `lib/frames/select.ts` `isDuplicate`/`selectFrames` → `lib/ai/buildGuide.ts` `buildGuide` + `lib/ai/validate.ts` `checkGuide` → `components/tour/Tour.tsx` `goTo` + `components/tour/Spotlight.tsx` `Spotlight`.
Edit outcome: Not applicable — no tour edit; the learner moved straight to shipping.
Reflection: Transfer question offered at hand-off; any answer goes in the ignored learner profile.
Activity mode: Prior practice connected, plus the app map (`devpost/app-map.html`, snapshot of 977dd1d).

## Revisions
- Storage object keys are `{id}/frame-{n}.jpg` inside the `guides` bucket — the spec's `guides/{id}/frame-{n}.jpg` meant bucket + path; writing it literally would have nested a second `guides/` folder.
- `scripts/check-supabase.mjs` now creates the private bucket if missing and uses a real `select` for the table check — the first run's HEAD request reported a missing table as fine, and the SQL's bucket insert hadn't taken effect.
- The publishable-key check accepts "table not exposed" as well as "zero rows" — new Supabase projects don't expose new tables to the publishable key at all, which is stricter than the planned RLS-only protection.
- Client components that read route params are wrapped in `<Suspense>` — Next 16.4's Cache Components (on by default) fails the build otherwise.
- The original iPhone recording is HEVC; Chromium on this Linux machine can't decode it and correctly shows the unreadable path. Real iPhone Safari extraction moves to the slice 2 phone checkpoint (it was always the iOS part of verify-early #4).
- Added a prompt rule to prefer the fully loaded frame of a screen — the first real build attached 2 of 8 steps to mid-loading frames. Tested at slice 5's planned call, not with an extra call.
- `@types/node` bumped to 22 — Vitest 5 requires it; the scaffold pinned 20.
- Dedupe now counts the share of clearly changed pixels on a 64×128 thumbnail, ignoring the status bar, with a 1% threshold — the Android checkpoint's "only 4 steps" came from the 32×64 mean-difference rule dropping small real changes (a ticked photo, a highlighted row, a typed caption). The 32 s test recording keeps 21 frames instead of 16.
- Frame selection still keeps "the frames just before screen changes", but any change ≥ 3% counts equally and screens that stayed put win ties — ranking by raw change size was discarding the settled screen before a tick in favour of mid-animation frames.
- The prompt now says every tap that changes the screen is its own step and never to merge taps.
- Speech: speak() cancels only when something is playing, waits 80 ms after a cancel, keeps a reference to the utterance and retries once if it hasn't started in 1.5 s — Android Chrome drops speak() right after cancel() and can garbage-collect utterances; the checkpoint heard only "Hear again".
- Uploads run 4 at a time with one retry per frame and show "Uploading n of N…"; signed upload tokens allow overwrite so a retry can't fail on a half-finished first try.
- The friendly error screens arrived early (with the iPhone "Most Compatible" tip on the unreadable-video screen); the screenshot path is still slice 5.
- The review page only saves an edit key after the server accepts it, trying the link's key and then the saved one — opening a link with a wrong key used to overwrite the good saved key and lock the helper out.
- `removeGuideFiles` now throws on storage errors so "Delete this guide" can't report success while screenshots remain; the slice 1 build had silently left 8 unused frames online (removed).
- Wide targets (e.g. a box spanning a whole icon row) can be moved but not shrunk, since circle resize is deferred; the low-confidence badge flags them for the helper.
- The share message puts the task name in quotes ("…guide for \"Send a video on WhatsApp\"…") — task names are written as instructions, so splicing them into the PRD sentence read awkwardly; the rest of the PRD wording is unchanged.
- Copy link falls back to select-and-copy when the clipboard API is blocked; the tour link is built from the page's own address so preview and production links both work.
- Final walkthrough ran in headless Chrome at 360 px in light and dark (create form and screenshot preview without submitting, review, publish → share, the full tour): 33 checks passed. The tour screenshots now wait for the signed image to load; on a slow connection the first step's screenshot can appear a moment after the instruction.
- Claude calls this round: one video build (21 frames, ~$0.05) and one 7-screenshot build (~$0.02); error screens were forced without Claude.

