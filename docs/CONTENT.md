# Authoring & reviewing content

## Scene format (`src/content/scenes/<id>.json`)

Each step is one NPC line followed by one learner line, both templated:

```json
{
  "npc": { "th": "{HI} รับอะไรดี{Q}", "rom": "{HI} ráp à-rai dii {Q}", "en": "Hello! What can I get you?" },
  "prompt": "Greet them and order one bowl of khao soi.",
  "you": { "th": "{HI} {I}ขอข้าวซอยหนึ่งชาม{P}", "rom": "…", "en": "…" }
}
```

Slots: `{I}` self pronoun · `{YOU}` address term · `{P}` statement particle · `{Q}` question particle ·
`{HI}` greeting · lexicon slots from `src/lib/register/tables.ts` (`CENTRAL_LEXICON`): `{eat}` `{delicious}` `{not}` `{much}`
`{what}` `{where}` `{gowhere}` `{howmuch}` `{mai}` (yes/no particle: ไหม) `{speak}` `{market}` `{fun}`.
A scene may set `regions` (only offered there) and `relationships` (only for those).
Every scene is rendered for all 2×2×5×7 setups (gender × gender × relationship × region) in `engine.test.ts`; unresolved slots fail the test.

## Review checklist for the Thai reviewer

1. `src/lib/register/tables.ts` — pronoun / address / particle tables (are the defaults natural per relationship?).
2. Chiang Mai overrides — `เจ้า` as the polite particle for both genders, and the lexicon entries.
3. Each scene — naturalness, romanization tone marks. Set `"reviewed": true` when signed off.

## Regions (`src/content/regions/*.json`)

Each region is a *pack*: it overrides only what really differs from Central Thai — vocabulary (`lexicon`), polite/casual
`particles`, and `pronouns` — plus an `accentHint` for the audio and a `sample` line for the admin audition.

| id | Kind | What changes |
|---|---|---|
| `bangkok` | standard | Central Thai (reviewed) |
| `chiangmai` | dialect | Northern (Kham Mueang): women เจ้า / men ครับ, ก่อ, กิ๋น, ลำ, อู้, กาด, เฮา, อ้าย/ปี้ … |
| `isan` | dialect | ข่อย/เจ้า, เด้อ, บ่, แซ่บ, เว้า, อ้าย/เอื้อย … |
| `south` | dialect | หรอย, แหลง, ม่าย, จังหู้, หลาด, หนไหน … |
| `phuket` | dialect | Southern vocabulary; softer, slower accent |
| `east`, `west` | accent only | Central vocabulary; regional accent only |

Everything is a **draft** (`"reviewed": false`) built from public sources (Wikipedia, ThaiPod101, Centara, The Thailand Life,
The Thaiger). Dialect romanization is approximate because dialect tones differ from Central Thai. Ask a speaker of each dialect to
check the `notes`, `lexicon`, `particles` and `pronouns` in the pack, then set `"reviewed": true`.

### Audio for dialects
Voices speak Central Thai pronunciation by default and the UI shows a "Central pronunciation ⓘ" label. On `/admin` each region can be
switched to **accent hint**: the region's `accentHint` is added to Gemini's `speech_metadata.style` (the label then reads
"AI-approximated accent"). In a blind test a judge model heard the hint change the accent, but accent quality must be judged by native
speakers. Style text is part of the cache key, so switching modes never reuses the other mode's audio.

## English course for Thai speakers (`src/content/english/*.json`, `src/content/accents/*.json`)

The language switch (header, or the first-visit picker) sets the learner's own language. **Thai UI = learning English**, English UI = learning Thai. The choice lives in the `bt_native` cookie and, when signed in, in `learner_profiles.native`.

An English scene has the same shape idea as a Thai one, but no register engine: English has no gendered particles, so the setup is **formality** (`casual` / `neutral` / `formal` — friend, everyday, boss/customer) and **accent** (`us` / `uk` / `au`). Gender only picks the voice.

```jsonc
{
  "id": "en-coffee-shop", "course": "en",
  "title": "สั่งกาแฟ", "titleEn": "Ordering coffee", "blurb": "…", "emoji": "☕", "reviewed": false,
  "steps": [{
    "npc": { "casual": {"en": "{Hello}! What can I get you?", "th": "…"}, "neutral": {…}, "formal": {…} },
    "prompt": "สั่งลาเต้หนึ่งแก้ว อย่างสุภาพ",          // Thai instruction
    "you":  { "casual": {…}, "neutral": {…}, "formal": {…} },   // the correct answer; only `neutral` is required
    "wrong": [{ "en": "Give me latte.", "th": "…", "why": "Thai explanation", "formality": ["neutral","formal"] }],
    "tip": "Thai tip shown after a correct answer"
  }]
}
```

- Each step shows the correct line plus up to 3 `wrong` lines (typical Thai-speaker mistakes: missing verb/article/plural, word order, literal translations). `formality` on a wrong line limits it to those formalities; those register slips are preferred over generic ones. Write at least 3 applicable wrong lines per formality (a test enforces 4 distinct choices).
- `{slot}` placeholders are filled from the accent pack (`{Slot}` capitalises). Slots differ between accents (`elevator`/`lift`, `bill`/`check`, `$4.50`/`£3.80`…). Every slot needs a value in **all three** accent JSONs and a Thai meaning in `SLOT_MEANING` (`src/lib/accents.ts`); the scene-complete screen lists the ones that differ.
- Audio: `/api/tts?…&accent=us|uk|au`. The accent prompt (`accentHint` in the accent JSON) is added to the voice style, so each accent has its own clips (build them with `npx tsx scripts/build-audio.ts --lang en --accent us`). Learners see an "AI voice" note.
- Everything is `reviewed: false` until an English-fluent reviewer has checked it.
