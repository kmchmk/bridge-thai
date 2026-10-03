# Mobile layout review — 3 October 2026

The game stylesheet hid the main Sign in button. Restoring it revealed another problem: a separate branding row and title row consumed too much of a phone's screen. The mobile header now combines a 22px logo, compact game name and a quiet Sign in control in one row. The header’s interactive targets remain at least 44px tall. The course switch shares the district navigation row; the main page heading remains available to screen readers.

## Other issues found in screenshots

- Bottom navigation and the first activity's start button fell below the viewport. Navigation now stays visible, with space reserved so it does not cover the page. Short landscape layouts put the task beside the map.
- Map controls covered buildings and hidden surprises. They now occupy their own toolbar below the canvas. Zoom can fit a small viewport, and all ten surprises remain reachable.
- Thai NPC questions lacked the pronunciation guides already shown on replies. They are now visible in normal learning mode; the picnic's optional challenge still hides guides.
- Help appeared after a long list of replies. It now comes before the choices. Listening remains a separate control and never submits an answer.
- Long dialogs hid their close button, feedback and next action. Sheets now have a persistent close control, a scrollable body and a “More below” affordance when more content is available. Correct replies collapse unused choices, and feedback plus the next action scroll into view. New conversation turns start at the top.

## Screenshot evidence

These are viewport captures, not tall screenshots that conceal the need to scroll. Only the development framework's debug badge is suppressed in browser verification; application content is unchanged.

| View | Capture |
| --- | --- |
| Small phone, 320 × 568 | [Home](game-screenshots/mobile-review/home-320.png) |
| Phone, 390 × 844 | [Home](game-screenshots/mobile-review/home-390.png) |
| Landscape phone, 844 × 390 | [Home](game-screenshots/mobile-review/home-landscape.png) |
| Thai conversation and question pronunciation | [Conversation](game-screenshots/mobile-review/conversation-320.png) |
| Answer feedback and next action | [Feedback](game-screenshots/mobile-review/feedback-320.png) |
| English conversation | [English](game-screenshots/mobile-review/english-320.png) |
| Settings and persistent close control | [Settings](game-screenshots/mobile-review/settings-320.png) |
| Picnic entry | [Picnic](game-screenshots/mobile-review/picnic-320.png) |

## Verification

- Browser layout checks cover 320 × 568, 360 × 640, 390 × 844, 430 × 932, 844 × 390 and 1440 × 1000. They check signed-out account entry, mobile navigation, start action hit testing, Places, Stories, Passport, settings, picnic entry, dialog scrolling and horizontal overflow. A separate pass increases settings text to 24px.
- The 320px game regression completes all 25 encounters, including payment and recall; finds all ten hidden surprises; exercises all three practice modes; checks saved progress and legacy-route redirects. Screenshots are captured for every encounter and its first answer result.
- The picnic regression covers all six exchanges, pausing/reloading, optional challenge/help, final recall and returning-friend behavior.
- Type checking and lint pass. 70 unit tests pass. The unchanged prepared-audio coverage test still flags 1,096 missing clip variants for text changes already on main; audio generation remains with the owner.

Reproduce without generating or fetching audio:

```sh
npx tsx scripts/verify-mobile-layout.ts
GAME_TEXT_ONLY=1 GAME_WIDTH=320 GAME_HEIGHT=568 \
  GAME_SCREENSHOT_DIR=/tmp/mobile-complete npx tsx scripts/verify-atlas.ts
GAME_TEXT_ONLY=1 GAME_WIDTH=320 GAME_HEIGHT=568 npx tsx scripts/verify-picnic.ts
```

Verification uses Chromium viewport emulation. Physical iOS/Android browsers and authenticated account flows were not tested. Existing authentication and audio caching logic are unchanged. Long conversations remain scrollable instead of squeezing text and tap targets to fit every answer onto one screen.
