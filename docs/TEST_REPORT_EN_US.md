# Test Report — Nicolas Mission Control v2.1 (en-US)

**Test date:** November 14, 2026  
**Tested artifact:** Root `index.html`, regenerated with `python tools/build_standalone.py`.

## Executed checks

| Suite | Result | Method |
|---|---|---|
| `npm run test:offline` | **10/10 PASS** | Node.js structural and JavaScript-syntax test; confirms en-US, bundled images, offline dependencies and build paths |
| `npm run test:browser` | **85/85 PASS** | Playwright + Chromium: briefing, five sequential checks, positive power, critical failures, 4/5 caution, countdown, phase continuity, medals, NASA comparison, invalid-input blocking, locale, viewport widths |
| `npm run test:narration` | **46/46 PASS** | Synthetic en-US speech voice with controlled callbacks: phase/visual selection, check-by-check narration, countdown clipping prevention, mute continuity, abort and stale-callback cancellation |

**Total: 141 passing automated assertions.** No uncaught browser JavaScript exceptions in these checks.

## Findings fixed since the audit

1. Invalid spacecraft snapshots (negative mass, >100% battery, bad booleans, non-finite numeric values, and science-data inconsistencies) are rejected atomically, logged, and cancel any previous GO.
2. Zero/negative electrical power balance is a critical NO-GO; low but positive battery is YELLOW.
3. 4 GREEN plus communications RED produces **GO WITH CAUTION**, and the narrator never says that all stations have passed.
4. Checklist CML 4 educational disclaimer remains visible when tips are switched off.
5. Dynamic number formatting in range controls uses `en-US` (e.g., `26,500`).
6. Offline tests no longer rely on old root-level files or absolute `/mnt/data` paths.
7. Lesson selection changes the Earth/Moon visual emphasis first; spoken text and captions follow. Diagnostics and countdown wait for their current utterance to complete (with a silent fallback).
8. Final mission debrief includes a direct three-row comparison of simulated and historical outcomes.

## Manual verification still required

- Test actual sound output, pronunciation and speaker volume with an installed **en-US** speech voice in Chrome/Edge on the competition computer.
- Open the standalone HTML using a local `file://` URL on that computer and confirm browser voice permissions and all visual assets.
- Integrate the true Three.js Earth/Moon 3D scene from the teammate responsible for 3D. This independent Nicolas HTML deliberately retains pre-rendered textured spheres to preserve offline operation and project ownership boundaries.
- Test integration with the other teammates' final physics and scene data. The demo's flight sequence uses educational simulation data.

## Re-run

```bash
python tools/build_standalone.py
npm run test:offline
npm run test:browser
npm run test:narration
```

The Python browser suites require `playwright` and a Chromium executable. The Node suite has no external dependencies.
