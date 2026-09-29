# 🌉 Bridge Thai

Learn Thai by role-play. Thai changes with **who is speaking, who is listening, how they relate, and where you are** — so you pick that setup first, then play through scenes where the NPC reacts to whether your register is right.

**Stack:** Next.js 16 (App Router) · Neon Postgres + Drizzle · Clerk auth · Vercel Blob (cloud TTS cache) · deployed on Vercel.

## How it works

- `src/lib/register/` — the **register engine**. Content is authored once as templates
  (`"{HI} {I}ขอน้ำ{P}"`); the engine fills pronouns (`{I}`, `{YOU}`), particles (`{P}`, `{Q}`), greetings and
  regional vocabulary (`{eat}`, `{delicious}`…) for the chosen setup. NPC lines are rendered with roles reversed.
  Wrong answers are generated from the same template (too casual / too stiff / wrong gender).
- `src/content/scenes/*.json` — scenes (Thai + romanization + English). Validated with zod in `src/lib/content.ts`.
- `src/lib/tts/` — content-addressed audio cache (`sha256(provider, voice, text)` → Vercel Blob + `tts_cache` row).
  No cloud provider is wired yet (`getProvider()` returns `null`), so the app currently speaks with the browser's
  `speechSynthesis`.
- `src/db/schema.ts` — `tts_cache`, `learner_profiles`, `scene_progress`. Migrations in `drizzle/`.

## Develop

```bash
cp .env.example .env.local   # fill in DATABASE_URL and the Clerk keys
npm install
npm run db:migrate
npm run dev
npm test
```

## Content review

All scenes ship with `"reviewed": false` and show a "Draft" badge until a native speaker signs them off.
The Chiang Mai overrides (`เจ้า`, `กิ๋น`, `ลำ`, `บ่`, `หลาย`) especially need review. See `docs/CONTENT.md`.
