# Little Bangkok game work

User authorized a Phaser isometric game, separate branch, first-commit PR, incremental commits with each improvement, browser screenshots, and independent subagent ratings of fun, educational value, and desire to return. Keep iterating towards an honest 9/10; never ask the reviewer to inflate scores. Do not merge.

- Repo: /workspace/bridge-thai
- Branch: feat/neighbourhood-adventure
- Route: /adventure (Thai learning game; original bilingual lessons preserved)
- Main engine: src/components/adventure/createWorld.ts (Phaser 4, procedural original artwork)
- UI: src/components/adventure/Adventure.tsx; route styles in src/app/adventure/adventure.css
- Content: existing reviewed:false scene templates, rendered by existing register engine for three NPCs and both speaking styles.
- Saves: versioned localStorage with one-time rewards; signed-in scene completions also use existing action. Cross-device adventure persistence not implemented.
- Build checks: npm run lint, npm run typecheck, npm test, npm run build
- npm cache must be /tmp/bridge-npm (default home cache unwritable).
- Dev: npm run dev -- --hostname 0.0.0.0; currently port 3000.
- Browser skill applied. agent-browser installed via npm exec --cache /tmp/bridge-npm --yes --package=agent-browser -- agent-browser.
- Use AGENT_BROWSER_SOCKET_DIR=/tmp/bridge-browser and --config /tmp/bridge-browser.json. Config uses /usr/bin/chromium, --no-sandbox, local proxy bypass, and the environment-proxy CA certificate. No credential values stored.
- Screenshots currently /tmp/bridge-desktop-v1.png and /tmp/bridge-first.png.
- Automation 6abfd97040048191a38e2173f812357d: repeats every 315 minutes beginning 2026-10-03 02:30 Asia/Kuala_Lumpur. Pause at completion. Do not assume quota reset.

## Review history

First playable build ready for independent evaluation. No rating yet. First version: three conversations, keepsakes, three word discoveries, picnic recall quiz, movement/pathfinding, replay stars, device saves, central Thai prepared audio. Known product gaps to evaluate: shallow branching/world consequences, short replay loop, coins have no use yet, first arrival can obscure much of map, small desktop text, mobile canvas readability.

## Iteration 2

Independent review v1: overall 6.5; fun 6.5, education 7, desire to return 5, visuals 8. Reviewer played initial Mali dialogue and checked mobile; other conclusions source-derived. Main gaps: no tangible task consequences, valid polite speech graded wrong, static replay, unused coins, no visible ending, mobile map small. Concrete movement/save defects also identified.

Implemented: accepted polite alternatives with nuanced explanations; intent distractors and two valid breakfast dishes; spice and baht-payment activities; wallet debits once; food/scarf visibly appear; three spendable world decorations; sunset overlay and friends at picnic; adaptive mixed listening/response/phrase-building practice with first-recall rewards; queued movement replaced by cancel-and-retarget; player label moves; mobile zoom and fixed location controls; filtered unknown discovery IDs.

Validation: 47 unit tests, lint and typecheck; browser journey scripts/verify-adventure.ts covers all three missions, wrong-answer recovery, spice, payments, wallet, six-round picnic, all decorations, sunset, mobile zoom, no page errors. Pass a local browser CDP URL to npx tsx scripts/verify-adventure.ts. Screenshots /tmp/bridge-world-v2.png, /tmp/bridge-mobile-v2.png. Independent second review pending. Do not claim 9 until reviewed.

## Iteration 3

Independent review v2: overall 8.0; fun 8.0, educational design 8.2, return 7.8, visuals 8.3. Reviewer live-tested breakfast, spice error, underpayment, collection and mixed practice. Blockers: hidden-space duplicate particles; rice continuity; cropped mobile zoom without affordance; practice lacked spatial purpose; mastery invisible.

Implemented fixes and five spoken neighbourhood errands: receive request, choose source, walk, select correct item, count customer-funded baht, carry it on the player, deliver to the correct neighbour, collect a unique postcard. Later independence upgrades the reward without farming. Visible phrase confidence/modes, next-goal guidance, mastery-gated koi reward, centred mobile zoom/pan controls. Existing audio playback incorrectly required generation keys; fixed with credential-free identity of shipped recordings while generation continues to require credentials.

Validation: 52 unit tests; five-errand browser journey including wrong stall/item recovery, payments, visible carry/delivery, unique postcards and unchanged personal wallet; mixed practice browser test with duplicate particle/space normalization; all adventure lines resolve to real MP3 files for both speaking styles, and browser decode/play verified without synthesis credentials. New tests/scripts are committed with this iteration. Screenshots docs/game-screenshots and /tmp/bridge-*v3.png. Third independent review: overall 8.7, fun 8.8, education 8.6, return 8.6, visuals 8.5. Remaining blockers: payment answer disclosed by supplied funds; wrong payments not counted against independence. No honest 9 yet.

## Iteration 4 — target reached

Independent live review: overall 9.0/10 for the playable first chapter; fun 9.0, educational design 9.1, desire to return 8.9. Reviewer deliberately underpaid, counted remaining customer funds, delivered, and confirmed no independent credit. This is a prototype design assessment, not measured retention.

Fixed: hidden payment amount until clue/success; fixed ฿200 customer budget; count and return remaining money; payment/change mistakes invalidate independent success. Gift errand labels its actual goal (agreed price), without naming the item before a clue. After five favours use natural-pace prepared audio and alternate market quotes of ฿180/฿200.

Validation: 53 unit tests, lint and typecheck pass. Final five-errand browser journey passes, including hidden price, change counting, incorrect-payment independence, wallet preservation and mobile pan. All adventure speech resolves to MP3 at both paces and speaking styles; actual natural-speed browser playback passes. Isolated production build passes. Resume automation paused after reaching the target. PR remains open with green Vercel checks. No merge authorized. Remaining nonblocking work: native Thai review, real beginner playtests, expanded neighbourhood/story content, cross-device adventure saves.

## Expansion — mobile first and a single game interface

User added: ease of understanding/getting started (target9), all original scenarios, more content, bigger world, hidden surprises, simpler mobile UI, and retirement of the old text-only learning UI. Root and legacy learning routes now lead into /adventure; old /play/[id] links open the matching in-game encounter. The new Atlas is the main interface. Existing language, prepared audio, server progress actions and completion records are reused; old three-mission device saves are imported.

Implemented: five connected storybook districts, all17Thai+6English scenarios, seven linked stories, ten spatial secrets with distinct map transformations, compact native dialog sheets, focused next-task card, pronunciation/clue scaffolding, six-card adaptive listen/respond/build practice over completed content, original cooking/payment/change and delivery loops, spendable cosmetics. Progress is in bt_atlas_v1; prior bt_adventure_v1 is retained and imported.

Expansion review1: overall8.9, fun8.9, education9.0, return8.8, ease9.0. Live first mission, coast/turtle surprise, Englishcoffee and all mixed-practice modes; mobile390/320nooverflow. Remaining fixes: contextual local recommendation on district change, visible pronunciation, stable instruction-language preference. Unit58pass; browser17Thai scenarios complete, English test expected a different localized heading and is being corrected. Keep working until the expanded scope reaches an honest9 overall with ease>=9. Resume schedule still paused from previous target; current run is actively finishing.
