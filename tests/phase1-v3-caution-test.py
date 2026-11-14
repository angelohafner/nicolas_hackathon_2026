"""Exercise the four-green amber-caution risk acknowledgement rule."""
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright
s=(Path(__file__).resolve().parents[1]/'index.html').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path=shutil.which('chromium') or None,args=['--no-sandbox'])
 q=b.new_page();q.set_content(s);q.locator('[data-action="toggle-voice"]').click()
 q.locator('[data-action="to-hangar"]').first.click()
 q.locator('[data-action="v3-energy-caution"]').click()
 q.locator('[data-action="to-checklist"]').first.click()
 q.locator('[data-action="run-diagnostics"]').click()
 q.wait_for_function('window.ArtemisNicolasPhase1.getStatus().diagnosticStatus==="complete"',timeout=25000)
 r=q.evaluate('window.ArtemisNicolas.getReadiness()')
 assert r['greens']==4 and r['criticalReds']==0 and r['approved']
 assert not r['authorized'] and q.locator('[data-action="start-countdown"]').is_disabled()
 q.locator('[data-v3-ack]').check()
 assert q.evaluate('window.ArtemisNicolas.getReadiness().authorized')
 q.locator('[data-v3-ack]').uncheck()
 assert not q.evaluate('window.ArtemisNicolas.getReadiness().authorized')
 b.close()
print('PASS: amber caution requires explicit user acknowledgement')
