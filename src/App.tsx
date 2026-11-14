import { useMemo, useState, type ReactNode } from 'react';
import { Activity, GraduationCap, MoonStar, Radio, ShieldCheck } from 'lucide-react';
import SpaceScene from './components/SpaceScene';
import Briefing from './components/Briefing';
import Hangar from './components/Hangar';
import CmlChecklist from './components/CmlChecklist';
import FlightDemo from './components/FlightDemo';
import Debrief from './components/Debrief';
import { INITIAL_SHIP, checkLaunchReadiness } from './lib/missionRules';
import { startDemoMission, advanceDemoMission, createMissionReport } from './lib/demoMission';
import type { MissionProgress, MissionReport, Screen, SpacecraftSnapshot } from './types/mission';

const steps: { id: Screen; name: string }[] = [
  { id: 'briefing', name: 'BRIEFING' },
  { id: 'hangar', name: 'TESTES' },
  { id: 'checklist', name: 'CML 4' },
  { id: 'flight', name: 'SIMULAÇÃO' },
  { id: 'debrief', name: 'DEBRIEF' },
];

export interface NicolasModuleProps {
  initialShip?: SpacecraftSnapshot;
  onLaunchAuthorized?: (ship: SpacecraftSnapshot) => void;
  externalReport?: MissionReport;
  renderExternalFlight?: (args: { ship: SpacecraftSnapshot; tips: boolean; finishMission: () => void }) => ReactNode;
}

export default function App({
  initialShip = INITIAL_SHIP,
  onLaunchAuthorized,
  externalReport,
  renderExternalFlight,
}: NicolasModuleProps = {}) {
  const [screen, setScreen] = useState<Screen>('briefing');
  const [tips, setTips] = useState(true);
  const [ship, setShip] = useState<SpacecraftSnapshot>({ ...initialShip });
  const [progress, setProgress] = useState<MissionProgress>(()=>startDemoMission(initialShip));
  const report = useMemo(()=>externalReport ?? createMissionReport(progress), [externalReport, progress]);
  const currentIndex = steps.findIndex(step=>step.id===screen);
  const reset = () => {
    setShip({ ...initialShip });
    setProgress(startDemoMission(initialShip));
    setScreen('briefing');
  };
  const launch = () => {
    // The launch lock is enforced in the handler, not only in the button style.
    if (!checkLaunchReadiness(ship).approved) return;
    onLaunchAuthorized?.({ ...ship });
    setProgress(startDemoMission(ship));
    setScreen('flight');
  };
  const exportReport = () => {
    const blob = new Blob([JSON.stringify(report,null,2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'artemis-ii-nicolas-relatorio.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return <div className={`app-shell app-shell--${screen}`}>
    <SpaceScene />
    <div className="app-chrome" aria-hidden="true"><div className="chrome-grid"/></div>
    <header className="app-header"><button className="header-brand" onClick={reset} title="Voltar ao início"><span className="brand-orbit"><MoonStar size={22}/></span><span className="brand-wordmark"><strong>ARTEMIS <i>II</i></strong><small>LUNAR ODYSSEY</small></span></button>
      <div className="header-steps" aria-label="Etapas do protótipo">{steps.map((step,index)=><div key={step.id} className={`header-step ${index===currentIndex?'header-step--current':index<currentIndex?'header-step--past':''}`}><span>{String(index+1).padStart(2,'0')}</span>{step.name}</div>)}</div>
      <div className="header-right"><span className="system-online"><span/> SISTEMA ONLINE</span><span className="header-divider"/><span className="header-name"><GraduationCap size={16}/> NICOLAS · DIRETOR DE MISSÃO</span></div>
    </header>
    <div className="page-wrapper">
      {screen==='briefing' && <Briefing tips={tips} onTipsChange={setTips} onStart={()=>setScreen('hangar')}/>}
      {screen==='hangar' && <Hangar ship={ship} setShip={setShip} tips={tips} onNext={()=>setScreen('checklist')} onBack={()=>setScreen('briefing')}/>}
      {screen==='checklist' && <CmlChecklist ship={ship} tips={tips} onBack={()=>setScreen('hangar')} onLaunch={launch}/>}
      {screen==='flight' && (renderExternalFlight
        ? renderExternalFlight({ ship: progress.ship, tips, finishMission: ()=>setScreen('debrief') })
        : <FlightDemo progress={progress} tips={tips} onAdvance={()=>setProgress(p=>advanceDemoMission(p))} onShowReport={()=>setScreen('debrief')} onAngleChange={v=>setProgress(p=>({ ...p, ship: { ...p.ship, reentryAngleDeg: v } }))}/>)}
      {screen==='debrief' && <Debrief report={report} tips={tips} onRestart={reset} onExport={exportReport}/>}
    </div>
    <footer className="app-footer"><div className="footer-accent"><span/><span/><span/></div><div><Radio size={13}/> MISSION CONTROL <b>/</b> PART 01</div><div><Activity size={13}/> PROTOTYPE v1.0.0</div><div className="footer-right"><ShieldCheck size={13}/> EDUCATIONAL SIMULATION <span>•</span> NOT AN OFFICIAL NASA PRODUCT</div></footer>
  </div>;
}
