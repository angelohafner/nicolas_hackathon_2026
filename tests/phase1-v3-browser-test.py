"""Smoke-test the Phase 1 path in a Chromium browser; voice is disabled for deterministic timing."""
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright
HTML=(Path(__file__).resolve().parents[1]/'index.html').read_text(encoding='utf-8')
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=shutil.which('chromium') or None,args=['--no-sandbox'])
 page=b.new_page();page.set_default_timeout(10000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(HTML);assert page.locator('html').get_attribute('lang')=='en-US'
 page.locator('[data-action="toggle-voice"]').click()
 page.locator('[data-action="to-hangar"]').first.click()
 assert page.locator('[data-v3-slot]').count()==5
 assert page.evaluate('window.ArtemisNicolasPhase1.getStatus().gates.eligible')
 page.locator('[data-action="to-checklist"]').first.click()
 assert page.locator('[data-action="start-countdown"]').is_disabled()
 page.locator('[data-action="run-diagnostics"]').click()
 page.wait_for_function('window.ArtemisNicolasPhase1.getStatus().diagnosticStatus==="complete"',timeout=25000)
 assert page.locator('[data-action="start-countdown"]').is_enabled()
 page.locator('[data-action="start-countdown"]').click()
 page.wait_for_function('document.querySelector(".v3-burn-page")!==null',timeout=40000)
 assert page.evaluate('window.ArtemisNicolasPhase1.getPhase1Handoff()===null')
 page.locator('[data-v3-burn-confirm]').check()
 initial=page.evaluate('window.ArtemisNicolasPhase1.getMissionState().resources.maneuverReserveMps')
 page.locator('[data-action="v3-execute-burn"]').click()
 assert initial-page.evaluate('window.ArtemisNicolasPhase1.getMissionState().resources.maneuverReserveMps')==480
 page.wait_for_function('document.querySelector("[data-action=v3-complete-phase1]")!==null',timeout=25000)
 page.locator('[data-action="v3-complete-phase1"]').click()
 handoff=page.evaluate('window.ArtemisNicolasPhase1.getPhase1Handoff()')
 assert handoff['phase']==2 and handoff['completedPhases']==[1]
 assert sum(x.get('type')=='departure-burn' for x in handoff['history'])==1
 assert handoff['resources']['maneuverReserveMps']==initial-480
 assert not errors,errors
 b.close()
print('PASS: Nicolas Phase 1 v3 end-to-end smoke flow')
