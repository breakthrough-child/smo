# Show Me Once

**Show it once. They've got it forever.**

Record a phone task once — joining the family WhatsApp call, sending a photo to a group — and Show Me Once turns it into a step-by-step tour your parent can follow alone: their real screens, a glowing spotlight on what to tap, big text, and each step read aloud.

Built for the Devpost *Build With AI: Basics* hackathon. The plan lives in [`devpost/scope.md`](devpost/scope.md), [`devpost/prd.md`](devpost/prd.md) and [`devpost/spec.md`](devpost/spec.md).

## How it works

1. **Create** — the helper picks a screen recording (3–90 s) and names the task. The browser pulls a frame every half second, drops look-alikes, and keeps at most 24. The video never leaves the device.
2. **Build** — frames go to a private Supabase bucket; the server sends them to Claude (vision + structured outputs). Our own zod checks catch what a schema can't (a frame that doesn't exist, a box off the screen, the word "click") and retry once.
3. **Review** — the helper checks each step and publishes.
4. **Learn** — the parent opens the link: Start, then a dimmed screenshot with a pulsing spotlight, a big instruction, voice, and "Got it, next".

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres + private Storage) · Anthropic Claude API (`claude-sonnet-5-5`) · Vercel.

## Run it locally

Requirements: Node 22+, a Supabase project, an Anthropic API key.

1. **Install**
   ```bash
   npm install
   ```
2. **Environment** — copy `.env.example` to `.env.local` and fill in:

   | Variable | Where to find it | Secret? |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | yes, server only |
   | `ANTHROPIC_MODEL` | optional; defaults to `claude-sonnet-5-5` | no |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | no |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable (`sb_publishable_…`) or legacy anon key | no — it can read nothing |
   | `SUPABASE_SECRET_KEY` | secret (`sb_secret_…`) or legacy service_role key | yes, server only |

3. **Database** — in Supabase, open **SQL Editor → New query**, paste [`supabase/schema.sql`](supabase/schema.sql), and run it. Then check the setup (prints no secrets, creates the private bucket if it's missing):
   ```bash
   node --env-file=.env.local scripts/check-supabase.mjs
   ```
4. **Start**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

5. **Tests** (the AI meaning-checks and frame selection)
   ```bash
   npm test
   ```

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **Add New → Project**, import the repo (framework: Next.js, defaults are fine).
3. Add the five environment variables above for **Production** and **Preview**.
4. Deploy. Keep **Fluid Compute** on (the default) — the build route sets `maxDuration = 120`, within every plan's limit.

To try it on phones, open the deployed URL; phones can't reach `localhost`.

## Privacy

- Nothing in Supabase is readable from the browser: RLS is on with no public policies and the bucket is private. All reads and writes go through server routes.
- Each guide has a random edit key. Only its SHA-256 hash is stored; the helper's browser keeps the key in the review link's `#fragment` and in localStorage.
- Tour links are unguessable UUIDs; screenshot links are signed and expire after an hour (the tour quietly refreshes them).
- The create screen asks helpers not to record passwords, PINs or balances, and Claude flags sensitive screens for review.

## Known limits (proof of concept)

- No accounts: lose the review link and its key, and the guide can't be edited.
- No rate limiting on guide creation; each build costs about $0.05 of Claude credit.
- HEVC recordings (newer iPhones) only decode in browsers that support HEVC — Safari does; some Android and Linux browsers don't, and get a friendly "use screenshots instead" message.
