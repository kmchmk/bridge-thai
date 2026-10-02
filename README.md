# 🌉 Bridge Thai

Learn Thai by role-play. Thai changes with **who is speaking, who is listening, how they relate, and where you are** — so you pick that setup first, then play through scenes where the NPC reacts to whether your register is right.

**Stack:** Next.js 16 (App Router) · Neon Postgres + Drizzle · Clerk auth · pre-generated static audio (MP3) · deployed on Vercel.

## How it works

- `src/lib/register/` — the **register engine**. Content is authored once as templates
  (`"{HI} {I}ขอน้ำ{P}"`); the engine fills pronouns (`{I}`, `{YOU}`), particles (`{P}`, `{Q}`), greetings and
  regional vocabulary (`{eat}`, `{delicious}`…) for the chosen setup. NPC lines are rendered with roles reversed.
  Wrong answers are generated from the same template (too casual / too stiff / wrong gender).
- **Two courses, one switch.** English speakers learn Thai (English UI); Thai speakers learn English (Thai UI, US/UK/AU accents,
  formality instead of gendered register). `src/lib/i18n.ts` holds the UI text, `src/lib/english.ts` the English scene engine,
  `src/content/english/` + `src/content/accents/` the content. See `docs/CONTENT.md`.
- `src/content/scenes/*.json` — scenes (Thai + romanization + English). Validated with zod in `src/lib/content.ts`.
- **Audio ships with the app.** Every line's audio is generated ahead of time (Gemini TTS via OpenRouter → PCM → MP3, ~6 KB/s)
  by `npx tsx scripts/build-audio.ts` (Thai) and `… --lang en --accent us|uk|au` (English), and committed to
  `public/audio/tts/<hash>.mp3` (the hash covers text + voice + style, so a clip only matches the voices it was made for).
  `src/lib/tts/static-clips.json` lists the hashes. `/api/tts` redirects to the file; `/api/tts/manifest` lists a learner's
  clips and the browser saves them in IndexedDB (`src/lib/tts/offline.ts`) so taps play instantly, even offline.
  Voices/pace are fixed in `src/lib/tts/settings.ts` (Sadaltager, Aoede, Natural). To change them, edit that file and
  rebuild the clips (cost ≈ $0.0006 per clip; Thai ≈ 2,000 clips, English ≈ 500 per accent). The admin page only auditions voices.
- `src/lib/tts/` — provider seam (`provider.ts`), content hash (`hash.ts`), allow-list of speakable lines (`allowlist.ts`).
- `src/db/schema.ts` — `learner_profiles`, `scene_progress` (`tts_cache` and `app_settings` are legacy and unused). Migrations in `drizzle/`.

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

## Little Bangkok adventure

Visit **`/adventure`** for a Phaser 4 isometric Thai-learning game. The original bilingual lessons remain available. The game includes three connected conversations, two valid breakfast dishes, spice and baht-payment activities, a picnic, five spoken delivery errands with customer-funded payment and change, harder natural-speed replay, mixed listening/response/phrase-building practice, a pocket journal, and world decorations unlocked with earned coins and independent recall.

Artwork is original procedural Phaser graphics; no external art service or paid game engine is required. Phaser uses the MIT license. The engine loads only on the adventure route. Touch players can zoom and pan the map and use fixed location controls; keyboard players can focus the canvas and use arrow keys. Reduced-motion preferences disable ambient movement.

Adventure saves are versioned and device-local. Completed signed-in scenes also use the existing scene-progress action. Cloud synthesis credentials are needed to **generate** new audio, but **playback of committed recordings does not require them**. The learning content is still a draft pending native-speaker review.

Browser journey checks in `scripts/verify-adventure*.ts` take a local Chromium CDP URL after starting the app. They cover missions, payments, errands, phrase assembly, mobile layout, and actual MP3 playback. Screenshots and independent-review progress are in `docs/GAME-RESUME.md`.
