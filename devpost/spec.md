---
doc: spec
status: approved
---

# Show Me Once — Technical Spec

Implements `prd.md` (approved). The scope kernel this must protect: one recording → a tour on **real screenshots** with a spotlight and voice (`scope.md > The Unique Kernel`).

## How This Works, In Plain Language

Show Me Once is one Next.js app on Vercel, with Supabase for storage and Claude for the AI step.

- **The helper's phone or laptop does the video work.** When the helper picks a recording, the browser plays it invisibly, takes a still picture every half second, and throws away pictures that look the same as the one before. It keeps at most 24, favouring the ones just before the screen changed, since that's where taps happen. Screenshots skip this and are just resized. The video itself never leaves the device; only the pictures do.
- **Supabase holds two things.**
  - A `guides` table with one row per guide: title, the steps as JSON, whether it's published, and a *hash* of the secret edit key.
  - A **private** storage bucket holding that guide's screenshots.

  Nothing in Supabase is readable from the browser directly. Only our own server code, using the secret service key, can read or write it.
- **Our server routes are the only door.** The browser asks the server for permission to upload pictures (signed upload links), asks it to build the guide, and asks it to save or delete. Any request that changes a guide must include the edit key. The server hashes the key and compares it with the stored hash.
- **Claude does the thinking.** The build route downloads the guide's pictures from storage and sends them to Claude in order, numbered, along with the task name.
  - **Shape:** Claude's *structured outputs* mode guarantees the answer comes back in the right JSON shape.
  - **Meaning rules:** our own zod checks then verify the rules a schema can't express. The frame must exist, the box must sit inside the picture, instructions must be under 12 words, and they must never say "click".
  - **Fixing problems:** if a hard rule fails, we ask Claude once more and show it exactly what was wrong. Small slips are fixed automatically and flagged for the helper to check.
- **The tour is a normal web page.** The server reads the published guide, creates one-hour links to its screenshots, and sends the page. The parent's phone then does the spotlight, the voice (the browser's built-in speech), and the step-by-step buttons. If a screenshot link expires while the tour is left open, the page quietly asks for fresh links.

**Why this shape?** It's the smallest setup that keeps the edit key and the screenshots private. It's one app, one table, one bucket and one AI call per guide, with no accounts and no background jobs. The parts you're new to (frame extraction and the Claude vision call) each live in a single file that can be tested on its own.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

1. **Landing** (`/`). The server renders the landing page. **Make a guide** reveals `CreateForm` on the same page, with no navigation.
2. **Create.** The helper types the task and picks a video or screenshots.
   - `lib/frames/extract.ts` checks the duration (3–90 s). It samples a frame every 0.5 s at 1280 px JPEG 0.8, drops duplicates, and selects at most 24.
   - Screenshots go through `lib/frames/screenshots.ts`, which resizes them to the same size.
   - Progress shows "Reading your video…".
3. **Create the draft.** The browser sends `POST /api/guides` with `{ title, frameCount }`.
   - The server makes a random edit key, stores only its SHA-256 hash, and creates the row (`status: 'draft'`).
   - It returns `{ id, editKey, uploads: [{ path, token }] }`, one signed upload link per frame.
   - The browser saves `editKey` in localStorage under `smo:key:{id}`.
4. **Upload.** The browser uploads each JPEG straight to Supabase Storage at `guides/{id}/frame-{n}.jpg`, using the signed upload tokens. The pictures never pass through Vercel, so its 4.5 MB request limit doesn't apply.
5. **Build.** The browser sends `POST /api/guides/{id}/build` with the header `x-edit-key`. Progress shows "Finding the taps…", then "Writing the steps…" after about 12 s.
   - The server downloads the frames and calls Claude (`lib/ai/buildGuide.ts`), retrying once if needed.
   - It saves `steps`, `title` and `sensitive_warning`, and removes frames no step uses.
   - It returns `{ ok: true }` or a typed error: `no_steps`, `ai_failed` or `not_found`.
6. **Review** (`/g/{id}/review#key=…`). The client reads the key from the URL fragment (falling back to localStorage) and sends `GET /api/guides/{id}` with `x-edit-key`. It gets the steps plus 1-hour signed image URLs.
   - Dragging, editing and deleting change local state only.
   - **Publish / Save changes** sends `PUT /api/guides/{id}` with `{ steps, publish: true }`.
   - **Delete this guide** sends `DELETE /api/guides/{id}`.
7. **Share** (`/g/{id}/share`). The server reads the published guide's title and the client shows the editable message.
   - **Send on WhatsApp** opens `https://wa.me/?text=` followed by the encoded message. If the tour URL is missing from the message, it's appended on a new line first.
8. **Tour** (`/g/{id}`). The server loads the guide (published only) with signed image URLs and passes them to the `Tour` client component.
   - The component handles Start (which unlocks speech), the steps, the spotlight, tap handling, speech and progress, ending on "You did it!".
   - If an image fails to load, it calls `GET /api/guides/{id}/images` for fresh URLs.

```
Helper browser ──frames──▶ Supabase Storage (private bucket)
     │  POST /api/guides, /build, PUT, DELETE (x-edit-key)
     ▼
Next.js route handlers on Vercel ──service key──▶ Supabase Postgres (guides)
     │ downloads frames, base64
     ▼
Claude API (claude-sonnet-5-5, structured outputs)

Parent phone ──GET /g/{id}──▶ server component ──▶ guide + 1h signed URLs ──▶ Tour (spotlight + speech)
```

## Stack

| Piece | Version (checked 2026-10-19 with `npm view`) | Why | Docs |
|---|---|---|---|
| Next.js (App Router) + React | `next` 16.4.x, `react` 19.3.x | Learner's established stack. Server components for the tour, route handlers for the API | https://nextjs.org/docs |
| TypeScript | via `create-next-app` (npm latest is 7.0.x) | Learner's stack | https://www.typescriptlang.org/docs/ |
| Tailwind CSS | 4.3.x (`@theme` tokens in CSS) | Learner's stack | https://tailwindcss.com/docs |
| zod | 4.6.x | AI output checks and request validation. Also used by the Anthropic SDK's `zodOutputFormat` helper | https://zod.dev |
| `@anthropic-ai/sdk` | 0.135.x | Official SDK. `messages.parse` + `zodOutputFormat` for structured outputs | https://platform.claude.com/docs/en/build-with-claude/structured-outputs · https://platform.claude.com/docs/en/build-with-claude/vision |
| `@supabase/supabase-js` | 2.118.x | Postgres + Storage. Server client with the secret key; browser client only for `uploadToSignedUrl` | https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl |
| Vitest | latest | Small unit tests for the AI validator and frame selection (the learning goal) | https://vitest.dev |
| Fonts | `next/font/google`: Fredoka (headings), Nunito (body) | From `prd.md > Look and Feel` | https://nextjs.org/docs/app/api-reference/components/font |

**Model:** `process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5"` (learner's choice; $2 / $10 per million input/output tokens). Effort `medium` (learner accepted).

**Verify early in the build:**
- Does `zodOutputFormat` accept our schema as written? Structured outputs supports only a subset of JSON Schema, so numeric min/max may need to move into our own checks.
- Does the refusal-fallback beta work together with `messages.parse`? See External Services.
- Does `uploadToSignedUrl` work with the publishable key and no storage policies?

## Where It Runs and How Someone Tries It

- **Runtime:** Node 22+ (local machine has 22.22). The browser does frame extraction and speech; Vercel Functions (Node) run the route handlers.
- **Local:** `npm install`, copy `.env.example` to `.env.local` and fill it in, run `npm run dev`, then open http://localhost:3000. To try the tour on a phone during development, use the Vercel preview URL, since phones can't reach localhost.
- **Env vars:**

| Name | Where | Secret? |
|---|---|---|
| `ANTHROPIC_API_KEY` | server only | yes |
| `ANTHROPIC_MODEL` | server only (optional, default `claude-sonnet-5-5`) | no |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | no |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server (the publishable/anon key; can't read anything because RLS has no public policies) | no |
| `SUPABASE_SECRET_KEY` | server only (secret/service-role key) | yes |

- **Supabase setup:** create a project, then run `supabase/schema.sql` in the SQL editor. It creates the table, enables RLS with no policies, and creates the private `guides` bucket.
- **Deploy (must-have, `prd.md > Product Decisions`):**
  1. Push to a public GitHub repo.
  2. Import it in Vercel.
  3. Set the five env vars for Production and Preview.
  4. Deploy.

  Fluid Compute must stay **on** (the default for new projects).
- **`maxDuration`:** the build route sets `export const maxDuration = 120`.
  - **Confirmed against Vercel's docs** (https://vercel.com/docs/functions/limitations#max-duration, updated 2026-08-24): with Fluid Compute, Hobby allows 300 s (default and maximum), and Pro/Enterprise default to 300 s with a maximum of 800 s. So 120 s fits **every plan, including Hobby**.
  - Caveat: if Fluid Compute were switched off on the project, the older, lower limits would apply, so leave it on.
- **Demo recording:** use the deployed URL. Upload the WhatsApp recording, review, publish, send on WhatsApp, then the parent's phone opens the link and does the tour with voice. Also show one error state (for example the too-long video message).

## Look and Feel
From `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`. Headspace-like: warm, calm, rounded, never techy.

- **Tokens** (in `app/globals.css` under Tailwind `@theme`, redefined under `prefers-color-scheme: dark`):

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-cream` (bg) | `#FBF6EE` | `#221D1A` (warm charcoal) | page background |
| `--color-surface` | `#FFFFFF` | `#2C2622` | cards |
| `--color-ink` | `#2D2622` | `#F4ECE3` | text |
| `--color-muted` | `#6E635A` | `#B8AB9E` | secondary text |
| `--color-coral` | `#EF7B5F` | `#F48E74` | accents, the spotlight ring, the progress bar |
| `--color-coral-deep` | `#B9472A` | `#B9472A` | **every button or surface with white text** (5.25:1 with white, passes WCAG AA) |
| `--color-sage` | `#6F9E80` | `#8FC3A2` | **success only** ("You did it!", "Copied!") |

- **Spotlight ring:** a 4 px `--color-coral` outline with a 3 px **white** ring outside it. The dimmed overlay is `rgba(20,16,12,.62)` via `box-shadow: 0 0 0 9999px`.
- **Type:** Fredoka 500/600 for headings, Nunito 400/700 for body. Tour body text ≥ 22 px, tooltip text 26–28 px.
- **Shape and spacing:** `rounded-3xl` cards, `rounded-full` or `rounded-2xl` buttons, soft shadows, generous padding. Tour buttons ≥ 56 px tall and full-width on phones.
- **Motion:** ring pulse and gentle fades, all inside `@media (prefers-reduced-motion: no-preference)`. Reduced motion means a steady ring.
- **Copy tone:** warm, short, second person, no jargon, never "click". Error messages are kind and always offer a next step.

## Components

### Landing and Create
PRD ref: `prd.md > Creating a guide`, `prd.md > States and Boundaries`.
- `app/page.tsx` (server) renders the tagline, the 3-step explainer and **Make a guide**, which reveals the `CreateForm` client component.
- `CreateForm` holds the task name, a video `<input type="file" accept="video/*">`, and a "Use screenshots instead" switch (`accept="image/*" multiple`, 2–15, with an order preview). It shows the privacy notice and keeps **Make my guide** disabled until the input is valid. It runs the pipeline: extract → `POST /api/guides` → upload → build → navigate.
- `BuildProgress` shows the three stages and "Please keep this page open." It also shows the error screens: too short or too long (**Choose another video** + screenshots), unreadable video (switch to screenshots), `ai_failed` (**Try again** re-calls only `/build`), and `no_steps` (**Try again** + tips + screenshots).

### Frame extraction (client)
PRD ref: `prd.md > Creating a guide`. File: `lib/frames/extract.ts` (browser-only).
- **Loading:** `URL.createObjectURL(file)` into a hidden `<video muted playsinline preload="auto">`, then wait for `loadedmetadata`.
  - **Unreadable** if: an `error` event fires, `videoWidth === 0`, or there's no metadata within 10 s. This throws `VideoUnreadableError`.
  - Duration under 3 s or over 90 s throws `VideoTooShortError` / `VideoTooLongError`.
- **Sampling:** for `t = 0, 0.5, 1.0 … duration`, set `currentTime`, await `seeked`, and draw to a canvas scaled so the long side is ≤ 1280 px.
  - Each frame also gets a 32×64 grayscale thumbnail for comparison.
  - The frame is exported with `canvas.toBlob('image/jpeg', 0.8)`.
- **Duplicates:** a frame is dropped if its mean absolute thumbnail difference from the **last kept** frame is under `DUP_THRESHOLD` (start at 0.02, tune on real recordings).
- **Selection** (`selectFrames`, a pure function with unit tests): if more than 24 frames remain, always keep the first and last. Then rank the rest by how much the *next* frame differs from them (the frame just before the biggest changes) and take the top 22. The result is returned in time order (learner's rule).
- **Screenshots:** `lib/frames/screenshots.ts` decodes each image (`createImageBitmap`) and resizes it to the same 1280 px JPEG 0.8. There is no duplicate dropping, and order is preserved.
- **Known risk:** on iOS Safari, seeking a never-played video can produce black frames. Mitigation: call `video.play()` then `pause()` inside the click handler before sampling, and reject frames that are almost entirely black.

### Guide API (server route handlers)
PRD ref: `prd.md > Reviewing and publishing`, `prd.md > States and Boundaries` (who can do what).
All handlers use `lib/supabase/server.ts` (secret key). All return JSON `{ error: code }` with friendly codes. Edit-key checks use `lib/editKey.ts`: `sha256(key)` compared with `timingSafeEqual`.

| Route | Auth | Does |
|---|---|---|
| `POST /api/guides` | none | Validates `{ title (1–80 chars), frameCount (2–24) }`. Creates the row with a 32-byte random key (base64url) whose hash is stored. Returns `id`, `editKey` and `frameCount` signed upload tokens (`createSignedUploadUrl`) |
| `POST /api/guides/[id]/build` | edit key | `maxDuration = 120`. Downloads frames → `buildGuide()` → saves steps, title and `sensitive_warning` → deletes unreferenced frames. Errors: `no_steps`, `ai_failed`, `not_found`, `forbidden` |
| `GET /api/guides/[id]` | edit key | The full guide for review, with 1-hour signed URLs |
| `PUT /api/guides/[id]` | edit key | Validates `steps` (≥ 1 step, each instruction non-empty, target clamped to 0–1). Saves and sets `status: 'published'` when `publish: true` |
| `DELETE /api/guides/[id]` | edit key | Removes every object under `guides/{id}/`, then the row |
| `GET /api/guides/[id]/images` | none (published only) | Fresh 1-hour signed URLs, for tour image refresh |

### AI step builder
PRD ref: `prd.md > AI step building`. Learning goal: reliable structured output. Files: `lib/ai/buildGuide.ts`, `lib/ai/prompt.ts`, `lib/ai/schema.ts`, `lib/ai/validate.ts`.
- **Request:** one user message containing `"Frame 0:"`, then the image block (base64 JPEG), then `"Frame 1:"`, and so on, followed by a text block with the task name and the rules. The system prompt (`prompt.ts`) states the rules from the brief:
  - A step is a tap that changes the screen; it belongs to the frame *before* the change.
  - Skip duplicates, scrolling, loading screens, and the home screen (unless tapping the app icon is the first step).
  - The target is a box normalized 0–1.
  - Instructions are under 12 words, use visible labels or colors and positions, and never say "click".
  - `spokenInstruction` is one friendly sentence.
  - Include a confidence score and `sensitiveWarning`.
- **Shape (structured outputs):** `client.messages.parse({ model, max_tokens: 16000, output_config: { effort: "medium", format: zodOutputFormat(AiGuideSchema) }, … })`. `AiGuideSchema` is the brief's JSON shape. `parsed_output` is the typed result; if it's null, that counts as a hard failure.
- **Meaning rules** (`validate.ts`, pure and unit-tested). `checkGuide(output, frameCount)` returns `{ hard: string[], fixed: AiGuide }`.
  - **Hard (triggers the retry):**
    - `frameIndex` is not an integer in `[0, frameCount)`.
    - `w` or `h` ≤ 0.
    - The box lies entirely outside the picture.
    - The instruction is empty.
  - **Soft (fixed silently, then flagged):**
    - Box edges are clamped into 0–1.
    - "click/clicking/clicked" becomes "tap/tapping/tapped".
    - Instructions over 12 words are kept, but the step's confidence drops to ≤ 0.59.
    - Confidence is clamped to 0–1.
    - Steps are sorted by `frameIndex`.
- **Retry once:** if the parse failed or `hard` is non-empty, append Claude's `response.content` unchanged as the assistant turn. Then add a user turn: "Your answer broke these rules: … Return the corrected JSON." Call again. If it still fails, return `ai_failed`. (The history is append-only, which keeps the model's thinking valid.)
- **No steps:** a valid answer with `steps: []` returns `no_steps`, with no retry, because that's a real answer and not an error.
- **Stop reasons:** `refusal` (after the fallback) or `max_tokens` count as `ai_failed`. API errors (429/5xx/timeouts) are retried by the SDK's default retries (2), then become `ai_failed`.
- **Refusal fallback** (learner accepted): send `fallbacks: "default"` with the beta `server-side-fallback-2026-07-01` via the SDK's beta messages surface. *Verify early* that this works together with `parse()`. If it doesn't, keep `parse()` and handle a refusal as `ai_failed`.
- **Logging:** log the number of attempts and the hard-error lists on the server (with no image data), so we can see on real recordings whether retries actually happen.

### Review
PRD ref: `prd.md > Reviewing and publishing`.
- `app/g/[id]/review/page.tsx` renders the `ReviewEditor` client component.
- **Key:** `getEditKey(id)` reads `location.hash` (`#key=`), saves it to localStorage (wrapped in try/catch), and falls back to localStorage. With no key, or a 403 from the server, it shows "This link can't edit this guide."
- `SensitiveBanner` appears when `sensitive_warning` is set.
- `StepCard` shows the number, a `TargetImage` with a draggable circle, an instruction `<textarea>`, and **Delete step** (with confirm). Steps with confidence < 0.6 get a "Please check this step" badge.
  - **Drag:** pointer events on the circle; position is stored as a percentage of the image, clamped so the box stays inside.
  - **Keyboard:** arrow keys nudge the circle by 2%.
- **Publish:** shows **Publish** while a draft and **Save changes** once published. It's disabled when there are zero steps ("Keep at least one step.") or an empty instruction.
- **Delete this guide:** confirm → DELETE → a "Guide deleted" view with a link home → clear the key from localStorage.

### Share
PRD ref: `prd.md > Sharing`.
- `app/g/[id]/share/page.tsx` (server) loads the title of the published guide (or shows not-found) and renders `ShareBox`.
- **Message:** a `<textarea>` prefilled with the PRD message, with `[task]` and `[link]` filled in.
- **Send:** if the message doesn't contain the tour URL, append `\n` + the URL, then open `https://wa.me/?text=${encodeURIComponent(msg)}`.
- **Copy link:** `navigator.clipboard.writeText`, then a sage "Copied!".
- **Back to review:** links to `/g/{id}/review#key=…` if this browser has the key.

### Tour
PRD ref: `prd.md > The tour`.
- `app/g/[id]/page.tsx` (server) loads the published guide and signs its URLs. Not found or draft → `notFound()`. It renders the `Tour` client component.
- **`Tour` state:** `screen: 'start' | number | 'done'`.
  - **Start:** title and a huge **Start** button. The button's tap calls `speak(step 1)` inside the gesture, which unlocks speech on iOS.
  - **Step:** `Spotlight` plus `Tooltip`, a progress bar with "Step n of N", **Back** (hidden on step 1), **Got it, next**, and **Hear again** (hidden when speech is unavailable).
  - **Done:** "You did it!" in sage and **Start again** (back to step 1).
  - Every image is preloaded on Start.
- **`Spotlight`:** a wrapper sized to the image's displayed rectangle. The image's natural size is known, so it's fitted to the viewport with `object-contain` math.
  - **The target:** an absolutely positioned element at the step's percentage box, with `box-shadow: 0 0 0 9999px` for the dim, the coral ring, and a white outline.
  - **Tap area:** padded invisibly to at least 56×56 px.
  - **Taps:** a tap on the target advances. A tap elsewhere on the image pulses the ring once and shows "Tap the glowing circle." in the tooltip for 2 s.
  - Works at 360 px in portrait.
- **`Tooltip`:** placed below the target if the target's center is in the top half, otherwise above. Horizontally clamped inside the viewport. Text is 26–28 px.
- **`lib/speech.ts`:** feature-detects `speechSynthesis`. `speak(text)` cancels anything playing and speaks a `SpeechSynthesisUtterance` at `rate = 0.9`, with an English voice if available. If speech isn't available, or the first utterance errors, the tour switches to text-only.
- **Image refresh:** `<img onError>` → `GET /api/guides/{id}/images` → swap in fresh URLs, at most once per minute.

### Not found
PRD ref: `prd.md > States and Boundaries` (missing guide). `app/g/[id]/not-found.tsx` shows "We can't find this guide. Ask the person who sent it for a new link."

## Data Model

**Table `guides`** (`supabase/schema.sql`):

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK, `default gen_random_uuid()` | The unguessable link id |
| `title` | `text not null` | The task name; may be replaced by Claude's suggested title on build |
| `steps` | `jsonb not null default '[]'` | Reviewed steps (below) |
| `edit_token_hash` | `text not null` | SHA-256 hex of the edit key; **the key itself is never stored** |
| `status` | `text not null default 'draft'`, check `in ('draft','published')` | |
| `sensitive_warning` | `boolean not null default false` | From the AI *(derived addition to the brief's table)* |
| `frame_count` | `int not null` | Number of uploaded frames, for validating `frameIndex` *(derived addition)* |
| `created_at` | `timestamptz default now()` | |

RLS is **enabled with no policies**, so the publishable key can read and write nothing. The private storage bucket `guides` has no storage policies; uploads use signed upload tokens and reads use signed URLs.

**Step (inside `steps`):**
```ts
{ id: string,            // uuid, stable for React keys / editing
  imagePath: string,     // "guides/{id}/frame-{n}.jpg"
  instruction: string,
  spokenInstruction: string, // reset to the instruction text when the helper edits it
  target: { x: number, y: number, w: number, h: number }, // 0–1 of the image
  confidence: number }
```
When the helper edits an instruction, `spokenInstruction` is set to the edited text, so the PRD's rule that the edited text is both shown and spoken holds.

**Where each piece of data lives:**
- **Edit key:** created by the server once and returned once. Kept in the helper's URL fragment and in localStorage (`smo:key:{id}`); only the hash is in the database. If the helper loses both, they can't edit (accepted: no accounts).
- **Frames:** in the private bucket from upload until guide deletion. Frames not used by any step are removed after a successful build.
- **Review edits:** in memory until **Publish / Save changes**. Leaving the page before saving loses unsaved edits (no autosave in the PoC).
- **Tour progress:** in memory only, so reopening the link starts at the Start screen (`prd.md > States and Boundaries`).
- **Share message:** in memory only, never stored.

## File Structure

```
smo/
├── app/
│   ├── layout.tsx                 # fonts (Fredoka, Nunito), <html> theme, metadata
│   ├── globals.css                # Tailwind v4 @theme tokens, light/dark, reduced motion
│   ├── page.tsx                   # landing + reveals CreateForm
│   ├── g/[id]/
│   │   ├── page.tsx               # public tour (server: load published guide + signed URLs)
│   │   ├── not-found.tsx          # friendly missing-guide page
│   │   ├── review/page.tsx        # renders ReviewEditor
│   │   └── share/page.tsx         # renders ShareBox
│   └── api/guides/
│       ├── route.ts               # POST create draft + signed upload tokens
│       └── [id]/
│           ├── route.ts           # GET (review) · PUT (save/publish) · DELETE
│           ├── build/route.ts     # POST build with Claude (maxDuration = 120)
│           └── images/route.ts    # GET fresh signed URLs for a published tour
├── components/
│   ├── create/CreateForm.tsx      # inputs, validation, pipeline orchestration
│   ├── create/BuildProgress.tsx   # stages + all create/build error screens
│   ├── review/ReviewEditor.tsx    # load, edit state, publish, delete
│   ├── review/StepCard.tsx        # one step: image + draggable circle + text + delete
│   ├── review/SensitiveBanner.tsx
│   ├── share/ShareBox.tsx         # editable message, WhatsApp, copy
│   ├── tour/Tour.tsx              # start → steps → done, speech, image refresh
│   ├── tour/Spotlight.tsx         # fitted image, dim, ring, tap handling
│   ├── tour/Tooltip.tsx
│   └── ui/Button.tsx              # big rounded buttons (≥ 56px), variants
├── lib/
│   ├── frames/extract.ts          # video → frames (browser)
│   ├── frames/select.ts           # duplicate drop + selectFrames (pure, tested)
│   ├── frames/screenshots.ts      # images → resized frames (browser)
│   ├── ai/schema.ts               # zod schemas: AiGuideSchema, Step
│   ├── ai/prompt.ts               # system prompt + message builder
│   ├── ai/validate.ts             # checkGuide: hard vs soft rules (pure, tested)
│   ├── ai/buildGuide.ts           # Claude call + retry-once (server only)
│   ├── supabase/server.ts         # secret-key client ("server-only")
│   ├── supabase/browser.ts        # publishable-key client, uploads only
│   ├── editKey.ts                 # generate, hash, verify (server only)
│   ├── editKeyClient.ts           # read #key / localStorage (try/catch)
│   ├── guides.ts                  # load guide, sign URLs, shared types
│   └── speech.ts                  # speechSynthesis wrapper
├── tests/
│   ├── validate.test.ts           # hard/soft rule cases, fixture AI outputs
│   └── select.test.ts             # frame dedupe + selection
├── supabase/schema.sql            # table, RLS on, private bucket
├── .env.example                   # all five env vars, no values
├── README.md                      # setup, env vars, Supabase, deploy, demo
├── devpost/                       # scope.md, prd.md, spec.md (committed); profile ignored
└── package.json
```

## External Services and Dependencies

### Claude API (Anthropic)
- **Call:** `POST /v1/messages` via `client.messages.parse(...)` (or the beta equivalent for fallbacks). Settings:
  - `model`: from env.
  - `max_tokens`: 16000.
  - `output_config`: `{ effort: "medium", format: zodOutputFormat(AiGuideSchema) }`.
  - `messages`: `[{ role: "user", content: [ {type:"text",text:"Frame 0:"}, {type:"image",source:{type:"base64",media_type:"image/jpeg",data}}, … , {type:"text",text: taskAndRules} ] }]`.
- **Response:** `parsed_output` (typed) and `stop_reason`.
- **Keys:** `ANTHROPIC_API_KEY`, server only (`import "server-only"` in the AI files).
- **Size and cost:** 24 images at about 590×1280 is roughly 24k input tokens (≈ w×h/750 each), about **$0.05 per build** at $2 per million input tokens. A retry roughly doubles that. The request is well under the 32 MB API limit.
- **Docs:** https://platform.claude.com/docs/en/build-with-claude/vision · https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- **Rate limits:** depend on the account tier; not a concern at demo scale.

### Supabase
- **Server calls:**
  - `from('guides').insert/select/update/delete`
  - `storage.from('guides').createSignedUploadUrl(path)` (valid 2 h)
  - `.download(path)`
  - `.createSignedUrls(paths, 3600)`
  - `.remove(paths)`
  - `.list('guides/{id}')`
- **Browser call:** `storage.from('guides').uploadToSignedUrl(path, token, blob, { contentType: 'image/jpeg' })`.
- **Docs:** https://supabase.com/docs/guides/storage/security/access-control · https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl
- **Cost:** the free tier is enough. Each guide is at most about 24 × ~150 KB.

### Vercel
- **Hosting:** Next.js, Fluid Compute on. Build route `maxDuration = 120`; plan limits are confirmed above.
- **Docs:** https://vercel.com/docs/functions/configuring-functions/duration

### WhatsApp
- **Link:** `https://wa.me/?text=<urlencoded>`. No key needed; it opens WhatsApp's contact picker.
- **Docs:** https://faq.whatsapp.com/5913398998672934

### Browser APIs
- `HTMLVideoElement` + canvas for frame extraction, `createImageBitmap` for screenshots, `speechSynthesis` for the voice, `navigator.clipboard` for copying.

## Important Failure Modes

- **The phone's video won't decode** (for example HEVC on some Android browsers, or `.mov` on some) → the "This video won't open in your browser" screen with **Use screenshots instead**.
- **Black or blank frames on iOS Safari** → play/pause priming inside the tap, and rejecting near-black frames. If every frame is rejected, show the same unreadable-video screen.
- **Claude is slow or fails** (time limit, 5xx, still broken after the retry, refusal) → the "Something went wrong building your guide" screen. **Try again** re-runs only `/build`; the frames are already uploaded.
- **Claude finds no steps** → "I couldn't spot any taps in this one" with tips and the screenshot option.
- **Signed image URLs expire on an open tour** → re-fetch on image error.
- **Speech unavailable or silent** → text-only, with **Hear again** hidden.

## What Was Simplified and Why

- **Server-only data access with no RLS policies,** instead of public read policies. Simpler and safer: it avoids exposing the edit key through row-level reads. A fuller version would split secrets into a separate table and add column-level grants.
- **The edit key in the URL fragment and localStorage** instead of accounts. A fuller version would need Supabase Auth and guide ownership.
- **One AI call per guide (plus at most one retry)** instead of a multi-pass pipeline (find steps, then locate each target). A fuller version could add a second, zoomed-in pass to place targets more precisely.
- **Speech from the browser** instead of recorded or generated audio. A fuller version would use a TTS API for consistent voices.
- **No autosave on review.** Edits are saved on Publish / Save changes.

## Decisions and Open Issues

**Learner decisions (this phase):**
- **Server-only access:** no public RLS policies, server-only reads and writes, a hashed edit key, a private bucket with signed URLs, and the key in the URL fragment plus localStorage. Accepted; it protects the key and the screenshots.
- **Signed screenshot URLs:** last at least 1 hour, with a re-fetch on image error (learner addition), so a tour left open keeps working.
- **Frames:** 1280 px JPEG 0.8, every 0.5 s, duplicates dropped on the device, capped at 24. When there are more than 24, keep the frames just before the largest screen changes plus the first and last (learner addition). This makes for a sharper tour and better target reading, at about $0.05 per guide.
- **Structured output approach (b):** the API's structured outputs guarantee the shape, our own zod checks the meaning rules, and there is one retry with the exact errors. The soft-rule handling is accepted: "click" → "tap", over-length text kept with confidence below 0.6, and only shape problems or impossible frame indexes fail with "Try again".
- **Refusal fallback and effort `medium`:** accepted.
- **`maxDuration = 120`:** confirmed within every Vercel plan's limit with Fluid Compute.

**Derived implementation details (the agent's, following from the above):**
- SHA-256 for the key hash: the key is 32 random bytes, so slow hashing isn't needed.
- `sensitive_warning` and `frame_count` columns added to the brief's table.
- Unused frames are removed after the build.
- `spokenInstruction` follows edited text.
- Duplicate threshold of 0.02 as a starting point.
- Stage 3 of the progress screen appears after about 12 s.

**The useful unknown (learning goal):** *"If the API already guarantees JSON, what's left for zod and the retry to do?"*
- **What clarified it:** structured outputs guarantee the **shape** but not the **meaning**, for example a `frameIndex` that doesn't exist, a box off the picture, or "click".
- **How it will be checked during the build:**
  - `tests/validate.test.ts` feeds fixture outputs that are valid in shape but break the rules, and checks the hard/soft split.
  - The build route logs attempts and hard errors, so the iPhone and Android recordings show whether the retry ever fires in practice.

**Verify early in the build** (not product decisions):
1. `zodOutputFormat` accepts `AiGuideSchema`. If a constraint isn't supported by structured outputs, keep it in `validate.ts` only.
2. `fallbacks: "default"` works together with `parse()`. If not, fall back to `ai_failed` on refusal.
3. `uploadToSignedUrl` with the publishable key and no storage policies.
4. iOS Safari frame extraction produces non-black frames from a real recording.

**Carried over from `prd.md > Open Questions`:** none.
