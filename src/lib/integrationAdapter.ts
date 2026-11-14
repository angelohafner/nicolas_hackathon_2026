import type { MissionProgress, SpacecraftSnapshot } from '../types/mission';
import { createMissionReport } from './demoMission';
import { INITIAL_SHIP } from './missionRules';

// This contract isolates Nicolas's presentation layer from the team's simulation engine.
export interface TeamEngineeringReadout {
  totalMassKg: number;
  energy: {
    batteryChargePercent: number;
    netPowerWatts: number;
  };
  thermal: {
    shieldInstalled: boolean;
    shieldHealthPercent: number;
  };
  communications: {
    antennaActive: boolean;
    scientificDataCollectedMb: number;
    scientificDataTransmittedMb: number;
    blackoutMinutes: number;
  };
  propulsion: {
    availableDeltaVMps: number;
  };
  flight: {
    simulatedDays: number;
    reentryAngleDeg: number;
    crewSafe: boolean | null;
  };
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`Invalid readout: ${label}`);
  return value;
}

export function mapTeamReadoutToSnapshot(readout: TeamEngineeringReadout): SpacecraftSnapshot {
  return {
    ...INITIAL_SHIP,
    totalMassKg: finite(readout.totalMassKg, 'totalMassKg'),
    batteryChargePercent: finite(readout.energy.batteryChargePercent, 'batteryChargePercent'),
    powerBalanceWatts: finite(readout.energy.netPowerWatts, 'netPowerWatts'),
    heatShieldInstalled: readout.thermal.shieldInstalled,
    heatShieldHealthPercent: finite(readout.thermal.shieldHealthPercent, 'shieldHealthPercent'),
    antennaActive: readout.communications.antennaActive,
    fuelRemainingDeltaV: finite(readout.propulsion.availableDeltaVMps, 'availableDeltaVMps'),
    scienceDataCollectedMb: finite(readout.communications.scientificDataCollectedMb, 'scientificDataCollectedMb'),
    scienceDataTransmittedMb: finite(readout.communications.scientificDataTransmittedMb, 'scientificDataTransmittedMb'),
    blackoutMinutes: finite(readout.communications.blackoutMinutes, 'blackoutMinutes'),
    missionElapsedDays: finite(readout.flight.simulatedDays, 'simulatedDays'),
    reentryAngleDeg: finite(readout.flight.reentryAngleDeg, 'reentryAngleDeg'),
    crewSafe: readout.flight.crewSafe,
  };
}

// Create the final report from the real engine state without rerunning demo phases.
export function makeFinalReportFromTeam(
  readout: TeamEngineeringReadout,
  history: MissionProgress['history'] = [],
) {
  return createMissionReport({
    phaseIndex: 3,
    ship: mapTeamReadoutToSnapshot(readout),
    history,
  });
}
