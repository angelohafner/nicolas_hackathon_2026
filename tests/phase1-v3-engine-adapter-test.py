"""Verify integration API exists and returns defensive copies without team side effects."""
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright
s=(Path(__file__).resolve().parents[1]/'index.html').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=shutil.which('chromium') or None,args=['--no-sandbox'])
 q=b.new_page();q.set_content(s)
 assert q.evaluate('typeof window.ArtemisNicolasPhase1.connectEngine==="function"')
 assert q.evaluate('window.ArtemisNicolasPhase1.getPhase1Handoff()===null')
 x=q.evaluate('''() => { const api=window.ArtemisNicolasPhase1; const a=api.getMissionState();const n=a.resources.batteryCurrentWh;a.resources.batteryCurrentWh=0; return api.getMissionState().resources.batteryCurrentWh===n && api.getGuidedBurnPreview(480).allowed; }''')
 assert x
 b.close()
print('PASS: Phase 1 integration API and defensive mission snapshots')
