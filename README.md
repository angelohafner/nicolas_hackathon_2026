# ARTEMIS II: LUNAR ODYSSEY — Nicolas / Mission Director v3.1

**Official game language:** American English (`en-US`)  
**Scope:** Child 1 (Nicolas): Mission Briefing, Phase 1 operational sequence, five-system readiness/checklist, launch clearance, guided departure-burn user interaction, Phase 1 handoff, and final mission debriefing UI.  
**Repository:** `angelohafner/nicolas_hackathon_2026`

## Run the standalone educational demonstration

Open [**index.html**](index.html) directly in Chrome or Edge. Internet access and third-party scripts are not required for visuals, controls, rules or captions. English voice narration uses the browser's installed `speechSynthesis` voices; captions work even without an available voice. The game is **not official NASA software**.

1. Study the **Mission Briefing**, three mission phases, four educational resources, and optionally enable **Flight Director Tips**.
2. Select a tank, solar arrays, thermal shield, antenna and science camera in **Assembly**. The selectors and schematic are deliberately **demo placeholders** for the engineering catalog (Child 2) and true 3D spacecraft (Child 4); their values are not official NASA hardware data.
3. Monitor mass, budget, net power, current battery in Wh versus capacity in Wh, buffer occupancy and maneuver reserve Δv in m/s.
4. Run **RUN PRE-LAUNCH DIAGNOSTICS**. Five checks run sequentially with aligned captions, optional speech and GREEN/YELLOW/RED indicators. The game requires **at least 4/5 GREEN, no critical RED, all mandatory parts, budget ≤ limit, mass ≤ 26,500 kg, adequate eclipse energy and adequate post-burn maneuver reserve**. Yellow and noncritical RED findings require explicit **ACKNOWLEDGE RISK**.
5. After authorization and a narrated ten-second countdown, the player **must still execute the guided departure burn**. A valid burn command is committed exactly once by the engine; the reserve immediately decreases.
6. Confirm **PHASE 1 COMPLETE**. The UI exports the **full Phase 2 handoff JSON** and preserves the configured components, remaining budget, battery current/capacity, shield integrity, buffer data, telemetry, history and maneuver reserve. A simplified Phase 2/3 **demo only** can continue from that point while teammates build the real phases.
7. After a complete team campaign, Nicolas's **Mission Debriefing** displays crew safety, science, medals, decisions and an educational comparison to the real Artemis II.

> **Mass-rule interpretation:** 26,500 kg is the **single game hard ceiling**. Do not subtract another 15%. The previous optional 15% margin is not an additional authorization rule.
>
> **CML 4:** NASA's real term refers to *Concept Maturity Level 4 — Point Design*; the game uses the label only as an educational flight-director adaptation. Game mass, budget, eclipse consumption, Δv and entry thresholds are simplified game assumptions.

## Architecture and ownership

- **Nicolas (Child 1):** phases/briefings, readiness presentation, risk acknowledgement, launch authorization/voice, departure guidance and final results UI.
- **Child 2:** canonical mission state, component catalog, physics/resource calculations, official readiness, departure-burn preview/commit, idempotent resource updates and phase-completion event.
- **Child 4:** actual component selector and dynamic Orion 3D spacecraft/HUD.
- **Child 3:** initial Earth–Moon environment and trajectory plus the Phase 2 lunar flight scene.
- **Child 5:** Phase 3 approach, reentry and landing interactions.

**The integrated UI must not subtract Δv or recompute authoritative resource values.** In DEMO mode, a mock engine located in [`standalone/phase1-v3.js`](standalone/phase1-v3.js) implements the same transaction contract to make Nicolas's independent module testable.

### Integrate the real Child 2 rules engine

See [**PHASE1_TEAM_CONTRACT_EN_US.md**](docs/PHASE1_TEAM_CONTRACT_EN_US.md) for the complete state schema and `window.ArtemisNicolasPhase1.connectEngine(engine)` API. The existing `window.ArtemisNicolas` methods remain for the earlier briefing/debriefing interface.

The current **React/TypeScript files in `src/` are an older scaffolding** and do not yet reproduce the v3 HTML, narrated diagnostics or burn. The authoritative deliverable for Nicolas's part is the **standalone `index.html`**. The next team-integration sprint must port the UI, not silently substitute the older React build.

## Rebuild and test

```bash
python tools/build_standalone.py
npm run test:offline
npm run test:browser
npm run test:cautions
npm run test:integration
npm run test:narration
npm run test:audit
npm run test:responsive
```

Install Playwright and Chromium if necessary: `python -m pip install playwright` and `python -m playwright install chromium`. Browser tests are designed to load the HTML using `page.set_content()` to avoid sandbox restrictions on local `file://` navigation.

The earlier v2.1 tests remain in the repository as historical reference, but `test:browser` now targets the v3 Phase 1 workflow. See [**PHASE1_IMPLEMENTATION_REPORT_EN_US.md**](docs/PHASE1_IMPLEMENTATION_REPORT_EN_US.md).

## Scope exclusions

No solar-storm event, lunar exploration, actual 3D orbital physics, service-module separation, reentry minigame or parachute deployment was added to Nicolas's Phase 1. The offline Phase 2/3 **demo** is labeled separately and is not part of the other children's final deliverables.

Historical reference: [NASA Artemis II](https://www.nasa.gov/mission/artemis-ii/).

## Independent Phase 1 audit — v3.1

The [Phase 1 compliance audit](docs/FINAL_AUDIT_PHASE1_EN_US.md) checks every assigned Nicolas requirement, the revised Phase 1 completion gates, state continuity, narration/visual event order, and unsafe API paths.

Corrections include engine-side departure authorization, idempotent burn protection, liftoff recording, prohibition of post-burn demo resource edits, consistent fixed mass ceiling wording, canonical external engine state validation, and speech/visual synchronization for the maneuver. The navigation no longer duplicates step numbers.

**Status:** The self-contained Nicolas module is complete as an **offline demonstration**. The official Child 2 engine, Child 4 3D spacecraft, Child 3 trajectory/Phase 2, and Child 5 Phase 3 outcome still require integration. The legacy React scaffold under `src/` is not at parity and should not be used as the competition executable.
