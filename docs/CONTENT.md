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
