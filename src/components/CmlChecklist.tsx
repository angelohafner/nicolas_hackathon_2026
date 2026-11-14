import { useState, type CSSProperties } from 'react';
import { AlertCircle, ArrowRight, BookOpen, ChevronDown, CircleCheck, CircleX, Info, LockKeyhole, Rocket, ShieldAlert, ShieldCheck } from 'lucide-react';
import { checkLaunchReadiness, GAME_MASS_GREEN_KG, GAME_MASS_LIMIT_KG } from '../lib/missionRules';
import type { SpacecraftSnapshot } from '../types/mission';
import { BackButton, Eyebrow, ProgressMeter, StatusLight } from './Shared';

export default function CmlChecklist({ ship, tips, onBack, onLaunch }: {
  ship: SpacecraftSnapshot; tips: boolean; onBack: () => void; onLaunch: () => void;
}) {
  const [expanded, setExpanded] = useState<string|null>(null);
  const result = checkLaunchReadiness(ship);
  const status = result.approved ? 'go' : 'no-go';
  return <main className="page flow-page checklist-page">
    <div className="flow-heading"><div><Eyebrow>PRE-FLIGHT DIRECTOR / CML 4</Eyebrow><h1>Autorização de <span>lançamento.</span></h1><p>Analise os cinco sistemas. São necessários pelo menos 4 itens verdes e nenhum vermelho crítico.</p></div><span className={`top-status top-status--${status}`}><span className="top-status-dot"/>{result.approved?'GO FOR LAUNCH':'LAUNCH HOLD'}</span></div>
    <div className="flow-grid checklist-grid">
      <section className="glass-panel checklist-panel"><div className="panel-heading panel-heading--between"><div className="panel-heading"><span className="panel-heading-icon"><ShieldCheck size={20}/></span><div><h2>CHECKLIST / CML 4</h2><p>Validação pré-lançamento · Artemis II: Lunar Odyssey</p></div></div><span className="small-label">05 SISTEMAS</span></div>
        <div className="checklist-table-header"><span>VERIFICAÇÃO</span><span>LEITURA ATUAL</span><span>STATUS</span></div>
        <div className="checklist-rows">{result.items.map((item,index)=><div key={item.id} className={`check-item check-item--${item.status}`}>
          <button className="check-item-main" aria-expanded={expanded===item.id} onClick={()=>setExpanded(expanded===item.id?null:item.id)}><span className="check-item-number">{String(index+1).padStart(2,'0')}</span><span className="check-item-name"><strong>{item.label}</strong><small>{item.critical?'REQUISITO CRÍTICO':'REQUISITO DE MISSÃO'}</small></span><span className="check-item-value">{item.observedValue}</span><span className="check-item-status"><StatusLight status={item.status}/><span>{item.status==='green'?'PASSOU':item.status==='yellow'?'ATENÇÃO':'FALHOU'}</span></span><ChevronDown className={`check-chevron ${expanded===item.id?'check-chevron--open':''}`} size={15}/></button>
          {expanded===item.id && <div className="check-item-expanded"><Info size={17}/><div><p>{item.detail}</p>{tips&&<small><BookOpen size={14}/> {item.educationalTip}</small>}</div></div>}
        </div>)}</div>
        <div className="checklist-legend"><span><StatusLight status="green"/> Aprovado</span><span><StatusLight status="yellow"/> Atenção</span><span><StatusLight status="red"/> Reprovado</span><span className="legend-hint">Clique em uma linha para ver detalhes.</span></div>
      </section>
      <aside className="glass-panel launch-panel"><div className="launch-panel-top"><span>LANÇAMENTO</span><small>READINESS SCORE</small></div><div className={`launch-score-ring launch-score-ring--${status}`} style={{'--score':`${result.greenCount*20}%`} as CSSProperties}><div><strong>{result.greenCount*20}<small>%</small></strong><span>GREEN CHECKS</span></div></div>
        <div className="launch-panel-lines"><div><span>Verificações verdes</span><strong>{result.greenCount} / 5</strong></div><ProgressMeter value={result.greenCount*20} tone={result.approved?'green':'amber'}/><div><span>Falhas críticas</span><strong className={result.redCriticalCount?'text-danger':'text-success'}>{result.redCriticalCount}</strong></div></div>
        <div className={`launch-verdict launch-verdict--${status}`}>{result.approved?<><CircleCheck size={23}/><div><strong>PRONTO PARA PARTIR</strong><p>Critérios atendidos. A missão pode ser iniciada.</p></div></>:<><CircleX size={23}/><div><strong>LANÇAMENTO BLOQUEADO</strong><p>{result.redCriticalCount>0?`Há ${result.redCriticalCount} falha(s) crítica(s).`:'Faltam itens verdes para alcançar 80%.'}</p></div></>}</div>
        <button className="button button--primary button--launch" onClick={onLaunch} disabled={!result.approved}>{result.approved?<Rocket size={19}/>:<LockKeyhole size={19}/>} LANÇAR SLS <ArrowRight size={18}/></button>
        <p className="launch-panel-caption">{result.approved?'Próxima etapa: demonstração das três fases.':'Retorne ao laboratório e ajuste a configuração.'}</p>
      </aside>
    </div>
    {tips&&<div className="checklist-footnote"><AlertCircle size={17}/><span><strong>Nota de engenharia:</strong> “CML 4” significa <em>Concept Maturity Level 4</em> (Point Design) no processo real de projetos da NASA. O uso como checklist de autorização é uma <strong>adaptação didática</strong>. Os limites de {GAME_MASS_LIMIT_KG.toLocaleString('pt-BR')} kg e a faixa verde até {GAME_MASS_GREEN_KG.toLocaleString('pt-BR')} kg são parâmetros inventados para o jogo.</span></div>}
    <div className="flow-actions"><BackButton onClick={onBack}>Corrigir configuração</BackButton><span className="inline-assist"><ShieldAlert size={16}/> A segurança da tripulação vem primeiro.</span></div>
  </main>;
}
