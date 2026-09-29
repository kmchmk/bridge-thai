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
`{HI}` greeting · lexicon slots (`{eat}`, `{delicious}`, `{not}`, `{much}`) from `src/lib/register/tables.ts`.
Every scene is rendered for all 2×2×5×2 setups in `engine.test.ts`; unresolved slots fail the test.

## Review checklist for the Thai reviewer

1. `src/lib/register/tables.ts` — pronoun / address / particle tables (are the defaults natural per relationship?).
2. Chiang Mai overrides — `เจ้า` as the polite particle for both genders, and the lexicon entries.
3. Each scene — naturalness, romanization tone marks. Set `"reviewed": true` when signed off.
