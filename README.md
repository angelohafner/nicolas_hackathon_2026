# ARTEMIS II: LUNAR ODYSSEY — Nicolas Mission Control

**Language:** American English (en-US)  
**Team module:** Mission Director — Mission Briefing, Pre-Launch Diagnostics, and Mission Debriefing.

This repository contains **Nicolas's part** of the student-led educational Artemis II game. It does not replace the work of the other participants or represent an official NASA application.

## Play the standalone demo

1. Open [`index.html`](index.html) with Chrome or Edge. The graphics, controls, gameplay demonstration, rules, and captions work without a server or internet access.
2. Explore the **Mission Briefing** phases and the four engineering-resource topics.
3. Open the pre-launch checklist and choose **RUN PRE-LAUNCH DIAGNOSTICS**. Five independent checks run sequentially, announce their status, and produce a **GO/NO-GO** outcome.
4. Fix any critical issues, repeat the diagnostics, then choose **AUTHORIZE LAUNCH**. Listen to the spoken Mission Control call and ten-second countdown.
5. Continue through the simplified three-phase **DEMO FLIGHT** and review medals, crew status, and historical NASA facts in the **Mission Debriefing**.

**Optional voice:** The browser Web Speech API (`speechSynthesis`) requests an en-US voice. Offline narration needs a voice installed locally; captions remain available when no voice is installed. Use the in-app voice and mute controls.

> The **CML 4 checklist** is an educational adaptation. NASA's "Concept Maturity Level 4" is not a real launch clearance. Mass, energy, fuel, data and reentry limits are simplified game parameters, not NASA flight-qualification thresholds.

## Project structure

| Location | What it contains |
| --- | --- |
| `index.html` | **Current standalone v2.1 / en-US** mission-control experience (includes all required assets) |
| `standalone/` | Legacy offline base and the enhancement CSS/JS used by the standalone build |
| `tools/build_standalone.py` | Regenerates `index.html` from standalone source files |
| `docs/QUICK_START_EN_US.md` | Demonstration plan for Nicolas |
| `docs/INTEGRATION_CONTRACT_EN_US.md` | `window.ArtemisNicolas` integration API for the team's engine |
| `docs/TEST_REPORT_EN_US.md` | Browser-test scope and current limitations |
| `tests/mission-director-browser-test.py` | Standalone browser regression tests |
| `src/` | Earlier React + TypeScript / Three.js prototype for future team integration |
| `tests/missionRules.test.ts` | React-prototype rule-unit tests |

### Standalone HTML rebuild

```bash
python tools/build_standalone.py
```

The standalone HTML is the **feature-complete en-US demonstration**. The React/TypeScript code in `src/` is an **earlier integration scaffold** and is *not yet at feature parity* with the latest standalone UI, narration, or diagnostics. Avoid deploying the Vite build in place of the standalone demo until the enhancements have been ported and validated.

### Run the standalone tests

```bash
npm run test:offline
python -m pip install playwright
python -m playwright install chromium
npm run test:browser
npm run test:narration
```

The Node structural test runs without an npm install. The two Python browser tests require Playwright and Chromium. Every test resolves files relative to the repository root; no `/mnt/data/` path is hardcoded.

### React prototype (optional)

```bash
npm install
npm run dev
npm test
```

This frontend uses React, TypeScript, Vite, Three.js, and React Three Fiber. `npm run build` builds the earlier React prototype, not the latest en-US standalone experience.

## Integration boundaries

Nicolas owns the Mission Briefing, pre-launch UI and safety gate, and final debriefing UI. The other teammates own spacecraft selection, mathematical physics, trajectories, 3D craft, and flight-event mechanics. The integration contract is documented in [`docs/INTEGRATION_CONTRACT_EN_US.md`](docs/INTEGRATION_CONTRACT_EN_US.md).

The standalone page exposes `window.ArtemisNicolas.setShipSnapshot(...)`, `getReadiness()`, `openBriefing()`, `openChecklist()`, `setMissionResult(...)`, and `getReport()`. Updating the spacecraft state invalidates earlier diagnostic approval.

## Improvements in v2.1

- Strict atomic validation for spacecraft snapshots: range checks, finite numbers, strict boolean flags, and transmitted science data not exceeding collected data. Invalid inputs cancel launch authorization and show an error.
- The pre-launch electrical requirement is **positive net power** and battery charge above zero. Negative/zero net power is a critical RED, rather than an optional YELLOW.
- A **4 GREEN / 1 noncritical failure** authorizes GO WITH CAUTION but never announces that every station passed. A communications failure warns that data will remain buffered.
- Each check shows an active visual row during narration and changes its status only after the spoken or caption-only step completes. Countdown numbers are not clipped when the installed voice is slow.
- Phase selection moves the Earth/Moon visual emphasis *before* narrating that phase. Flight handoff announcements reference the destination visual scene, and the final comparison explicitly separates game metrics from real NASA history.
- Turning the voice on/off during diagnostics or countdown does not freeze the state machine. Captions remain available without any installed voice. Audio output quality still requires a manual test on the presentation computer.
- The educational disclaimer is always visible in CML 4 even when educational tips are disabled.

## Tests and provenance

The supplied test report records 85/85 browser regression checks, 46/46 narration/visual checks and 10/10 offline structural checks for the standalone demo. Speech audio *quality* has not been verified acoustically; voice selection depends on the browser and local operating system. The 3D backdrop is a pre-rendered illustration until the team integrates its separate 3D scene. The three-phase demo is not yet connected to the other team's game engine.

Artemis II was a crewed lunar flyby rather than a Moon landing. NASA source materials: [Artemis II mission](https://www.nasa.gov/mission/artemis-ii/) and [NASA Mission Design Center](https://www.nasa.gov/ames-engineering/spaceflight-division/mission-design-center/about-our-studies/).

To publish the standalone game with **GitHub Pages**, configure the repository's Pages source to deploy from `main` → `/ (root)`; `index.html` is already in the correct location.
