export type CheckStatus = 'green' | 'yellow' | 'red';
export type Screen = 'briefing' | 'hangar' | 'checklist' | 'flight' | 'debrief';

export interface SpacecraftSnapshot {
  totalMassKg: number;
  batteryChargePercent: number;
  powerBalanceWatts: number;
  heatShieldInstalled: boolean;
  heatShieldHealthPercent: number;
  antennaActive: boolean;
  fuelRemainingDeltaV: number;
  scienceDataCollectedMb: number;
  scienceDataTransmittedMb: number;
  reentryAngleDeg: number;
  crewSafe: boolean | null;
  blackoutMinutes: number;
  missionElapsedDays: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  status: CheckStatus;
  critical: boolean;
  detail: string;
  educationalTip: string;
  observedValue: string;
}

export interface ChecklistResult {
  items: ChecklistItem[];
  greenCount: number;
  redCriticalCount: number;
  approved: boolean;
}

export interface PhaseRecord {
  phase: 1 | 2 | 3;
  title: string;
  description: string;
  collectedMb: number;
  transmittedMb: number;
  fuelSpentDeltaV: number;
  batterySpentPercent: number;
}

export interface MissionProgress {
  phaseIndex: 0 | 1 | 2 | 3;
  ship: SpacecraftSnapshot;
  history: PhaseRecord[];
}

export interface MissionMedal {
  id: 'return' | 'science' | 'resources' | 'director';
  title: string;
  description: string;
  earned: boolean;
}

export interface MissionReport {
  missionId: string;
  completed: boolean;
  crewSafe: boolean;
  score: number;
  grade: string;
  scienceCollectedMb: number;
  scienceTransmittedMb: number;
  scienceBufferedMb: number;
  fuelRemainingDeltaV: number;
  batteryRemainingPercent: number;
  heatShieldRemainingPercent: number;
  blackoutMinutes: number;
  simulatedDays: number;
  reentryAngleDeg: number;
  medals: MissionMedal[];
  history: PhaseRecord[];
  modelDisclaimer: string;
}
