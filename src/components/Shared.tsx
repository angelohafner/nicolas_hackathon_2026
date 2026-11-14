import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Info, Rocket, ShieldCheck, Wifi, Zap, Orbit, Radio, AlertTriangle, ArrowUpRight } from 'lucide-react';
import type { CheckStatus } from '../types/mission';

export const commonIcons = { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Info, Rocket, ShieldCheck, Wifi, Zap, Orbit, Radio, AlertTriangle, ArrowUpRight };

export function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <div className={`eyebrow ${light ? 'eyebrow--light' : ''}`}><span className="eyebrow-marker" />{children}</div>;
}

export function StatusLight({ status }: { status: CheckStatus }) {
  const labels = { green: 'Aprovado', yellow: 'Atenção', red: 'Reprovado' };
  return <span className={`status-light status-light--${status}`} role="img" aria-label={labels[status]} />;
}

export function BackButton({ onClick, children = 'Voltar' }: { onClick: () => void; children?: ReactNode }) {
  return <button className="button button--text" onClick={onClick}><ArrowLeft size={17} />{children}</button>;
}

export function EducationalTip({ title, children }: { title: string; children: ReactNode }) {
  return <div className="learning-tip"><div className="learning-tip-icon"><BookOpen size={18}/></div><div><strong>{title}</strong><p>{children}</p></div></div>;
}

export function Metric({ label, value, sub, accent = 'cyan' }: { label: string; value: string; sub?: string; accent?: string }) {
  return <div className={`metric-tile metric-tile--${accent}`}><div className="metric-tile-label">{label}</div><div className="metric-tile-value">{value}</div>{sub && <div className="metric-tile-sub">{sub}</div>}</div>;
}

export function ProgressMeter({ value, tone = 'cyan' }: { value: number; tone?: 'cyan' | 'green' | 'amber' | 'red' }) {
  return <div className="meter-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.max(0,Math.min(100,value)))}><div className={`meter-fill meter-fill--${tone}`} style={{ width: `${Math.max(0,Math.min(100,value))}%` }} /></div>;
}
