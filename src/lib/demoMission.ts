import type { MissionMedal, MissionProgress, MissionReport, PhaseRecord, SpacecraftSnapshot } from '../types/mission';

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, n));

// This is a deterministic demo adapter. Replace it with the team's flight engine.
export function startDemoMission(ship: SpacecraftSnapshot): MissionProgress {
  return {
    phaseIndex: 0,
    ship: {
      ...ship,
      scienceDataCollectedMb: 0,
      scienceDataTransmittedMb: 0,
      heatShieldHealthPercent: ship.heatShieldInstalled ? ship.heatShieldHealthPercent : 0,
      crewSafe: null,
      blackoutMinutes: 0,
      missionElapsedDays: 0,
    },
    history: [],
  };
}

function transmitData(ship: SpacecraftSnapshot, collected: number, share: number) {
  if (!ship.antennaActive) return ship.scienceDataTransmittedMb;
  const available = ship.scienceDataCollectedMb + collected;
  return Math.min(available, ship.scienceDataTransmittedMb + Math.round((available - ship.scienceDataTransmittedMb) * share));
}

export function advanceDemoMission(current: MissionProgress): MissionProgress {
  if (current.phaseIndex >= 3) return current;
  const stage = current.phaseIndex + 1;
  const ship: SpacecraftSnapshot = { ...current.ship };
  let record: PhaseRecord;

  if (stage === 1) {
    const science = 115;
    ship.scienceDataTransmittedMb = transmitData(ship, science, 0.80);
    ship.scienceDataCollectedMb += science;
    ship.fuelRemainingDeltaV = clamp(ship.fuelRemainingDeltaV - 450, 0, 5000);
    ship.batteryChargePercent = clamp(ship.batteryChargePercent - 7);
    ship.missionElapsedDays += 2;
    record = {
      phase: 1,
      title: 'Órbita terrestre concluída',
      description: 'A Orion passou pelos sistemas iniciais e iniciou a trajetória em direção à Lua.',
      collectedMb: science,
      transmittedMb: ship.scienceDataTransmittedMb - current.ship.scienceDataTransmittedMb,
      fuelSpentDeltaV: current.ship.fuelRemainingDeltaV - ship.fuelRemainingDeltaV,
      batterySpentPercent: 7,
    };
  } else if (stage === 2) {
    const science = 315;
    ship.scienceDataCollectedMb += science;
    // Data accumulates during the lunar radio blackout and is sent afterwards.
    ship.scienceDataTransmittedMb = transmitData(current.ship, science, 0.94);
    ship.fuelRemainingDeltaV = clamp(ship.fuelRemainingDeltaV - 620, 0, 5000);
    ship.batteryChargePercent = clamp(ship.batteryChargePercent - 29);
    ship.blackoutMinutes += 42;
    ship.missionElapsedDays += 4;
    record = {
      phase: 2,
      title: 'Sobrevoo lunar concluído',
      description: 'A nave cruzou a face oculta, armazenou observações e tentou transmitir os dados após recuperar o sinal.',
      collectedMb: science,
      transmittedMb: ship.scienceDataTransmittedMb - current.ship.scienceDataTransmittedMb,
      fuelSpentDeltaV: current.ship.fuelRemainingDeltaV - ship.fuelRemainingDeltaV,
      batterySpentPercent: 29,
    };
  } else {
    const science = 48;
    const enoughFuelForCorrection = ship.fuelRemainingDeltaV >= 160;
    const validEntry = ship.reentryAngleDeg >= 5.5 && ship.reentryAngleDeg <= 7.0;
    const hasShield = ship.heatShieldInstalled && ship.heatShieldHealthPercent >= 60;
    ship.crewSafe = enoughFuelForCorrection && validEntry && hasShield && ship.batteryChargePercent > 0;
    ship.scienceDataTransmittedMb = transmitData(ship, science, 1);
    ship.scienceDataCollectedMb += science;
    ship.fuelRemainingDeltaV = clamp(ship.fuelRemainingDeltaV - 160, 0, 5000);
    ship.batteryChargePercent = clamp(ship.batteryChargePercent - 12);
    ship.heatShieldHealthPercent = clamp(ship.heatShieldHealthPercent - (ship.crewSafe ? 34 : 88));
    ship.missionElapsedDays += 3.1;
    record = {
      phase: 3,
      title: ship.crewSafe ? 'Reentrada e amerissagem concluídas' : 'Reentrada fora dos critérios do jogo',
      description: ship.crewSafe
        ? 'A cápsula entrou no corredor de reentrada, abriu os paraquedas e pousou no oceano.'
        : 'A simulação identificou um risco crítico de reentrada e marcou a recuperação como insegura.',
      collectedMb: science,
      transmittedMb: ship.scienceDataTransmittedMb - current.ship.scienceDataTransmittedMb,
      fuelSpentDeltaV: current.ship.fuelRemainingDeltaV - ship.fuelRemainingDeltaV,
      batterySpentPercent: 12,
    };
  }
  return { phaseIndex: stage as 1 | 2 | 3, ship, history: [...current.history, record] };
}

export function createMissionReport(progress: MissionProgress): MissionReport {
  const ship = progress.ship;
  const completed = progress.phaseIndex === 3;
  const crewSafe = completed && ship.crewSafe === true;
  const sciencePoints = Math.min(300, Math.round(ship.scienceDataTransmittedMb * 0.7));
  const resourcePoints = (ship.fuelRemainingDeltaV >= 300 ? 100 : 0) + (ship.batteryChargePercent >= 15 ? 100 : 0);
  const score = (crewSafe ? 500 : 0) + sciencePoints + resourcePoints;
  const medals: MissionMedal[] = [
    { id: 'return', title: 'Retorno Seguro', description: 'Tripulação recuperada em segurança.', earned: crewSafe },
    { id: 'science', title: 'Explorador Lunar', description: 'Transmitir pelo menos 250 MB de dados.', earned: ship.scienceDataTransmittedMb >= 250 },
    { id: 'resources', title: 'Gestor de Recursos', description: 'Preservar 300 m/s de Δv e 15% de bateria.', earned: ship.fuelRemainingDeltaV >= 300 && ship.batteryChargePercent >= 15 },
    { id: 'director', title: 'Diretor de Missão', description: 'Retornar com segurança e obter as demais medalhas.', earned: crewSafe && ship.scienceDataTransmittedMb >= 250 && ship.fuelRemainingDeltaV >= 300 && ship.batteryChargePercent >= 15 },
  ];
  return {
    missionId: 'ARTEMIS-II-NICOLAS-DEMO',
    completed, crewSafe, score,
    grade: score >= 900 ? 'EXCELENTE' : score >= 700 ? 'MUITO BOM' : score >= 450 ? 'EM DESENVOLVIMENTO' : 'REVISAR MISSÃO',
    scienceCollectedMb: ship.scienceDataCollectedMb,
    scienceTransmittedMb: ship.scienceDataTransmittedMb,
    scienceBufferedMb: Math.max(0, ship.scienceDataCollectedMb - ship.scienceDataTransmittedMb),
    fuelRemainingDeltaV: ship.fuelRemainingDeltaV,
    batteryRemainingPercent: ship.batteryChargePercent,
    heatShieldRemainingPercent: ship.heatShieldHealthPercent,
    blackoutMinutes: ship.blackoutMinutes,
    simulatedDays: ship.missionElapsedDays,
    reentryAngleDeg: ship.reentryAngleDeg,
    medals, history: progress.history,
    modelDisclaimer: 'Simulação educativa. Pontuação, requisitos numéricos, eventos e recursos não correspondem à telemetria oficial da NASA.',
  };
}
