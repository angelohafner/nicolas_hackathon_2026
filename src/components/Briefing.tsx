import { ArrowRight, BatteryCharging, ChevronDown, CircleDot, Database, Fuel, Gauge, Orbit, Radio, Sparkles, ShieldCheck } from 'lucide-react';
import { EducationalTip, Eyebrow } from './Shared';

const phases = [
  { step: '01', name: 'Órbita terrestre', detail: 'Preparação e partida' },
  { step: '02', name: 'Face oculta da Lua', detail: 'Ciência e comunicação' },
  { step: '03', name: 'Retorno à Terra', detail: 'Reentrada e recuperação' },
];

const rules = [
  { name: 'MASSA', title: 'Massa & SLS', detail: 'Equilibre equipamentos e margem de segurança.', Icon: Gauge, cls: 'cyan' },
  { name: 'ENERGIA', title: 'Energia solar', detail: 'Use a bateria quando a geração solar diminuir.', Icon: BatteryCharging, cls: 'amber' },
  { name: 'COMUNICAÇÃO', title: 'Rádio & buffer', detail: 'Grave dados durante a perda de sinal.', Icon: Radio, cls: 'mint' },
  { name: 'PROPULSÃO', title: 'Combustível Δv', detail: 'Reserve manobras para chegar em casa.', Icon: Fuel, cls: 'violet' },
];

export default function Briefing({ tips, onTipsChange, onStart }: { tips: boolean; onTipsChange: (value: boolean) => void; onStart: () => void }) {
  return (
    <main className="page briefing-page">
      <div className="briefing-hero">
        <div className="briefing-copy">
          <Eyebrow>MISSION CONTROL / BRIEFING 001</Eyebrow>
          <div className="hero-superline"><CircleDot size={13} /> A próxima missão começa com suas decisões</div>
          <h1 className="hero-title">ARTEMIS <span>II</span><em>LUNAR ODYSSEY</em></h1>
          <p className="hero-description">Assuma o controle da missão. Prepare a espaçonave <b>Orion</b>, contorne a Lua e traga a tripulação de volta à Terra com segurança.</p>
          <div className="hero-meta"><span><Orbit size={15}/> 3 FASES CONECTADAS</span><i /><span><ShieldCheck size={15}/> 5 VERIFICAÇÕES</span><i /><span><Database size={15}/> 1 MISSÃO</span></div>
          <div className="hero-actions">
            <button className="button button--primary button--xl" onClick={onStart}>INICIAR MISSÃO <ArrowRight size={20}/></button>
            <button className="button button--outline" onClick={()=>document.getElementById('mission-roadmap')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>EXPLORAR JORNADA <ChevronDown size={17}/></button>
          </div>
          <label className="learn-control">
            <span className="learn-control-icon"><Sparkles size={17}/></span>
            <span className="learn-control-text"><strong>Dicas da Diretora de Voo</strong><small>Explicações educativas durante a missão</small></span>
            <input aria-label="Ativar dicas educativas" type="checkbox" checked={tips} onChange={event=>onTipsChange(event.target.checked)} />
            <span className={`switch ${tips ? 'switch--on' : ''}`} aria-hidden="true"><span/></span>
          </label>
        </div>
        <div className="hero-cosmos-label"><div className="orbit-target"><span/></div><div><small>TRAJETÓRIA SIMULADA</small><strong>EARTH → MOON → EARTH</strong></div></div>
      </div>
      <section className="mission-overview" id="mission-roadmap">
        <div className="mission-overview-heading"><span>JORNADA DA MISSÃO</span><span className="heading-divider"/><span>TRÊS FASES. UMA HISTÓRIA.</span></div>
        <div className="roadmap-grid">
          {phases.map((phase,index)=><div key={phase.step} className="roadmap-phase"><div className="roadmap-index">{phase.step}<span className="roadmap-node"/></div><div className="roadmap-details"><strong>{phase.name}</strong><small>{phase.detail}</small></div>{index<2&&<ArrowRight className="roadmap-arrow" size={17}/>}</div>)}
        </div>
        <div className="mission-overview-heading mission-overview-heading--rules"><span>QUATRO REGRAS PARA SOBREVIVER</span><span className="heading-divider"/><span>LEARN BY DOING</span></div>
        <div className="rules-grid">{rules.map(({name,title,detail,Icon,cls})=><div className="rule-card" key={name}><div className={`rule-icon rule-icon--${cls}`}><Icon size={20} strokeWidth={1.7}/></div><div><span className="rule-name">{name}</span><strong>{title}</strong><p>{detail}</p></div></div>)}</div>
        {tips && <div className="briefing-tip"><EducationalTip title="Conselho da Diretora de Voo">A Artemis II real foi um sobrevoo tripulado da Lua, sem pousar na superfície. No jogo, você vai tomar decisões inspiradas em desafios de engenharia espacial.</EducationalTip></div>}
      </section>
      <div className="briefing-footer-note">PROTÓTIPO EDUCACIONAL · PARTE 1 — NICOLAS <span>●</span> DADOS DA MISSÃO SIMULADOS</div>
    </main>
  );
}
