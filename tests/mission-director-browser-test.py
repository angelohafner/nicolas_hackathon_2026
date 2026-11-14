"""Browser tests for Nicolas's offline Mission Control HTML.

Requires Playwright and an installed Chromium. Scripts run inside page.set_content,
so the final app remains usable without an internet connection.
"""
import json
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / 'index.html'
html = HTML.read_text(encoding='utf-8')
passed = []
errors = []


def verify(condition, label):
    if not condition:
        raise AssertionError(label)
    passed.append(label)


def new_page(browser, width=1366, height=900):
    page = browser.new_page(viewport={'width': width, 'height': height}, reduced_motion='reduce')
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.clock.install()
    page.set_content(html, wait_until='load', timeout=20000)
    return page


def to_checklist(page):
    page.locator('[data-action="to-hangar"]').click()
    page.locator('[data-action="to-checklist"]').click()


def scan(page):
    page.locator('[data-action="run-diagnostics"]').click()
    page.clock.run_for(12500)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=shutil.which('chromium') or shutil.which('chromium-browser') or None, args=['--no-sandbox', '--disable-dev-shm-usage'])
    page = new_page(browser)
    verify(page.locator('html').get_attribute('lang') == 'en-US', 'US English document language')
    verify(page.locator('[data-action="select-phase"]').count() == 3, 'Three clickable learning phases')
    verify(page.locator('[data-action="select-rule"]').count() == 4, 'Four clickable resource cards')
    page.locator('[data-action="select-phase"][data-index="1"]').click()
    verify(page.locator('#app-shell').get_attribute('data-visual-scene') == 'moon', 'Selecting lunar phase focuses Moon in the background')
    verify(page.locator('#mission-captions').get_attribute('data-scene') == 'briefing-phase-2', 'Lunar scene narration matches selected lunar lesson')
    verify('Explore the far side' in page.locator('.explore-detail').inner_text(), 'Phase selection updates lesson')
    page.locator('[data-action="select-rule"][data-index="2"]').click()
    verify(page.locator('#mission-captions').get_attribute('data-scene') == 'briefing-rule-3', 'Communications narration matches its visible resource card')
    verify('Store' in page.locator('.rule-inspector').inner_text() or 'buffer' in page.locator('.rule-inspector').inner_text().lower(), 'Rule selection updates explanation')
    page.locator('[data-action="listen-briefing"]').click()
    verify('welcome to artemis' in page.locator('#mission-caption-text').inner_text().lower(), 'Spoken script has accessible captions')
    page.locator('[data-action="toggle-voice"]').click()
    verify('Narration muted' in page.locator('#mission-caption-text').inner_text(), 'Muted narration still produces captions')
    page.locator('[data-action="toggle-voice"]').click()
    verify('VOICE ON' in page.locator('.header-voice').inner_text(), 'Voice control can be re-enabled')
    page.locator('[data-key="tips"]').uncheck()
    to_checklist(page)
    verify('educational simulation' in page.locator('.checklist-footnote').inner_text().lower(), 'NASA CML 4 disclaimer remains visible with tips off')
    page.locator('[data-action="to-hangar"]').click()
    page.locator('[data-action="to-briefing"]').click()
    page.locator('[data-key="tips"]').check()
    to_checklist(page)
    verify(page.locator('[data-action="start-countdown"]').is_disabled(), 'Launch locked before a diagnostic run')
    verify(page.locator('.check-item-status').first.inner_text() == 'PENDING', 'Checks start as pending')
    page.locator('[data-action="run-diagnostics"]').click()
    page.clock.run_for(1600)
    verify(page.locator('.check-item-status').first.inner_text() in ('SCANNING','GREEN / PASS'), 'First check advances independently')
    verify(page.locator('[data-action="start-countdown"]').count() == 1 and page.locator('[data-action="start-countdown"]').is_disabled(), 'Cannot launch during scanning')
    page.clock.run_for(11000)
    verify(page.locator('.diagnostic-rail-copy').inner_text().startswith('SCAN COMPLETE'), 'Five checks finish')
    verify(page.locator('.check-item--green').count() == 5, 'Nominal vehicle passes five checks')
    verify(page.locator('[data-action="start-countdown"]').is_enabled(), 'Nominal vehicle authorized after diagnostics')
    verify(page.locator('#mission-caption-text').inner_text().find('five green checks') >= 0, 'Nominal GO voice statement agrees with all five indicators')
    page.locator('[data-action="start-countdown"]').click()
    verify(page.locator('#mission-captions').get_attribute('data-scene') == 'countdown-clearance', 'Launch clearance voice is paired with clearance image')
    page.clock.run_for(6100)
    verify(page.locator('.countdown-stage').count() == 1, 'Ten-second countdown shown')
    verify(int(page.locator('.countdown-stage strong').inner_text()) in range(1, 10), 'Countdown advances after the clearance announcement')
    countdown_number = int(page.locator('.countdown-stage strong').inner_text())
    verify(page.locator('#mission-captions').get_attribute('data-scene') == f'countdown-{countdown_number}', 'Spoken countdown number matches displayed number')
    page.locator('[data-action="abort-countdown"]').click()
    verify(page.locator('[data-action="start-countdown"]').is_enabled(), 'Abort returns to verified launch-ready state')
    page.clock.run_for(11000)
    verify(page.locator('h1').inner_text() == 'Launch readiness.', 'Aborted launch cannot advance automatically')
    page.locator('[data-action="start-countdown"]').click()
    page.clock.run_for(17000)
    verify('Mission in progress.' == page.locator('h1').inner_text(), 'Full countdown starts the flight demo')
    verify(page.locator('#app-shell').get_attribute('data-visual-scene') == 'earth', 'Flight begins with Earth imagery')
    for stage in range(3):
        page.locator('[data-action="advance"]').click()
        page.clock.run_for(1)
        expected_scene = 'moon' if stage == 0 else 'earth-return'
        verify(page.locator('#app-shell').get_attribute('data-visual-scene') == expected_scene, f'Flight step {stage+1} switches scene before narration')
        verify(page.locator('#mission-captions').get_attribute('data-scene') == ('flight-complete' if stage == 2 else f'flight-phase-{stage+2}'), f'Flight step {stage+1} narration belongs to visible scene')
    page.locator('[data-action="to-debrief"]').click()
    verify('Welcome home' in page.locator('.debrief-result-copy').inner_text(), 'Debrief correctly reports crew safety')
    verify(page.locator('.medal-card--earned').count() == 4, 'Four game medals awarded for success')
    verify('April 10, 2026' in page.locator('.reality-panel').inner_text(), 'Final report includes NASA splashdown date')
    verify(page.locator('.reality-comparison .comparison-pair').count() == 3, 'Side-by-side educational NASA comparison has three grounded measures')
    page.locator('[data-action="review-results"]').click()
    verify(page.locator('.review-phase').count() == 3, 'Review shows three linked phase records')
    page.locator('[data-action="reset"]').first.click()
    to_checklist(page)
    verify(page.locator('[data-action="start-countdown"]').is_disabled(), 'New playthrough invalidates prior authorization')
    page.close()

    faults = [
        ('Excess mass blocks launch', {'totalMassKg': 28500}, False),
        ('Depleted battery blocks launch', {'batteryChargePercent': 0}, False),
        ('Missing heat shield blocks launch', {'heatShieldInstalled': False}, False),
        ('No maneuvering reserve blocks launch', {'fuelRemainingDeltaV': 0}, False),
        ('Four green and one noncritical red permits launch', {'antennaActive': False}, True),
        ('Negative power balance blocks launch', {'powerBalanceWatts': -35}, False),
        ('Zero power balance blocks launch', {'powerBalanceWatts': 0}, False),
        ('Four green and one yellow permits launch', {'batteryChargePercent': 15}, True),
        ('Three green and two yellow blocks launch', {'totalMassKg': 23500, 'batteryChargePercent': 15}, False),
    ]
    for label, overrides, expected in faults:
        test = new_page(browser)
        to_checklist(test)
        test.evaluate('(overrides) => window.ArtemisNicolas.setShipSnapshot(overrides)', overrides)
        scan(test)
        verify(test.locator('[data-action="start-countdown"]').is_enabled() == expected, label)
        if overrides.get('antennaActive') is False:
            verify('Communications remain offline' in test.locator('#mission-caption-text').inner_text(), 'GO with inactive antenna has a communications warning')
            verify('GO WITH CAUTION' in test.locator('.launch-verdict').inner_text(), 'Partial GO is explicitly visible')
            test.locator('[data-action="start-countdown"]').click()
            verify('all stations report GO' not in test.locator('#mission-caption-text').inner_text().lower(), 'Countdown does not falsely report all stations GO')
        test.close()

    test = new_page(browser)
    to_checklist(test)
    scan(test)
    verify(test.locator('[data-action="start-countdown"]').is_enabled(), 'State is GO before external update')
    invalid_data = [
        {'totalMassKg': -100}, {'batteryChargePercent': 5000},
        {'heatShieldInstalled': 'false'}, {'antennaActive': 0},
        {'powerBalanceWatts': '100'}, {'fuelRemainingDeltaV': -1},
        {'scienceDataTransmittedMb': 20, 'scienceDataCollectedMb': 10},
    ]
    for bad in invalid_data:
        result = test.evaluate('''(data) => { try { window.ArtemisNicolas.setShipSnapshot(data); return 'accepted'; } catch (e) { return e.message; } }''', bad)
        verify(result != 'accepted', f'Invalid integration payload rejected: {list(bad)[0]}')
        verify(test.locator('[data-action="start-countdown"]').is_disabled(), 'Invalid input invalidates past launch authorization')
        verify(test.locator('.integration-error').count() == 1, 'Input error shown to Flight Director')
    test.evaluate('window.ArtemisNicolas.setShipSnapshot({batteryChargePercent: 86})')
    verify(test.locator('.integration-error').count() == 0, 'Valid engineering update clears integration warning')
    scan(test)
    verify(test.locator('[data-action="start-countdown"]').is_enabled(), 'Valid corrected state can be rescanned and approved')
    test.evaluate('window.ArtemisNicolas.setShipSnapshot({totalMassKg: 21250})')
    verify(test.locator('[data-action="start-countdown"]').is_disabled(), 'External state update invalidates scan even if still within limits')
    test.locator('[data-action="run-diagnostics"]').click()
    test.clock.run_for(1700)
    test.locator('[data-action="cancel-diagnostics"]').click()
    verify('CANCEL' in test.locator('.console-lines').inner_text().upper(), 'Diagnostic scan can be canceled by Flight Director')
    test.close()

    for width in (390, 768, 1366):
        test = new_page(browser, width, 840)
        verify(test.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2'), f'No page overflow at {width}px')
        to_checklist(test)
        verify(test.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 2'), f'No checklist overflow at {width}px')
        test.close()
    verify(not errors, 'No uncaught JavaScript exceptions')
    browser.close()

result = {'passed': len(passed), 'tests': passed, 'uncaughtErrors': errors}
(ROOT / 'docs' / 'EN_US_TEST_REPORT.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print('PASS', len(passed), 'browser checks')
for test in passed: print('  ✓', test)
