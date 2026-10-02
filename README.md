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

## Little Bangkok & beyond

The app now opens directly into **`/adventure`**, a mobile-first Phaser 4 learning game. Five connected storybook districts cover every original scenario: **17 Thai and six English**. Two additional six-step rehearsal encounters combine prepared phrases into a picnic-host workshop and a visitor’s first afternoon. Nine linked stories, ten hidden surprises, adaptive mixed practice, cooking, customer-funded payments and change, carried deliveries, and cosmetic rewards support exploration and revisits.

The initial screen shows the map and one nearby next task. Menus and dialogue open in focused sheets; pronunciation is visible and meanings are optional clues. Menu language is independent of the course. All older home and lesson URLs lead into the game; `/play/[id]` opens the matching encounter rather than the retired text-only interface.

Artwork is original procedural Phaser graphics; the engine uses the free MIT license and loads only on the game route. Players can drag, zoom and pan the map, or use accessible Places/Go controls. Reduced-motion preferences disable ambient animations. Native modal sheets suspend map input, so dialogue taps cannot accidentally open other characters.

World saves are versioned and device-local. Existing signed-in scene completions also sync through the existing action and are imported into the passport, as are earlier three-mission device records. New rehearsal progress is device-local. Prepared audio playback requires no generation credentials. All language content remains a draft pending native-speaker review.

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. `npx tsx scripts/verify-atlas.ts` launches Chromium and checks the complete current game; `GAME_URL` can target a local production server. It covers all 25 encounters, recall, audio, spatial surprises, practice, cosmetics, mobile layout, saved progress and old-link redirects. Chromium defaults to `/usr/bin/chromium` in the managed workspace and preserves the network proxy with local bypass. Older `verify-adventure*.ts` scripts record the superseded first-chapter UI and are historical checks. Independent ratings and screenshot references are in `docs/GAME-RESUME.md`.
