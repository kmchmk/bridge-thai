# Scenario text audit — 3 October 2026

Reviewed all 23 authored scenarios (68 Thai exchanges and 24 English exchanges), including NPC sentences, learner tasks, intended answers, distractors, translations, pronunciation guides and feedback. Also inspected the two generated rehearsals, connected picnic, three introductory missions and five delivery errands that reuse these exchanges.

This is an AI linguistic and consistency review, not native-speaker certification. Existing native-review flags remain unchanged. Regional substitutions and approximate romanization still need a native dialect speaker's signoff; passing structural checks does not establish dialect authenticity.

## Scenario findings

| Scenario | Review outcome / correction |
| --- | --- |
| First hello (Thai) | Repair the conversational sequence: NPC answers the wellbeing question and introduces “nice to meet you”; learner replies “nice to meet you too.” Accept polite speech to a friend. |
| Noodle stall | Make “not too spicy” an explicit request; make refusal mean “no more”; correct khao soi romanization. Fix rice branch so the tasting question refers to the selected meal at the correct turn. |
| Market haggling | No text correction identified in the four exchanges. |
| Restaurant (Thai) | Make the spice request and refusal explicit; ask whether the food is good using อร่อยไหม rather than กินอร่อยไหม. |
| Introduce yourself | No text correction identified in the four exchanges; shared polite-friend acceptance applies. |
| Directions (Thai) | Add อยู่ to the toilet-location question and its pronunciation guide. |
| Taxi | No text correction identified in the four exchanges. |
| Hotel check-in (Thai) | No text correction identified in the four exchanges. |
| Pharmacy | Replace an unspecified medicine's fixed dosage instruction with “Please read the directions on the label first.” Keep translation and romanization aligned. |
| Emergency | No text correction identified in the four exchanges. |
| Floating market | No text correction identified in the four exchanges. |
| Meet the parents | No text correction identified in the four exchanges. |
| Songthaew | Correct the pronunciation guide for Warorot (วโรรส). |
| Som tam | No text correction identified in the four exchanges. |
| Fruit market | Add the missing baht unit to the quoted per-kilo price, translation and pronunciation guide. |
| Seafood market | Remove the duplicated ให้ in the cleaning offer and pronunciation guide. |
| Island ferry | No text correction identified in the four exchanges. |
| First hello (English) | Replace valid informal/formal replies used as wrong answers; align the casual origin/residence answer with its task. Clarify that natural fragments can be valid. |
| Coffee shop | Stop rejecting “One latte” and “Cold coffee, please.” Use clear drink, quantity, temperature or payment mismatches; explain them as task mismatches. Remove a gender-specific Thai pronoun from a gender-independent translation. |
| Restaurant (English) | Stop treating valid party-size and water replies as grammar errors. Make distractors unambiguously differ from the requested order; include grilled chicken in every correct formality variant. Clarify bill/check feedback. |
| Directions (English) | Replace valid abbreviated confirmation and location questions used as wrong answers. Distinguish asking for repetition from confirming the specified route. |
| Hotel (English) | Replace valid check-in/passport responses and breakfast echo questions used as wrong answers. Clarify feedback about “the breakfast.” |
| Shopping (English) | Replace valid browsing, price and try-on replies used as wrong answers. Improve the formal smaller-size request. |
| Picnic rehearsal | Reuses reviewed Thai exchanges; inherits source corrections and task-specific feedback. |
| Visitor workshop | Reuses reviewed English exchanges; ensure the English rehearsal instruction actually contains the English task. |

Every English exchange now supplies an explicit English task alongside its existing Thai task. Both the main conversation and practice UI select the instruction language correctly. This is necessary because a grammatically valid sentence can still miss a specific task, such as ordering two lattes when asked to order one. Feedback now makes that distinction instead of teaching a false grammar rule.

The connected picnic and delivery errands reuse these reviewed exchanges rather than maintaining separate answer banks. The three introductory missions likewise inherit source corrections. Their rice tasting branch is separately covered by a regression test.

## Validation and limits

- Type checking and lint pass.
- 67 of 68 unit tests pass, including four new regression tests for explicit tasks, valid alternative answers, distractors and dialogue ordering.
- The existing audio-completeness test remains unchanged and fails because revised sentences have no prepared clips yet. No audio was generated or modified.
- English source variants were checked across three formalities and three accents (216 exchange variants). Voice gender does not change English text.
- Thai render checks cover the seven regions, five relationship settings and both speaker/listener styles (9,520 exchange variants). These checks detect structural problems, not every linguistic nuance of a dialect.

## Audio handoff

Run the read-only export after any further text edits:

```sh
npx tsx scripts/audit-scenario-text.ts --out /tmp/scenario-text-audit.json
```

The output includes live rendered scenario texts and `missingAudio`, with each missing entry's text, language, speaker style, accent, pace, voice and expected hash. It does not fetch or synthesize audio. The current correction set needs **568 clip variants: 304 Thai and 264 English**; these are voice/pace/accent combinations, not 568 distinct sentences.

Generate the audio with your preferred workflow, update the prepared clip files and index, then run `npm test` again. The existing `scripts/build-audio.ts` remains available if you choose to use the project's generator. The draft PR should stay unmerged until audio coverage is restored or you explicitly decide to ship with runtime synthesis fallback.
