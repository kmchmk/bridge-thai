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
