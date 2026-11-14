"""Run static-screen responsive checks for Nicolas's primary Phase 1 UI."""
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright

html=(Path(__file__).resolve().parents[1]/'index.html').read_text(encoding='utf8')
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
    checks=0
    for width in [390,768,1366]:
        page=browser.new_page(viewport={'width':width,'height':820},reduced_motion='reduce')
        page.set_content(html)
        if page.locator('[data-action="toggle-voice"]').count():page.locator('[data-action="toggle-voice"]').click()
        def measure(stage):
            global checks
            actual=page.evaluate('({width:window.innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth})')
            print(f'{width} {stage}: {actual}',flush=True)
            assert actual['document']<=width+3 and actual['body']<=width+3,(stage,actual)
            checks+=1
        measure('briefing')
        page.get_by_role('button', name='START PHASE 1').click()
        measure('assembly')
        page.get_by_role('button',name='OPEN FLIGHT READINESS CHECKLIST').click()
        measure('checklist')
        page.close()
    print('PASS',checks,'responsive screen-width assertions')
    browser.close()
