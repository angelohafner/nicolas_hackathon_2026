# ARTEMIS II: LUNAR ODYSSEY — Nicolas / Mission Director v3.0

**Language:** American English (`en-US`) · **Team role:** Child 1 — Mission Director.

The main offline deliverable is [index.html](index.html). Open it in Chrome or Edge. No network, CDN, npm installation or external images are required. Audio uses locally available en-US browser voices; captions remain available if no voice exists.

## Phase 1 sequence

1. **MISSION BRIEFING:** Explore the three phases, four resource rules and Flight Director Tips.
2. **ASSEMBLY (demo adapter):** Choose tank, solar panels, shield, antenna and camera; inspect live mass, budget, solar generation, net power, current/capacity battery (Wh), buffer (MB), shield and maneuver Δv (m/s).
3. **PRE-LAUNCH DIAGNOSTICS:** Run five sequential GREEN/YELLOW/RED checks. Authorization requires **at least 4 GREEN, zero critical RED, all five mandatory components, budget within limit, eclipse-survival battery energy and post-burn Δv reserve**. Every YELLOW and noncritical RED requires explicit **ACKNOWLEDGE RISK**.
4. **AUTHORIZE LAUNCH:** Spoken Mission Control clearance and abortable ten-second countdown.
5. **GUIDED DEPARTURE BURN:** Confirm the target maneuver and execute. The engineering engine commits exactly one delta-v debit and logs the decision.
6. **PHASE 1 HANDOFF:** Confirm completion only after the burn. Export the complete campaign state for Phase 2. A clearly labeled simulated Phase 2/3 demonstration remains available independently.

**Mass rule:** 26,500 kg is the **single fixed game ceiling**. A 15% margin must not be deducted again.

**CML 4 disclaimer:** NASA's real *Concept Maturity Level 4 — Point Design* is **not** an operational launch checklist. All game parameters are illustrative, not official NASA technical limits.

## Source and integration

- `standalone/phase1-v3.js` — Child 1 UI/orchestration plus clearly labeled mock Child 2 engine.
- `standalone/phase1-v3.css` — Phase 1 interface styling.
- `standalone/offline-enhancement.js` — existing voice, diagnostic and final debrief layers.
- `tools/build_standalone.py` — offline HTML builder.
- `docs/PHASE1_TEAM_CONTRACT_EN_US.md` — shared mission-state and Child 2 methods.
- `docs/PHASE1_IMPLEMENTATION_REPORT_EN_US.md` — test results and remaining integration dependencies.
- `src/` — **older React/TypeScript scaffold, not yet feature-equivalent to HTML v3**; do not deploy it instead of `index.html`.

In team mode, `window.ArtemisNicolasPhase1.connectEngine(engine)` connects the **single official Child 2 state**. Child 4 owns real 3D assembly, Child 3 owns Earth/Moon scene and Phase 2, and Child 5 owns reentry and splashdown. Nicolas owns flight instructions, readiness UI, approvals, guided-burn interface, handoff and final report. Do not duplicate their physics or events.

## Rebuild and verify

```bash
python tools/build_standalone.py
npm run test:offline
npm run test:browser
npm run test:cautions
npm run test:integration
npm run test:narration
```

Install Playwright and a Chromium browser for the Python tests. The browser suites use `page.set_content` to avoid sandboxes that prohibit local `file://` navigation. Acoustic voice quality must be tested on the competition computer.

## Historical and game boundaries

This is an educational experience, **not a NASA product**. Flight phases 2 and 3 remain demo stubs until teammates integrate their official modules. A pre-rendered spacecraft illustration is **not the Child 4 Three.js spacecraft**; the background is not a real WebGL orbital scene. Artemis II was a crewed lunar flyby without a Moon landing. [NASA mission page](https://www.nasa.gov/mission/artemis-ii/).
