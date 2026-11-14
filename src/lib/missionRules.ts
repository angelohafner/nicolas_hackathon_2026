import type { ChecklistItem, ChecklistResult, SpacecraftSnapshot } from '../types/mission';

// These are educational game constraints, not certified NASA flight limits.
export const GAME_MASS_LIMIT_KG = 26_500;
export const GAME_MASS_SAFETY_MARGIN = 0.15;
export const GAME_MASS_GREEN_KG = GAME_MASS_LIMIT_KG * (1 - GAME_MASS_SAFETY_MARGIN);
export const GAME_FUEL_GREEN_DV = 1_200;
export const GREEN_PERCENT_REQUIRED = 0.80;

export const INITIAL_SHIP: SpacecraftSnapshot = {
  totalMassKg: 21_300,
  batteryChargePercent: 86,
  powerBalanceWatts: 55,
  heatShieldInstalled: true,
  heatShieldHealthPercent: 100,
  antennaActive: true,
  fuelRemainingDeltaV: 3_200,
  scienceDataCollectedMb: 0,
  scienceDataTransmittedMb: 0,
  reentryAngleDeg: 6.2,
  crewSafe: null,
  blackoutMinutes: 0,
  missionElapsedDays: 0,
};

export function checkLaunchReadiness(ship: SpacecraftSnapshot): ChecklistResult {
  const items: ChecklistItem[] = [
    {
      id: 'mass', label: 'Massa da nave', critical: true,
      status: ship.totalMassKg > GAME_MASS_LIMIT_KG ? 'red' : ship.totalMassKg > GAME_MASS_GREEN_KG ? 'yellow' : 'green',
      observedValue: `${Math.round(ship.totalMassKg).toLocaleString('pt-BR')} kg`,
      detail: ship.totalMassKg > GAME_MASS_LIMIT_KG
        ? 'Massa acima do limite do jogo. Remova componentes.'
        : ship.totalMassKg > GAME_MASS_GREEN_KG
          ? 'Dentro do limite, porém abaixo da margem de reserva recomendada.'
          : 'Massa aprovada com margem de segurança de 15%.',
      educationalTip: 'A margem de massa permite acomodar variações e incertezas do projeto. O limite de 26.500 kg é fictício e vale apenas para este jogo.',
    },
    {
      id: 'energy', label: 'Energia e bateria', critical: true,
      status: ship.batteryChargePercent <= 0 ? 'red'
        : ship.batteryChargePercent <= 20 || ship.powerBalanceWatts < 0 ? 'yellow' : 'green',
      observedValue: `${Math.round(ship.batteryChargePercent)}% · ${ship.powerBalanceWatts > 0 ? '+' : ''}${Math.round(ship.powerBalanceWatts)} W`,
      detail: ship.batteryChargePercent <= 0 ? 'Bateria esgotada. Sistemas essenciais indisponíveis.'
        : ship.powerBalanceWatts < 0 ? 'Consumo maior que geração: a bateria está sendo utilizada.'
          : ship.batteryChargePercent <= 20 ? 'Carga da bateria baixa; recomenda-se uma reserva maior.'
            : 'Energia disponível para os sistemas essenciais.',
      educationalTip: 'Durante um eclipse, a geração solar pode cair, mas a nave continua funcionando por um tempo graças à bateria.',
    },
    {
      id: 'shield', label: 'Escudo térmico', critical: true,
      status: !ship.heatShieldInstalled || ship.heatShieldHealthPercent <= 0 ? 'red'
        : ship.heatShieldHealthPercent < 60 ? 'yellow' : 'green',
      observedValue: ship.heatShieldInstalled ? `${Math.round(ship.heatShieldHealthPercent)}% de integridade` : 'NÃO INSTALADO',
      detail: !ship.heatShieldInstalled ? 'Escudo ausente. O retorno à Terra seria inseguro.'
        : ship.heatShieldHealthPercent < 60 ? 'Escudo presente, porém com integridade reduzida.'
          : 'Proteção térmica instalada e verificada.',
      educationalTip: 'A reentrada na atmosfera transforma energia cinética em calor intenso. O escudo térmico protege a cápsula Orion.',
    },
    {
      id: 'antenna', label: 'Antena de rádio', critical: false,
      status: ship.antennaActive ? 'green' : 'red',
      observedValue: ship.antennaActive ? 'LINK ATIVO' : 'LINK INATIVO',
      detail: ship.antennaActive ? 'Comunicação de rádio disponível.' : 'Sem rádio: os dados poderão ficar retidos no buffer.',
      educationalTip: 'Na face oculta da Lua, o corpo lunar pode bloquear o sinal direto para a Terra. A nave precisa armazenar dados até restabelecer o contato.',
    },
    {
      id: 'fuel', label: 'Reserva de combustível', critical: true,
      status: ship.fuelRemainingDeltaV <= 0 ? 'red'
        : ship.fuelRemainingDeltaV < GAME_FUEL_GREEN_DV ? 'yellow' : 'green',
      observedValue: `${Math.round(ship.fuelRemainingDeltaV).toLocaleString('pt-BR')} m/s (Δv)`,
      detail: ship.fuelRemainingDeltaV <= 0 ? 'Sem combustível de manobra disponível.'
        : ship.fuelRemainingDeltaV < GAME_FUEL_GREEN_DV ? 'Reserva baixa para as correções de trajetória.'
          : 'Reserva de manobras adequada para o jogo.',
      educationalTip: 'Δv expressa a capacidade acumulada de modificar a velocidade da nave; é uma medida útil do orçamento de manobras.',
    },
  ];

  const greenCount = items.filter(item => item.status === 'green').length;
  const redCriticalCount = items.filter(item => item.critical && item.status === 'red').length;
  return {
    items,
    greenCount,
    redCriticalCount,
    approved: greenCount >= Math.ceil(items.length * GREEN_PERCENT_REQUIRED) && redCriticalCount === 0,
  };
}
