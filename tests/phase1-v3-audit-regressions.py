"""Independent Phase 1 audit regressions for the en-US standalone experience.

All comments are English. No real NASA certification is implied.
"""
from pathlib import Path
import json
import shutil
from playwright.sync_api import sync_playwright

html = (Path(__file__).resolve().parents[1] / "index.html").read_text(encoding="utf-8")
checks = []

def check(name, condition):
    checks.append((name, bool(condition)))
    print(("PASS " if condition else "FAIL ") + name, flush=True)
    if not condition:
        raise AssertionError(name)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=shutil.which("chromium"), args=["--no-sandbox", "--disable-dev-shm-usage"])
    page = browser.new_page(viewport={"width": 1280, "height": 880}, reduced_motion="reduce")
    page.set_default_timeout(10000)
    failures = []
    page.on("pageerror", lambda e: failures.append(str(e)))
    page.set_content(html)
    check("No duplicated 15% safety limit in briefing", "15% design margin is encouraged" not in page.locator("body").inner_text())
    check("American English document", page.locator("html").get_attribute("lang") == "en-US")
    check("Departure burn unavailable before authorization", not page.evaluate("window.ArtemisNicolasPhase1.getGuidedBurnPreview(480).allowed"))
    check("Fixed mass ceiling accepts exactly 26,500 kg", page.evaluate('''() => {
      window.ArtemisNicolas.setShipSnapshot({totalMassKg:26500});
      const r=window.ArtemisNicolasPhase1.getStatus().gates;
      return r.gates.find(x=>x.id==='mass').ok;
    }'''))
    check("Mass 26,501 kg fails", page.evaluate('''() => {
      window.ArtemisNicolas.setShipSnapshot({totalMassKg:26501});
      return !window.ArtemisNicolasPhase1.getStatus().gates.gates.find(x=>x.id==='mass').ok;
    }'''))
    check("No handoff exists without burn", page.evaluate("window.ArtemisNicolasPhase1.getPhase1Handoff()===null"))
    check("Final report blocked before Phase 1", page.evaluate('''() => {
      try { window.ArtemisNicolas.setMissionResult({history:[]}); return false; }
      catch(e) { return String(e).includes('Phase 1 must be completed'); }
    }'''))
    check("Invalid external canonical state rejected", page.evaluate('''() => {
      const api=window.ArtemisNicolasPhase1;
      const baseline=api.getMissionState();
      let passed=0;
      for(const bad of [
        s=>s.resources.batteryCurrentWh=s.resources.batteryCapacityWh+1,
        s=>s.resources.bufferCurrentMb=s.resources.bufferCapacityMb+10,
        s=>s.resources.scienceCollectedMb=10,
        s=>s.engineering.budgetRemainingUsd++ ,
        s=>s.engineering.maxMassKg=22525,
      ]) {
        const state=structuredClone(baseline);bad(state);
        const fake={getState(){return state},evaluatePhase1(){return {eligible:true,gates:[],checklist:{items:[]}}},
          previewDepartureBurn(){return {allowed:true}},recordChecklistApproval(){},commitDepartureBurn(){},completePhase1(){}};
        try {api.connectEngine(fake)} catch(e) {passed++}
        if(api.getStatus().connected)return false;
      }
      return passed===5;
    }'''))
    page.locator('[data-action="toggle-voice"]').click()
    page.get_by_role('button', name='START PHASE 1').click()
    page.get_by_role('button',name='RESTORE SAFE DEMO').click()
    page.get_by_role('button',name='OPEN FLIGHT READINESS CHECKLIST').click()
    page.get_by_role('button',name='RUN PRE-LAUNCH DIAGNOSTICS').click()
    page.wait_for_function("window.ArtemisNicolasPhase1.getStatus().diagnosticStatus==='complete'",timeout=25000)
    page.locator('[data-action="start-countdown"]').click()
    page.wait_for_function("document.querySelector('.v3-burn-page')!==null",timeout=40000)
    check("Official demo engine records liftoff", page.evaluate("window.ArtemisNicolasPhase1.getMissionState().liftoffConfirmed === true"))
    check("Departure burn preview enabled only after liftoff", page.evaluate("window.ArtemisNicolasPhase1.getGuidedBurnPreview(480).allowed"))
    page.locator('[data-v3-burn-confirm]').check()
    page.locator('[data-action="v3-execute-burn"]').click()
    check("Maneuver reserve debited once",page.evaluate("window.ArtemisNicolasPhase1.getMissionState().resources.maneuverReserveMps===2720"))
    check("Post-burn direct snapshot editing blocked", page.evaluate('''() => {
      try {window.ArtemisNicolas.setShipSnapshot({batteryChargePercent:100});return false}
      catch(e){return String(e).includes('already in flight')}
    }'''))
    check("Engine replacement mid-mission blocked", page.evaluate('''() => {
      try {window.ArtemisNicolasPhase1.connectEngine({});return false}
      catch(e){return String(e).includes('before launch authorization')}
    }'''))
    page.wait_for_function("document.querySelector('.v3-burn-progress')?.textContent?.includes('100%')",timeout=15000)
    page.wait_for_function("document.querySelector('[data-action=v3-complete-phase1]')!==null",timeout=15000)
    check("Burn displays completed visual state", '100%' in page.locator('.v3-burn-progress').inner_text())
    page.locator('[data-action=v3-complete-phase1]').click()
    handoff=page.evaluate('window.ArtemisNicolasPhase1.getPhase1Handoff()')
    check("Handoff preserves burn receipt and remaining reserve",handoff['resources']['maneuverReserveMps']==2720 and handoff['departureReceipt']['usedDeltaVMps']==480)
    check("Handoff preserves complete ordered milestones",handoff['completedPhases']==[1] and all(any(event['type']==t for event in handoff['history']) for t in ['checklist-approved','liftoff','departure-burn','phase-complete']))
    check("Science data accounting remains conserved",handoff['resources']['scienceCollectedMb']==handoff['resources']['bufferCurrentMb']+handoff['resources']['scienceTransmittedMb']+handoff['resources']['scienceLostMb'])
    check("No JavaScript runtime errors",not failures)
    browser.close()

print(json.dumps({'total':len(checks),'passed':sum(v for _,v in checks)},indent=2))
