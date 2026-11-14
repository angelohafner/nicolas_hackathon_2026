import { Activity, ArrowRight, BatteryCharging, Fuel, Gauge, Radio, RotateCcw, ShieldCheck, SlidersHorizontal, Zap } from 'lucide-react';
import { checkLaunchReadiness, GAME_MASS_GREEN_KG, GAME_MASS_LIMIT_KG, INITIAL_SHIP } from '../lib/missionRules';
import type { SpacecraftSnapshot } from '../types/mission';
import { BackButton, EducationalTip, Eyebrow, ProgressMeter } from './Shared';

interface Props {
  ship: SpacecraftSnapshot;
  setShip: (next: SpacecraftSnapshot) => void;
  onNext: () => void;
  onBack: () => void;
  tips: boolean;
}

function Slider({ label, value, min, max, step, unit, Icon, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  Icon: typeof Gauge; onChange: (value: number) => void;
}) {
  return <label className="slider-group"><span className="slider-heading"><span><Icon size={16}/>{label}</span><strong>{value.toLocaleString('pt-BR')} <small>{unit}</small></strong></span><input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/><span className="slider-extents"><small>{min.toLocaleString('pt-BR')} {unit}</small><small>{max.toLocaleString('pt-BR')} {unit}</small></span></label>;
}

export default function Hangar({ ship, setShip, onNext, onBack, tips }: Props) {
  const result = checkLaunchReadiness(ship);
  const set = (change: Partial<SpacecraftSnapshot>) => setShip({ ...ship, ...change });
  return <main className="page flow-page hangar-page">
    <div className="flow-heading"><div><Eyebrow>INTEGRATION LAB / TEST DATA</Eyebrow><h1>Preparar a <span>Orion.</span></h1><p>Este laboratório simula os valores que a Helô e a Helena fornecerão ao módulo do Nicolas.</p></div><span className="label-demo">DADOS SIMULADOS</span></div>
    <div className="flow-grid hangar-grid">
      <section className="glass-panel config-panel">
        <div className="panel-heading"><span className="panel-heading-icon"><SlidersHorizontal size={19}/></span><div><h2>Condições da nave</h2><p>Altere os parâmetros e observe o checklist responder.</p></div></div>
        <div className="slider-stack">
          <Slider Icon={Gauge} label="Massa total" value={ship.totalMassKg} min={18_000} max={29_000} step={250} unit="kg" onChange={value=>set({ totalMassKg: value })} />
          <Slider Icon={BatteryCharging} label="Carga da bateria" value={ship.batteryChargePercent} min={0} max={100} step={1} unit="%" onChange={value=>set({ batteryChargePercent: value })} />
          <Slider Icon={Zap} label="Balanço de potência" value={ship.powerBalanceWatts} min={-180} max={180} step={5} unit="W" onChange={value=>set({ powerBalanceWatts: value })}/>
          <Slider Icon={Fuel} label="Reserva de manobra Δv" value={ship.fuelRemainingDeltaV} min={0} max={4_400} step={100} unit="m/s" onChange={value=>set({ fuelRemainingDeltaV: value })}/>
        </div>
        <div className="toggle-pair">
          <label className="config-toggle"><span className="config-toggle-icon"><ShieldCheck size={19}/></span><span><strong>Escudo térmico</strong><small>{ship.heatShieldInstalled ? 'Instalado e operacional' : 'Não instalado — falha crítica'}</small></span><input type="checkbox" aria-label="Escudo térmico instalado" checked={ship.heatShieldInstalled} onChange={e=>set({ heatShieldInstalled:e.target.checked, heatShieldHealthPercent:e.target.checked?100:0 })}/><i className={ship.heatShieldInstalled?'toggle-indicator toggle-indicator--on':'toggle-indicator'}/></label>
          <label className="config-toggle"><span className="config-toggle-icon"><Radio size={19}/></span><span><strong>Antena de rádio</strong><small>{ship.antennaActive ? 'Canal de comunicação ativo' : 'Sem transmissão de dados'}</small></span><input type="checkbox" aria-label="Antena de rádio ativa" checked={ship.antennaActive} onChange={e=>set({ antennaActive:e.target.checked })}/><i className={ship.antennaActive?'toggle-indicator toggle-indicator--on':'toggle-indicator'}/></label>
        </div>
        <div className="config-actions"><button className="button button--subtle" onClick={()=>setShip({ ...INITIAL_SHIP })}><RotateCcw size={16}/> Restaurar cenário</button><button className="button button--subtle" onClick={()=>setShip({ ...INITIAL_SHIP, totalMassKg: 28_500, batteryChargePercent: 0 })}>Testar falha crítica</button></div>
      </section>
      <aside className="glass-panel hangar-aside"><div className="panel-heading"><span className="panel-heading-icon"><Activity size={19}/></span><div><h2>Prévia do CML 4</h2><p>Condições atualizadas em tempo real.</p></div></div>
        <div className={`readiness-preview ${result.approved?'readiness-preview--go':'readiness-preview--nogo'}`}><div className="readiness-preview-top"><span>STATUS DE LANÇAMENTO</span><span className="preview-live-dot">LIVE</span></div><strong>{result.approved?'GO FOR LAUNCH':'NO-GO'}</strong><small>{result.approved?'Critérios mínimos atendidos':'Revisão necessária antes do lançamento'}</small></div>
        <div className="preview-list">{result.items.map(item=><div className="preview-list-item" key={item.id}><span className={`preview-status preview-status--${item.status}`}/><span>{item.label}</span><small>{item.status === 'green' ? 'OK' : item.status === 'yellow' ? 'AVISO' : 'FALHA'}</small></div>)}</div>
        <div className="preview-progress"><div><strong>{result.greenCount} de 5</strong><span>itens aprovados</span></div><ProgressMeter value={result.greenCount*20} tone={result.approved?'green':'amber'}/></div>
        {tips && <EducationalTip title="Como funciona a margem?">O jogo usa massa máxima de {GAME_MASS_LIMIT_KG.toLocaleString('pt-BR')} kg. Até {GAME_MASS_GREEN_KG.toLocaleString('pt-BR')} kg há uma reserva de 15%; entre esses valores o sinal fica amarelo.</EducationalTip>}
      </aside>
    </div>
    <div className="flow-actions"><BackButton onClick={onBack}>Voltar ao briefing</BackButton><button className="button button--primary" onClick={onNext}>ABRIR CHECKLIST CML 4 <ArrowRight size={18}/></button></div>
    <div className="flow-note">LABORATÓRIO TEMPORÁRIO · Futuramente conectado ao catálogo de peças e à nave 3D da equipe.</div>
  </main>;
}
