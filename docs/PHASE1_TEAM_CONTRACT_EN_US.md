# Phase 1 — Official Team State / Integration Contract (en-US)

Child 2 owns **one canonical mission state**, all calculations, validation, maneuver transactions, resource transitions and history. Nicolas (Child 1) presents the UI and dispatches requested actions; Child 3 provides trajectory/Phase 2 scenes, and Child 4 supplies component selection and 3D Orion. **Do not calculate physics twice.**

## Required methods

```js
window.ArtemisNicolasPhase1.connectEngine(teamEngine);
window.ArtemisNicolasPhase1.refreshFromEngine();
const state=window.ArtemisNicolasPhase1.getMissionState();
const readiness=window.ArtemisNicolasPhase1.getStatus();
const preview=window.ArtemisNicolasPhase1.getGuidedBurnPreview(480);
const handoff=window.ArtemisNicolasPhase1.getPhase1Handoff(); // null until complete
```

The team engine must implement:
- `getState(): MissionState` — cloneable full state below.
- `evaluatePhase1(): {eligible:boolean,gates:Gate[],checklist:{items:ChecklistItem[]}}` — five authoritative GREEN/YELLOW/RED results and additional gates.
- `previewDepartureBurn({requestedDeltaVMps}): {allowed,requestedDeltaVMps,afterDeltaVMps,reason}` — pure, no mutation.
- `recordChecklistApproval({id,checklist,acknowledged})` — idempotent record in history.
- `commitDepartureBurn({actionId,requestedDeltaVMps})` — atomic, idempotent debit of maneuver Δv, official state/history update and receipt.
- `completePhase1({actionId})` — verify all requirements, record completion once, advance official phase to 2.
Optional: `onPhase1Complete(state)`, `setLearningMode(bool)`, `resetCampaign()`.

## Minimal canonical state shape

```js
{
 schemaVersion:'artemis-mission-state/1',
 phase:1,step:'assembly',learningMode:true,
 configuration:{parts:{tank:'standard',solar:'standard',shield:'basic',antenna:'sband',camera:'lunar'}},
 engineering:{
  maxMassKg:26500,totalMassKg:21880,
  budgetUsd:12000000,budgetSpentUsd:8280000,budgetRemainingUsd:3720000,
  generationWatts:120,consumptionWatts:90,netPowerWatts:30,
  eclipseDurationHours:6,eclipseLoadWatts:105,postEclipseReserveWh:240,
  departureBurnTargetMps:480,departureToleranceMps:20,
  minimumNextPhaseDeltaVMps:1700
 },
 resources:{
  maneuverReserveMps:3200,
  batteryCapacityWh:1600,batteryCurrentWh:1376,
  bufferCapacityMb:800,bufferCurrentMb:0,
  scienceCollectedMb:0,scienceTransmittedMb:0,scienceLostMb:0,
  shieldHealthPercent:100
 },
 safety:{crewSafe:true,essentialSystemsWorking:true,heatShieldInstalled:true,antennaActive:true},
 environment:{sunlit:true,communicationAvailable:true},
 history:[],completedPhases:[],departureReceipt:null
}
```

**Numbers are demo-game assumptions**, not Artemis II telemetry. Capacity and current quantity are separate. Battery Wh must cover the planned eclipse consumption **plus** reserve; solar output alone is insufficient. Radio blackout and eclipse are independent phenomena. Data remain buffered until transmitted or lost. The 26,500 kg limit is the full game ceiling, **not** a value subject to another 15% discount. Maneuver reserve is Δv in m/s, **not** fuel mass.

`evaluatePhase1` should return exactly five checklist items `{id,status,critical,label,value,detail}`, with `status` in `green|yellow|red`, plus hard gates for budget, mass, mandatory components, eclipse energy and reserve **after** the requested initial burn. Green score ≥4/5 and no critical red are necessary but **not sufficient** without the extra gates. Every yellow/noncritical-red finding requires explicit user acknowledgement.

`commitDepartureBurn` must use an idempotency key, subtract exactly once, reject off-target or resource-infeasible burns, and keep the entire state coherent. `completePhase1` records Phase 1 **before** enabling Phase 2. Handoff exports components, mass/budget, battery current and capacity, shield, buffer, science counters, event history, learning mode, last burn receipt, residual Δv and current mission phase.

After Phase 3, call `window.ArtemisNicolas.setMissionResult({phaseIndex:3,ship,history})` with three ordered phase summary records. Phase 1 record must agree with the committed burn receipt. The final report is derived from actual official mission outcomes and separates game metrics from real NASA historical facts.

English speech captions follow the active visual scene. The diagnostic row appears before its spoken check; countdown digits do not advance until utterance completion (or caption-only fallback); the burn's final result is narrated after its visual display. Real audio quality requires manual testing.


## Independent v3.1 audit safeguards

- The five-system demo checklist, any yellow/noncritical-red acknowledgements and all hard gates are revalidated by the engineering adapter when approval is recorded, not only by the HTML button state.
- A configuration/resources fingerprint ties approval to the exact inspected spacecraft. Changing a component or engineering snapshot revokes that approval.
- A completed terminal countdown is recorded as liftoff before a demo departure burn can be committed. The Child 2 engine should enforce this same rule independently; it may expose an optional recordLiftoff({actionId}) callback.
- The departure burn is idempotent: the debit occurs once, and Phase 1 completion checks the receipt and the remaining minimum reserve.
- Direct demo state changes and replacing the engine are blocked after the relevant launch milestones.
- Canonical external snapshots reject invalid battery/buffer quantities, inconsistent budgets/science counters, duplicate departure events and out-of-order phase progression.
- In connected team mode the final report requires recorded Phase 3 completion and final resources/safety matching the official state.
- Narration, caption and visual burn progress are synchronized; visual progress starts during spoken maneuver guidance, while completion waits for both presentation and utterance completion.

The checks protect the educational interface; official mission physics, 3D assembly, lunar events and reentry remain the responsibilities of the other children.
