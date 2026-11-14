"""Verify that English narration completes with matching visual scenes.

Mocks utterance callbacks rather than relying on local speech engines or sound hardware.
Run with: python tests/narration-sync-browser-test.py
"""
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
HTML = (ROOT / 'index.html').read_text(encoding='utf-8')


def check(ok, message):
    assert ok, message
    print(f'PASS {message}')


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=shutil.which('chromium') or shutil.which('chromium-browser') or None, args=['--no-sandbox', '--disable-dev-shm-usage'])
    page = browser.new_page(viewport={'width': 1366, 'height': 900}, reduced_motion='reduce')
    page.clock.install()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content(HTML, wait_until='load')
    page.evaluate("""() => {
      window.__spoken = [];
      window.__cancelled = 0;
      Object.defineProperty(window, 'speechSynthesis', {
        configurable:true,
        value:{
          getVoices(){ return [{lang:'en-US',name:'Narration test',localService:true}]; },
          speak(utterance){ window.__spoken.push(utterance); },
          cancel(){ window.__cancelled++; }
        }
      });
      window.SpeechSynthesisUtterance = class {
        constructor(text){ this.text=text; this.onend=null; this.onerror=null; }
      };
    }""")
    page.locator('[data-action="select-phase"][data-index="1"]').click()
    check(page.locator('#app-shell').get_attribute('data-visual-scene') == 'moon', 'Moon image highlight precedes Moon narration')
    check(page.evaluate('window.__spoken.at(-1).text').startswith('Explore the far side'), 'Moon text is spoken with lunar scene')
    first = page.evaluate('window.__spoken.length - 1')
    page.locator('[data-action="select-phase"][data-index="2"]').click()
    check(page.locator('#app-shell').get_attribute('data-visual-scene') == 'earth-return', 'Return image highlight precedes return narration')
    check(page.evaluate('window.__spoken.at(-1).text').startswith('Bring the crew home'), 'Return narration matches return scene')
    text_before = page.locator('#mission-caption-text').inner_text()
    page.evaluate('(index) => window.__spoken[index].onend?.()', first)
    check(page.locator('#mission-caption-text').inner_text() == text_before, 'Stale Moon speech completion cannot overwrite Earth scene')

    page.locator('[data-action="to-hangar"]').click()
    page.locator('[data-action="to-checklist"]').click()
    page.locator('[data-action="run-diagnostics"]').click()
    check(page.locator('.check-item--scanning').count() == 0, 'System scan waits until introductory narration has ended')
    check('beginning pre-launch diagnostics' in page.evaluate('window.__spoken.at(-1).text'), 'Diagnostic intro spoken before first light turns scanning')
    page.evaluate('window.__spoken.at(-1).onend()')
    for i, system in enumerate(['Vehicle mass','Electrical power','Thermal protection','Communications link','Propellant reserve'], 1):
        check(page.locator('.check-item--scanning').count() == 1, f'Check {i} image becomes active before speech')
        check(page.locator('#mission-captions').get_attribute('data-scene') == f'check-{i}', f'Check {i} caption matches active check image')
        check(page.evaluate('window.__spoken.at(-1).text') == f'Checking {system}.', f'Check {i} announces the active system')
        page.evaluate('window.__spoken.at(-1).onend()')
        check(page.locator('.check-item--green').count() == i, f'Check {i} turns GREEN after checking announcement')
        check(page.evaluate('window.__spoken.at(-1).text').startswith(f'{system}: GREEN'), f'Check {i} result caption and spoken result agree')
        page.evaluate('window.__spoken.at(-1).onend()')
        page.clock.run_for(200)

    check(page.locator('[data-action="start-countdown"]').is_enabled(), 'Launch enables only after five narrated and visible results')
    check('five green checks confirmed' in page.evaluate('window.__spoken.at(-1).text').lower(), 'All-green diagnostic clearance uses truthful words')
    page.locator('[data-action="start-countdown"]').click()
    check(page.locator('.countdown-stage strong').inner_text() == 'GO', 'Clearance image persists during clearance announcement')
    check(page.locator('#mission-captions').get_attribute('data-scene') == 'countdown-clearance', 'Clearance narration synchronized with clearance image')
    page.evaluate('window.__spoken.at(-1).onend()')
    check(page.locator('.countdown-stage strong').inner_text() == '10', 'Ten appears before Ten is spoken')
    check(page.evaluate('window.__spoken.at(-1).text') == 'Ten.', 'Ten is spoken with displayed 10')
    check(page.locator('#mission-captions').get_attribute('data-scene') == 'countdown-10', 'Ten caption uses correct scene identifier')
    page.clock.run_for(1500)
    check(page.locator('.countdown-stage strong').inner_text() == '10', 'Slow voice delays countdown instead of clipping Ten')
    page.evaluate('window.__spoken.at(-1).onend()')
    page.clock.run_for(1000)
    check(page.locator('.countdown-stage strong').inner_text() == '09', 'Next number displayed only after Ten ends')
    check(page.evaluate('window.__spoken.at(-1).text') == 'Nine.', 'Nine narration matches displayed 09')
    page.locator('[data-action="toggle-voice"]').click()
    check('Narration muted' in page.locator('#mission-caption-text').inner_text(), 'Muting replaces spoken voice with captions')
    page.clock.run_for(1100)
    check(page.locator('.countdown-stage strong').inner_text() in ('08','07'), 'Muted voice does not freeze the countdown')
    page.locator('[data-action="abort-countdown"]').click()
    page.clock.run_for(3000)
    check(page.locator('.countdown-stage').count() == 0, 'Abort prevents a late speech callback launching the mission')
    check(not errors, 'No uncaught browser exceptions in voice synchronization tests')
    browser.close()
print('ALL SPEECH / VISUAL SYNCHRONIZATION TESTS PASSED')
