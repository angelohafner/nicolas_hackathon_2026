import { describe, expect, it } from 'vitest';
import { checkLaunchReadiness, GAME_MASS_GREEN_KG, GAME_MASS_LIMIT_KG, INITIAL_SHIP } from '../src/lib/missionRules';
import { advanceDemoMission, createMissionReport, startDemoMission } from '../src/lib/demoMission';

describe('CML 4 educational pre-launch checklist', () => {
  it('approves a healthy spacecraft with five green checks', () => {
    const result = checkLaunchReadiness(INITIAL_SHIP);
    expect(result.greenCount).toBe(5);
    expect(result.approved).toBe(true);
  });
  it('requires at least 80% green', () => {
    const result = checkLaunchReadiness({ ...INITIAL_SHIP, totalMassKg: GAME_MASS_GREEN_KG + 10 });
    expect(result.greenCount).toBe(4);
    expect(result.approved).toBe(true);
  });
  it('blocks launch above the mass limit even if four other checks are green', () => {
    const result = checkLaunchReadiness({ ...INITIAL_SHIP, totalMassKg: GAME_MASS_LIMIT_KG + 1 });
    expect(result.greenCount).toBe(4);
    expect(result.redCriticalCount).toBe(1);
    expect(result.approved).toBe(false);
  });
  it('blocks launch when battery is empty', () => {
    const result = checkLaunchReadiness({ ...INITIAL_SHIP, batteryChargePercent: 0 });
    expect(result.approved).toBe(false);
  });
  it('blocks launch when the heat shield is missing', () => {
    const result = checkLaunchReadiness({ ...INITIAL_SHIP, heatShieldInstalled: false });
    expect(result.approved).toBe(false);
  });
  it('allows an antenna failure if all four critical checks remain green', () => {
    const result = checkLaunchReadiness({ ...INITIAL_SHIP, antennaActive: false });
    expect(result.greenCount).toBe(4);
    expect(result.redCriticalCount).toBe(0);
    expect(result.approved).toBe(true);
  });
});

describe('Mission demonstration and state continuity', () => {
  it('retains fuel and battery consumption between all three phases', () => {
    const first = advanceDemoMission(startDemoMission(INITIAL_SHIP));
    const second = advanceDemoMission(first);
    const third = advanceDemoMission(second);
    expect(first.phaseIndex).toBe(1);
    expect(second.phaseIndex).toBe(2);
    expect(third.phaseIndex).toBe(3);
    expect(first.ship.fuelRemainingDeltaV).toBeGreaterThan(second.ship.fuelRemainingDeltaV);
    expect(second.ship.fuelRemainingDeltaV).toBeGreaterThan(third.ship.fuelRemainingDeltaV);
    expect(second.ship.scienceDataCollectedMb).toBeGreaterThan(first.ship.scienceDataCollectedMb);
    expect(third.ship.crewSafe).toBe(true);
    expect(createMissionReport(third).medals.every(m => m.earned)).toBe(true);
  });
  it('flags unsafe reentry and does not award Safe Return', () => {
    let mission = startDemoMission({ ...INITIAL_SHIP, reentryAngleDeg: 8 });
    for (let i = 0; i < 3; i++) mission = advanceDemoMission(mission);
    expect(mission.ship.crewSafe).toBe(false);
    expect(createMissionReport(mission).medals.find(m => m.id === 'return')?.earned).toBe(false);
  });
  it('keeps collected data buffered without antenna transmission', () => {
    let mission = startDemoMission({ ...INITIAL_SHIP, antennaActive: false });
    for (let i = 0; i < 3; i++) mission = advanceDemoMission(mission);
    const report = createMissionReport(mission);
    expect(report.scienceCollectedMb).toBeGreaterThan(0);
    expect(report.scienceTransmittedMb).toBe(0);
    expect(report.scienceBufferedMb).toBe(report.scienceCollectedMb);
  });
});
