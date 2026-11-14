/*
 * Artemis II: Lunar Odyssey — Nicolas / Mission Director experience.
 * English (United States) upgrade for the standalone offline HTML.
 * This is an educational game, not operational NASA launch software.
 * The team physics engine remains independent from this presentation layer.
 */
(() => {
  'use strict';

  const formatNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const fmt = value => formatNumber.format(Number(value) || 0);
  const fmtDecimal = (value, digits = 1) => Number(value).toFixed(digits);
  const escape = value => safeText(value);

  phases.splice(0, phases.length,
    ['Earth Orbit', 'Checkout and departure'],
    ['Lunar Far Side', 'Science and communications'],
    ['Earth Return', 'Reentry and recovery']
  );
  steps.splice(0, steps.length,
    ['briefing', 'BRIEFING'], ['hangar', 'TEST LAB'],
    ['checklist', 'CML 4'], ['flight', 'DEMO FLIGHT'],
    ['debrief', 'DEBRIEF']
  );
  const englishResources = [
    ['Spacecraft mass', 'A 15% design margin is a simplified game assumption, not a NASA SLS specification.'],
    ['Power and battery', 'Solar arrays generate energy in sunlight, while batteries support the spacecraft through eclipses.'],
    ['Thermal protection', 'The heat shield helps protect the Orion crew module during atmospheric reentry.'],
    ['Communications', 'The Moon can block direct line-of-sight radio communication with Earth. The spacecraft stores data until contact returns.'],
    ['Propellant reserve', 'Delta-v represents the spacecraft’s ability to change velocity with propulsive maneuvers.']
  ];
  resources.forEach((resource, index) => {
    resource.label = englishResources[index][0];
    resource.tip = englishResources[index][1];
  });
  Object.assign(NASA, {
    launch: 'April 1, 2026', splash: 'April 10, 2026',
    duration: '9 days, 1 hour, 32 minutes',
    type: 'Crewed lunar flyby — no landing',
    landing: 'Pacific Ocean off California',
    crew: 'Reid Wiseman, Victor Glover, Christina Koch, and Jeremy Hansen'
  });

  const lessons = [
    {
      eyebrow: 'PHASE 01 / EARTH ORBIT', title: 'Prepare for the journey',
      body: 'After launch, Orion’s crew checks key systems in Earth orbit before departing for the Moon.',
      challenge: 'Your objective: preserve enough power and maneuvering capability for the entire journey.',
      fact: 'Artemis II was a crewed test flight of the SLS rocket and Orion spacecraft.'
    },
    {
      eyebrow: 'PHASE 02 / LUNAR FAR SIDE', title: 'Explore the far side',
      body: 'The Moon can interrupt direct radio communication with Earth. Data collected during a blackout must be buffered until the connection returns.',
      challenge: 'Your objective: protect the battery, keep the science buffer available, and restore communications.',
      fact: 'A radio blackout is caused by line-of-sight obstruction; it is not the same as a solar eclipse.'
    },
    {
      eyebrow: 'PHASE 03 / EARTH RETURN', title: 'Bring the crew home',
      body: 'The Orion capsule separates from its service module and enters Earth’s atmosphere protected by its heat shield.',
      challenge: 'Your objective: manage the remaining resources and guide a safe splashdown.',
      fact: 'The real Artemis II crew splashed down in the Pacific Ocean on April 10, 2026.'
    }
  ];
  const ruleLessons = [
    {
      code: 'MASS', title: 'Mass vs. SLS', iconKey: 'gauge', tone: 'cyan',
      short: 'Keep the spacecraft inside the mass budget.',
      details: 'Extra equipment adds mass. In this game, a 15% design margin is encouraged to avoid the yellow caution zone.',
      target: `Game limit: ${fmt(MASS_LIMIT)} kg · Green below ${fmt(MASS_GREEN)} kg`
    },
    {
      code: 'ENERGY', title: 'Solar power and eclipses', iconKey: 'battery', tone: 'amber',
      short: 'Keep battery charge available.',
      details: 'Solar generation can decrease during an eclipse. Battery capacity and power balance help keep critical systems running.',
      target: 'Game goal: a positive energy reserve and adequate battery charge'
    },
    {
      code: 'RADIO', title: 'Blackout and data buffer', iconKey: 'radio', tone: 'mint',
      short: 'Store scientific data when Earth is out of view.',
      details: 'A radio blackout does not mean science has stopped. Collected data can be buffered and downloaded later.',
      target: 'Game goal: keep the communications system operational'
    },
    {
      code: 'FUEL', title: 'Propellant and delta-v', iconKey: 'fuel', tone: 'violet',
      short: 'Reserve propellant for important maneuvers.',
      details: 'The game represents remaining maneuvering capability as delta-v. The values are educational and do not represent actual Orion flight telemetry.',
      target: 'Game goal: retain a safe maneuvering reserve'
    }
  ];

  state.ui = {
    selectedPhase: 0, selectedRule: 0, resultsExpanded: false,
    scoreAnimated: false, audioHelp: false,
    validationError: null,
    diagnostics: { status: 'idle', entries: [], revealed: [], activeIndex: -1, progress: 0, signature: null, result: null, remaining: 10, history: [] }
  };
  const diagnostics = () => state.ui.diagnostics;
  const audio = { enabled: true, volume: .85, caption: 'Voice narration is optional. Choose “Hear mission briefing” to begin.', supported: 'speechSynthesis' in window };
  const task = { handles: new Set(), generation: 0, countdown: null };

  const shipSignature = ship => JSON.stringify([
    ship.totalMassKg, ship.batteryChargePercent, ship.powerBalanceWatts,
    ship.heatShieldInstalled, ship.heatShieldHealthPercent,
    ship.antennaActive, ship.fuelRemainingDeltaV
  ]);
  const queue = (callback, delay) => {
    const token = task.generation;
    const handle = window.setTimeout(() => {
      task.handles.delete(handle);
      if (token === task.generation) callback();
    }, delay);
    task.handles.add(handle);
    return handle;
  };
  function clearAsync() {
    task.generation += 1;
    task.handles.forEach(handle => window.clearTimeout(handle));
    task.handles.clear();
    if (task.countdown !== null) window.clearInterval(task.countdown);
    task.countdown = null;
  }
  function voiceStatus() {
    if (!audio.enabled) return 'VOICE OFF · CAPTIONS ACTIVE';
    if (!audio.supported) return 'VOICE UNAVAILABLE · CAPTIONS ACTIVE';
    const voices = window.speechSynthesis.getVoices();
    if (!voices.some(voice => (voice.lang || '').toLowerCase().startsWith('en-us'))) {
      return 'EN-US VOICE NOT DETECTED · CAPTIONS ACTIVE';
    }
    return 'EN-US VOICE AVAILABLE · CAPTIONS ACTIVE';
  }
  // The narration token prevents stale utterance callbacks from advancing an old scene.
  // Each narrated step completes after the en-US utterance ends, or by a caption-only fallback.
  let narrationToken = 0;
  let narrationFallback = null;
  let narrationContinuation = null;
  const sceneKey = () => {
    if (state.screen === 'briefing') return `briefing-phase-${state.ui.selectedPhase + 1}`;
    if (state.screen === 'flight') return state.flight?.phaseIndex === 3 ? 'flight-complete' : `flight-phase-${(state.flight?.phaseIndex || 0) + 1}`;
    if (state.screen === 'checklist') {
      const d = diagnostics();
      return d.status === 'countdown' ? `countdown-${d.clearance ? 'clearance' : d.remaining}` :
        d.status === 'liftoff' ? 'liftoff' : d.activeIndex >= 0 ? `check-${d.activeIndex + 1}` : 'checklist';
    }
    return state.screen;
  };
  const speech = {
    stop() {
      narrationToken++;
      narrationContinuation = null;
      if (narrationFallback !== null) window.clearTimeout(narrationFallback);
      narrationFallback = null;
      if (audio.supported) {
        try { window.speechSynthesis.cancel(); } catch (_error) { /* Captions remain available. */ }
      }
    },
    takeContinuation() {
      // User-initiated mute/unmute must not freeze an in-flight check or countdown.
      const continuation = narrationContinuation;
      this.stop();
      return continuation;
    },
    say(message, options = {}) {
      this.stop();
      const token = narrationToken;
      narrationContinuation = typeof options.onDone === 'function' ? options.onDone : null;
      audio.caption = String(message);
      const scene = options.scene || sceneKey();
      const shell = document.getElementById('app-shell');
      if (shell) shell.dataset.narrationScene = scene;
      const bar = document.getElementById('mission-captions');
      const captionText = document.getElementById('mission-caption-text');
      if (captionText) captionText.textContent = audio.caption;
      if (bar) {
        bar.classList.add('mission-captions--active');
        bar.dataset.scene = scene;
      }
      let finished = false;
      const done = () => {
        if (finished || token !== narrationToken) return;
        finished = true;
        if (narrationFallback !== null) window.clearTimeout(narrationFallback);
        narrationFallback = null;
        narrationContinuation = null;
        if (typeof options.onDone === 'function') options.onDone();
      };
      const captionDuration = Math.max(450, options.captionDuration || 550);
      const captionFallback = () => {
        if (typeof options.onDone === 'function') narrationFallback = window.setTimeout(done, captionDuration);
      };
      if (options.captionOnly || !audio.enabled || !audio.supported) { captionFallback(); return; }
      try {
        const availableVoices = window.speechSynthesis.getVoices();
        const englishVoices = availableVoices.filter(v => (v.lang || '').toLowerCase().startsWith('en-us'));
        if (!englishVoices.length) { captionFallback(); return; }
        const selection = englishVoices.find(v => v.localService) || englishVoices[0];
        const utterance = new SpeechSynthesisUtterance(audio.caption);
        utterance.lang = 'en-US';
        utterance.voice = selection;
        utterance.volume = audio.volume;
        utterance.rate = options.rate || .97;
        utterance.pitch = .98;
        utterance.onend = done;
        utterance.onerror = done;
        // Browser speech engines occasionally omit onend: never freeze the sequence.
        const wordCount = audio.caption.trim().split(/\s+/).length;
        const timeoutMs = Math.min(18000, Math.max(1800, 1400 + wordCount * 400));
        narrationFallback = window.setTimeout(done, timeoutMs);
        window.speechSynthesis.speak(utterance);
      } catch (_error) {
        if (narrationFallback !== null) window.clearTimeout(narrationFallback);
        narrationFallback = null;
        captionFallback();
      }
    }
  };
  function ensureCaptions() {
    let node = document.getElementById('mission-captions');
    if (node) return;
    node = document.createElement('section');
    node.id = 'mission-captions';
    node.className = 'mission-captions';
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-label', 'Mission Control captions');
    node.innerHTML = `<span class="caption-emblem">${icon('radio', 17)}</span>
      <div class="caption-copy"><strong>MISSION CONTROL · CLOSED CAPTIONS</strong>
      <span id="mission-caption-text"></span></div>
      <button type="button" class="caption-hide" data-action="hide-caption" aria-label="Hide caption">×</button>`;
    document.body.appendChild(node);
    document.getElementById('mission-caption-text').textContent = audio.caption;
  }

  function cancelDiagnosticSession(announce = false) {
    const d = diagnostics();
    if (d.status === 'running' || d.status === 'countdown' || d.status === 'liftoff') {
      clearAsync();
      speech.stop();
      state.ui.diagnostics = {
        status: 'idle', entries: [], revealed: [], activeIndex: -1,
        progress: 0, signature: null, result: null, remaining: 10, history: []
      };
      if (announce) speech.say('Countdown or diagnostics canceled. The spacecraft remains on the ground.');
    }
  }
  function invalidateDiagnostics(message = '') {
    clearAsync();
    state.ui.diagnostics = {
      status: 'idle', entries: message ? [{ message, tone: 'warn', time: new Date().toLocaleTimeString('en-US', { hour12: false }) }] : [], revealed: [],
      activeIndex: -1, progress: 0, signature: null, result: null,
      remaining: 10, history: []
    };
  }
  function systemMessage(message, tone = 'info') {
    const d = diagnostics();
    d.entries.push({ message, tone, time: new Date().toLocaleTimeString('en-US', { hour12: false }) });
    if (d.entries.length > 10) d.entries.shift();
  }
  const systemNames = [
    'Vehicle mass', 'Electrical power', 'Thermal protection',
    'Communications link', 'Propellant reserve'
  ];
  const diagnosticSummary = (item, index) => {
    const shortStatus = item.status === 'green' ? 'GREEN. Nominal.' : item.status === 'yellow' ? 'YELLOW. Caution.' : 'RED. Check failed.';
    return `${systemNames[index]}: ${shortStatus}`;
  };
  function clearanceAnnouncement(result, forCountdown = false) {
    if (result.greens === 5) return forCountdown
      ? 'Flight Director, all five stations report GO. Artemis II is cleared for launch. Initiating terminal countdown.'
      : 'Flight Director, five green checks confirmed. Artemis II is cleared for the terminal countdown.';
    const remaining = result.items.filter(item => item.status !== 'green');
    const caution = remaining.some(item => item.id === 'antenna')
      ? 'Communications remain offline; science data will stay in the onboard buffer.'
      : 'One noncritical caution remains on the checklist.';
    return forCountdown
      ? `Flight Director, four green checks meet the game launch criteria. ${caution} Launch authorized with caution. Initiating terminal countdown.`
      : `Flight Director, four of five checks are green. ${caution} Educational launch criteria satisfied with caution.`;
  }
  function runDiagnostics() {
    if (state.screen !== 'checklist') return;
    if (diagnostics().status === 'running' || diagnostics().status === 'countdown') return;
    clearAsync();
    if (state.ui.validationError) {
      systemMessage(`INVALID SPACECRAFT DATA · ${state.ui.validationError}`, 'bad');
      speech.say('Flight Director, invalid spacecraft data. Correct the integration input before launch diagnostics.');
      render();
      return;
    }
    const signature = shipSignature(state.ship);
    const result = checklist({ ...state.ship });
    const d = {
      status: 'running', entries: [], revealed: Array(5).fill(null), activeIndex: -1,
      progress: 0, signature, result, remaining: 10, history: []
    };
    state.ui.diagnostics = d;
    const current = () => state.screen === 'checklist' && d === diagnostics() &&
      signature === shipSignature(state.ship) && !state.ui.validationError;
    systemMessage('DIAGNOSTICS INITIALIZED · Scanning five launch requirements.');
    render();
    speech.say('Flight Director, beginning pre-launch diagnostics. All stations, stand by.', {
      scene: 'checklist',
      onDone: () => { if (current()) scan(0); }
    });
    function scan(index) {
      if (!current()) return;
      if (index >= 5) {
        d.activeIndex = -1;
        d.status = 'complete';
        const verdict = d.result.approved;
        systemMessage(verdict
          ? `GO VERIFIED · ${d.result.greens}/5 GREEN · no critical RED findings.`
          : `LAUNCH HOLD · ${d.result.greens}/5 GREEN · ${d.result.criticalReds} critical RED finding(s).`, verdict ? 'good' : 'bad');
        render();
        speech.say(verdict ? clearanceAnnouncement(d.result) :
          'Flight Director, we are NO-GO for launch. Review the highlighted systems and run diagnostics again.', {scene:'checklist'});
        return;
      }
      d.activeIndex = index;
      systemMessage(`CHECK 0${index + 1} · ${systemNames[index].toUpperCase()} · IN PROGRESS`);
      render();
      speech.say(`Checking ${systemNames[index]}.`, {
        scene: `check-${index+1}`,
        onDone: () => {
          if (!current()) return;
          const item = d.result.items[index];
          d.revealed[index] = item.status;
          d.progress = index + 1;
          const tone = item.status === 'green' ? 'good' : item.status === 'red' ? 'bad' : 'warn';
          systemMessage(`CHECK 0${index + 1} · ${diagnosticSummary(item, index)}`, tone);
          d.history.push({ id: item.id, status: item.status, value: item.value, detail: item.detail });
          render();
          speech.say(diagnosticSummary(item, index), {
            scene: `check-${index+1}`,
            onDone: () => {
              if (!current()) return;
              d.activeIndex = -1;
              render();
              queue(() => scan(index + 1), 180);
            }
          });
        }
      });
    }
  }
  const isVerifiedForLaunch = () => {
    const d = diagnostics();
    return !state.ui.validationError && d.status === 'complete' && d.result && d.result.approved &&
      d.signature === shipSignature(state.ship) && checklist(state.ship).approved;
  };
  function cancelRunningDiagnostics() {
    if (diagnostics().status !== 'running') return;
    invalidateDiagnostics('Diagnostic scan canceled by Flight Director.');
    speech.say('Flight Director, pre-launch diagnostics canceled.');
    render();
  }
  function startCountdown() {
    if (!isVerifiedForLaunch() || state.screen !== 'checklist') {
      invalidateDiagnostics('Launch authorization expired. Run diagnostics again.');
      speech.say('Launch on hold. A new systems check is required.');
      render();
      return;
    }
    const d = diagnostics();
    const verifiedSignature = d.signature;
    d.status = 'countdown';
    d.remaining = 10;
    d.clearance = true;
    systemMessage('MISSION CONTROL · Flight Director clearance confirmed.');
    render();
    const stillCleared = () => d === diagnostics() && d.status === 'countdown' &&
      state.screen === 'checklist' && verifiedSignature === shipSignature(state.ship) &&
      !state.ui.validationError && checklist(state.ship).approved;
    const tick = number => {
      if (!stillCleared()) return;
      if (number === 0) {
        d.status = 'liftoff';
        systemMessage('T PLUS ZERO · LIFTOFF', 'good');
        render();
        speech.say('Ignition. Liftoff! Artemis II is on its way!', {
          scene: 'liftoff', onDone: () => {
            if (d !== diagnostics() || d.status !== 'liftoff') return;
            state.flight = startFlight();
            goto('flight');
          }
        });
        return;
      }
      d.remaining = number;
      d.clearance = false;
      render();
      const start = performance.now();
      const word = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten'][number];
      speech.say(`${word}.`, {
        scene: `countdown-${number}`,
        onDone: () => {
          if (!stillCleared()) return;
          // Maintain at least a one-second cadence without clipping a slow voice.
          const rest = Math.max(0, 1000 - (performance.now() - start));
          queue(() => tick(number - 1), rest);
        }
      });
    };
    speech.say(clearanceAnnouncement(d.result, true), {
      scene: 'countdown-clearance',
      onDone: () => { if (stillCleared()) tick(10); }
    });
  }
  function abortCountdown() {
    const d = diagnostics();
    if (d.status !== 'countdown') return;
    clearAsync();
    d.status = 'complete';
    d.remaining = 10;
    d.clearance = false;
    systemMessage('HOLD · Countdown aborted by Flight Director.', 'warn');
    speech.say('Flight Director, countdown aborted. The launch vehicle remains safe.');
    render();
  }

  // The checker retains the original game thresholds while translating every result to en-US.
  checklist = function(ship = state.ship) {
    const mass = ship.totalMassKg > MASS_LIMIT ? 'red' : ship.totalMassKg > MASS_GREEN ? 'yellow' : 'green';
    const energy = ship.batteryChargePercent <= 0 || ship.powerBalanceWatts <= 0 ? 'red' :
      ship.batteryChargePercent <= 20 ? 'yellow' : 'green';
    const shield = !ship.heatShieldInstalled || ship.heatShieldHealthPercent <= 0 ? 'red' :
      ship.heatShieldHealthPercent < 60 ? 'yellow' : 'green';
    const antenna = ship.antennaActive ? 'green' : 'red';
    const fuel = ship.fuelRemainingDeltaV <= 0 ? 'red' :
      ship.fuelRemainingDeltaV < 1200 ? 'yellow' : 'green';
    const statuses = [mass, energy, shield, antenna, fuel];
    const values = [
      `${fmt(ship.totalMassKg)} kg`,
      `${fmt(ship.batteryChargePercent)}% · ${ship.powerBalanceWatts > 0 ? '+' : ''}${fmt(ship.powerBalanceWatts)} W`,
      ship.heatShieldInstalled ? `${fmt(ship.heatShieldHealthPercent)}% integrity` : 'NOT INSTALLED',
      ship.antennaActive ? 'LINK ACTIVE' : 'LINK OFFLINE',
      `${fmt(ship.fuelRemainingDeltaV)} m/s (Δv)`
    ];
    const descriptions = [
      mass === 'red' ? 'Vehicle mass exceeds the game limit.' : mass === 'yellow' ?
        'Within the game limit, but the recommended safety margin is not met.' : 'Mass is within the game limit and recommended 15% margin.',
      energy === 'red' ? 'Launch blocked: battery is depleted or net electrical power is not positive.' : energy === 'yellow' ?
        'Battery reserve is low; recharge before launch for a stronger safety margin.' : 'Battery is charged and electrical generation exceeds demand.',
      shield === 'red' ? 'The heat shield is missing or unusable.' : shield === 'yellow' ?
        'Thermal protection integrity is reduced.' : 'Thermal protection is installed and ready.',
      antenna === 'green' ? 'A communication link is available.' : 'Science data must remain in onboard buffer storage.',
      fuel === 'red' ? 'No maneuvering propellant remains.' : fuel === 'yellow' ?
        'Maneuvering reserve is reduced.' : 'Maneuvering reserve meets the game goal.'
    ];
    const items = resources.map((resource, index) => ({
      ...resource, status: statuses[index], value: values[index], detail: descriptions[index]
    }));
    const greens = items.filter(item => item.status === 'green').length;
    const criticalReds = items.filter(item => item.critical && item.status === 'red').length;
    return { items, greens, criticalReds, approved: greens >= 4 && criticalReds === 0 };
  };

  // Override presentation helpers; the simulation data and rules stay in their original module.
  meter = function(value, tone = 'cyan') {
    const bounded = Math.min(100, Math.max(0, value));
    return `<div class="meter-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${fmt(bounded)}"><div class="meter-fill meter-fill--${tone}" style="width:${bounded}%"></div></div>`;
  };
  footer = function() {
    return `<footer class="app-footer"><div class="footer-accent"><span></span><span></span><span></span></div>
      <div>${icon('radio',13)} MISSION CONTROL <b>/</b> PART 01 · NICOLAS</div>
      <div>${icon('activity',13)} EXPERIENCE v2.1 · EN-US</div>
      <div class="footer-right">${icon('shield',13)} EDUCATIONAL SIMULATION <span>•</span> NOT AN OFFICIAL NASA PRODUCT</div></footer>`;
  };
  header = function() {
    const index = steps.findIndex(item => item[0] === state.screen);
    return `<header class="app-header">
      <button class="header-brand" data-action="reset" title="Return to Mission Briefing">
        <span class="brand-orbit">${icon('moon',23)}</span>
        <span class="brand-wordmark"><strong>ARTEMIS <i>II</i></strong><small>LUNAR ODYSSEY</small></span>
      </button>
      <nav class="header-steps" aria-label="Mission progress">
        ${steps.map((item,i) => `<div class="header-step ${i===index?'header-step--current':i<index?'header-step--past':''}"><span>0${i+1}</span>${item[1]}</div>`).join('')}
      </nav>
      <div class="header-right">
        <span class="system-online"><span></span> SYSTEMS ONLINE</span>
        <span class="header-divider"></span>
        <button class="header-voice ${audio.enabled?'header-voice--on':''}" data-action="toggle-voice" aria-pressed="${audio.enabled}" title="Toggle English narration">${icon('radio',16)} ${audio.enabled?'VOICE ON':'VOICE OFF'}</button>
        <button class="header-sound-settings" data-action="toggle-sound-settings" aria-expanded="${state.ui.audioHelp}" title="Narration settings">${icon('sliders',16)}</button>
        <span class="header-name">${icon('shield',15)} NICOLAS · FLIGHT DIRECTOR</span>
      </div>
    </header>
    ${state.ui.audioHelp ? `<div class="audio-popover glass-panel" role="group" aria-label="Narration preferences">
      <div><strong>MISSION CONTROL AUDIO</strong><span>${escape(voiceStatus())}</span></div>
      <label for="voice-volume">VOICE VOLUME <b id="voice-volume-number">${fmt(audio.volume * 100)}%</b></label>
      <input id="voice-volume" type="range" min="0" max="100" step="5" value="${Math.round(audio.volume*100)}" />
      <div class="sound-buttons"><button class="button button--subtle" data-action="test-voice">${icon('radio',15)} TEST VOICE</button>
      <button class="button button--subtle" data-action="toggle-sound-settings">CLOSE</button></div>
      <small>Uses your browser’s en-US voice when available. Captions work without audio or internet access.</small>
    </div>` : ''}`;
  };
  slider = function(key, label, min, max, step, unit, iconKey) {
    const value = state.ship[key];
    return `<label class="slider-group"><span class="slider-heading"><span>${icon(iconKey,16)} ${label}</span>
      <strong><span id="value-${key}">${fmt(value)}</span> <small>${unit}</small></strong></span>
      <input aria-label="${escape(label)}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-key="${key}" />
      <span class="slider-extents"><small>${fmt(min)} ${unit}</small><small>${fmt(max)} ${unit}</small></span></label>`;
  };
  lights = function(status) {
    return `<span class="status-light status-light--${status}" role="img" aria-label="${{green:'Green: pass',yellow:'Yellow: caution',red:'Red: failed'}[status]}"></span>`;
  };
  preview = function() {
    const c = checklist();
    const ready = c.approved && !state.ui.validationError;
    return `<div class="readiness-preview ${ready?'readiness-preview--go':'readiness-preview--nogo'}">
      <div class="readiness-preview-top"><span>SPACECRAFT READINESS</span><span class="preview-live-dot">LIVE</span></div>
      <strong>${ready?'POTENTIAL GO':'NO-GO'}</strong>
      <small>${ready?'Eligible for diagnostics':'Correct issues before launch'}</small></div>
      <div class="preview-list">${c.items.map(item => `<div class="preview-list-item"><span class="preview-status preview-status--${item.status}"></span>
      <span>${escape(item.label)}</span><small>${item.status==='green'?'PASS':item.status==='yellow'?'CAUTION':'FAIL'}</small></div>`).join('')}</div>
      <div class="preview-progress"><div><strong>${c.greens} of 5</strong><span>green requirements</span></div>${meter(c.greens*20,ready?'green':'amber')}</div>`;
  };

  brief = function() {
    const phase = lessons[state.ui.selectedPhase];
    const rule = ruleLessons[state.ui.selectedRule];
    return `<main class="page briefing-page">
      <div class="briefing-hero"><div class="briefing-copy">
        ${eyebrow('MISSION CONTROL / BRIEFING 001')}
        <div class="hero-superline">${icon('orbit',14)} Your next mission begins with your decisions</div>
        <h1 class="hero-title">ARTEMIS <span>II</span><em>LUNAR ODYSSEY</em></h1>
        <p class="hero-description">You are the <b>Flight Director</b>. Prepare Orion, fly around the Moon, collect science data, and bring the crew home safely.</p>
        <div class="hero-meta"><span>${icon('orbit',15)} 3 LINKED PHASES</span><i></i><span>${icon('shield',15)} 5 LAUNCH CHECKS</span><i></i><span>${icon('database',15)} 1 CREWED MISSION</span></div>
        <div class="hero-actions">
          <button class="button button--primary button--xl" data-action="to-hangar">START MISSION ${icon('arrow',20)}</button>
          <button class="button button--outline" data-action="listen-briefing">${icon('radio',17)} HEAR MISSION BRIEFING</button>
        </div>
        <label class="learn-control"><span class="learn-control-icon">${icon('sparkles')}</span>
          <span class="learn-control-text"><strong>Enable Flight Director Tips</strong><small>Educational guidance as you play</small></span>
          <input type="checkbox" data-key="tips" aria-label="Enable Flight Director tips" ${state.tips?'checked':''}/>
          <span class="switch ${state.tips?'switch--on':''}" aria-hidden="true"><span></span></span></label>
      </div>
      <div class="hero-cosmos-label"><div class="orbit-target"><span></span></div><div><small>SIMULATED FLIGHT PATH</small><strong>EARTH → MOON → EARTH</strong></div></div></div>
      <section class="mission-overview" id="mission-roadmap">
        <div class="mission-overview-heading"><span>EXPLORE THE JOURNEY</span><span class="heading-divider"></span><span>CLICK A PHASE TO LEARN MORE</span></div>
        <div class="roadmap-grid">${phases.map((item,index) => `<button type="button" class="roadmap-phase interactive-roadmap ${state.ui.selectedPhase===index?'interactive-roadmap--active':''}" data-action="select-phase" data-index="${index}" aria-pressed="${state.ui.selectedPhase===index}">
          <span class="roadmap-index">0${index+1}<span class="roadmap-node"></span></span>
          <span class="roadmap-details"><strong>${item[0]}</strong><small>${item[1]}</small></span>${index<2?icon('arrow',17):icon('check',17)}</button>`).join('')}</div>
        <div class="explore-detail" aria-live="polite">
          <div class="explore-marker"><span>0${state.ui.selectedPhase+1}</span>${icon(['earth','moon2','shield'][state.ui.selectedPhase],23)}</div>
          <div class="explore-text"><span class="detail-eyebrow">${phase.eyebrow}</span><h3>${phase.title}</h3><p>${phase.body}</p><div class="detail-objective">${icon('target',16)} ${phase.challenge}</div></div>
          <button class="listen-inline" data-action="narrate-phase">${icon('radio',16)} HEAR THIS PHASE</button>
        </div>
        <div class="mission-overview-heading mission-overview-heading--rules"><span>FOUR RESOURCE RULES</span><span class="heading-divider"></span><span>CLICK TO EXPLORE</span></div>
        <div class="rules-grid">${ruleLessons.map((item,index) => `<button type="button" class="rule-card interactive-rule ${index===state.ui.selectedRule?'interactive-rule--active':''}" data-action="select-rule" data-index="${index}" aria-pressed="${index===state.ui.selectedRule}">
          <span class="rule-icon rule-icon--${item.tone}">${icon(item.iconKey,20)}</span><span><span class="rule-name">${item.code}</span><strong>${item.title}</strong><p>${item.short}</p></span></button>`).join('')}</div>
        <div class="rule-inspector"><span class="inspector-icon inspector-icon--${rule.tone}">${icon(rule.iconKey,21)}</span><div><span>MISSION RULE / ${rule.code}</span><strong>${rule.title}</strong><p>${rule.details}</p><small>${rule.target}</small></div>
          <button class="listen-inline" data-action="narrate-rule" title="Hear the selected rule">${icon('radio',17)}</button></div>
        <div class="briefing-tip">${tip('Flight Director Insight', 'Artemis II was a real crewed lunar flyby — not a Moon landing. Spacecraft limits and scoring in this game are simplified for learning.')}</div>
      </section>
      <div class="briefing-footer-note">EDUCATIONAL EXPERIENCE · NICOLAS / PART 01 <span>●</span> GAME VALUES ARE SIMULATED</div>
    </main>`;
  };

  hangar = function() {
    return `<main class="page flow-page hangar-page">
      <div class="flow-heading"><div>${eyebrow('INTEGRATION LAB / DEMO DATA')}<h1>Configure <span>Orion.</span></h1>
      <p>Use these test controls to explore how the engineering data supplied by your teammates affects launch readiness.</p></div>
      <span class="label-demo">SIMULATED INPUTS</span></div>
      ${state.ui.validationError ? `<div class="integration-error" role="alert">${icon('warning',17)} INVALID ENGINEERING DATA · ${escape(state.ui.validationError)}</div>` : ''}
      <div class="flow-grid hangar-grid"><section class="glass-panel config-panel">
        <div class="panel-heading"><span class="panel-heading-icon">${icon('sliders',19)}</span><div><h2>Spacecraft configuration</h2><p>Change the inputs and see the checklist respond.</p></div></div>
        <div class="slider-stack">
          ${slider('totalMassKg','Total spacecraft mass',18000,29000,250,'kg','gauge')}
          ${slider('batteryChargePercent','Battery charge',0,100,1,'%','battery')}
          ${slider('powerBalanceWatts','Power balance',-180,180,5,'W','battery')}
          ${slider('fuelRemainingDeltaV','Maneuvering reserve (Δv)',0,4400,100,'m/s','fuel')}
        </div>
        <div class="toggle-pair">
          ${toggle('heatShieldInstalled','Heat shield',state.ship.heatShieldInstalled?'Installed and available':'MISSING — critical fault','shield')}
          ${toggle('antennaActive','Radio antenna',state.ship.antennaActive?'Communication link enabled':'Radio link disabled','radio')}
        </div>
        <div class="config-actions"><button class="button button--subtle" data-action="ideal">${icon('reset',16)} RESTORE NOMINAL</button>
          <button class="button button--subtle" data-action="fail">${icon('warning',16)} INJECT CRITICAL FAULT</button></div>
      </section>
      <aside class="glass-panel hangar-aside"><div class="panel-heading"><span class="panel-heading-icon">${icon('activity',19)}</span><div><h2>CML 4 preview</h2><p>Live engineering values — not yet launch authorization.</p></div></div>
      <div id="hangar-preview">${preview()}</div>
      ${tip('What does the mass margin mean?', `This game assumes a maximum of ${fmt(MASS_LIMIT)} kg and a recommended 15% margin. These are not official SLS mass limits.`)}
      <div class="preview-next">${icon('info',15)} The next screen will run five sequential tests before any launch can be approved.</div>
      </aside></div>
      <div class="flow-actions"><button class="button button--text" data-action="to-briefing">${icon('back',17)} BACK TO BRIEFING</button>
        <button class="button button--primary" data-action="to-checklist">OPEN PRE-LAUNCH CHECKLIST ${icon('arrow',18)}</button></div>
      <div class="flow-note">TEAM INTEGRATION BRIDGE · These inputs are placeholders for the other participants’ spacecraft model.</div>
    </main>`;
  };

  launchChecklist = function() {
    const c = checklist(state.ship);
    const d = diagnostics();
    const isComplete = d.status === 'complete' || d.status === 'countdown' || d.status === 'liftoff';
    const go = isComplete && d.result?.approved && d.signature === shipSignature(state.ship);
    const running = d.status === 'running';
    const inCountdown = d.status === 'countdown';
    const isLiftoff = d.status === 'liftoff';
    const countGreens = d.revealed.filter(value => value === 'green').length;
    const observed = d.progress;
    const approvedToLaunch = isVerifiedForLaunch();
    const statusLabel = isLiftoff ? 'LIFTOFF' : inCountdown ? 'COUNTDOWN' : running ? 'CHECKS IN PROGRESS' : isComplete ? (go ? 'GO FOR LAUNCH' : 'LAUNCH HOLD') : 'DIAGNOSTICS REQUIRED';
    return `<main class="page flow-page checklist-page ${inCountdown?'checklist-page--countdown':''}">
      <div class="flow-heading"><div>${eyebrow('FLIGHT DIRECTOR / PRE-LAUNCH CML 4')}
        <h1>Launch <span>readiness.</span></h1>
        <p>Run five sequential checks. Authorization requires at least four GREEN results and no critical RED failure.</p></div>
        <span class="top-status top-status--${go?'go':'no-go'}"><span class="top-status-dot"></span>${statusLabel}</span></div>
      ${state.ui.validationError ? `<div class="integration-error" role="alert">${icon('warning',17)} INVALID ENGINEERING DATA · ${escape(state.ui.validationError)} · Correct the spacecraft snapshot before running diagnostics.</div>` : ''}
      <div class="flow-grid checklist-grid"><section class="glass-panel checklist-panel">
        <div class="panel-heading panel-heading--between"><div class="panel-heading">
          <span class="panel-heading-icon">${icon('shield',20)}</span><div><h2>PRE-LAUNCH DIAGNOSTICS</h2><p>NASA-inspired Mission Control workflow · educational simulation</p></div></div>
          <span class="small-label">05 SYSTEMS</span></div>
        <div class="diagnostic-rail"><div class="diagnostic-rail-copy"><strong>${running?'SYSTEM SCAN IN PROGRESS':isComplete?'SCAN COMPLETE':'AWAITING FLIGHT DIRECTOR'}</strong>
          <span>${observed} / 5 verified</span></div>${meter(observed * 20,go?'green':running?'cyan':'amber')}</div>
        <div class="checklist-table-header"><span>SYSTEM CHECK</span><span>LIVE TELEMETRY</span><span>DIAGNOSTIC</span></div>
        <div class="checklist-rows">${c.items.map((item,index) => {
          const status = d.revealed[index];
          const scanning = running && d.activeIndex === index;
          const expanded = state.expanded === item.id;
          return `<div class="check-item ${status?'check-item--'+status:''} ${scanning?'check-item--scanning':''}">
            <button class="check-item-main" data-action="expand" data-id="${item.id}" aria-expanded="${expanded}">
              <span class="check-item-number">0${index+1}</span>
              <span class="check-item-name"><strong>${escape(item.label)}</strong><small>${item.critical?'CRITICAL REQUIREMENT':'MISSION REQUIREMENT'}</small></span>
              <span class="check-item-value">${status?escape(item.value):scanning?'ACQUIRING…':'—'}</span>
              <span class="check-item-status">${scanning?'<span class="status-light status-light--scanning"></span><span>SCANNING</span>':status?`${lights(status)}<span>${{green:'GREEN / PASS',yellow:'YELLOW / CAUTION',red:'RED / FAIL'}[status]}</span>`:'<span class="status-light status-light--pending"></span><span>PENDING</span>'}</span>
              <span class="check-chevron ${expanded?'check-chevron--open':''}">${icon('chevron',15)}</span></button>
            ${expanded?`<div class="check-item-expanded">${icon('info',17)}<div>
              <p>${status?escape(item.detail):'Run diagnostics to verify this value. The preliminary engineering input is '+escape(item.value)+'.'}</p>
              ${state.tips?`<small>${icon('book',14)} ${escape(item.tip)}</small>`:''}</div></div>`:''}</div>`;
        }).join('')}</div>
        <div class="checklist-legend"><span>${lights('green')} PASS</span><span>${lights('yellow')} CAUTION</span><span>${lights('red')} FAIL</span>
          <span class="legend-hint">Select any system to see an explanation.</span></div>
        <div class="diagnostic-console"><div class="console-head"><span><span class="console-pulse"></span> LIVE MISSION CONTROL LOG</span><small>EDUCATIONAL SIMULATION</small></div>
          <div class="console-lines" id="diagnostic-console-lines" role="log" aria-label="Pre-launch diagnostic events">
          ${d.entries.length?d.entries.map(entry => `<div class="console-line console-line--${entry.tone}"><span>[${escape(entry.time)}]</span><strong>FLIGHT</strong><span>${escape(entry.message)}</span></div>`).join(''):
          '<div class="console-empty">SYSTEM READY · Press RUN PRE-LAUNCH DIAGNOSTICS to begin.</div>'}
          </div></div>
      </section><aside class="glass-panel launch-panel">
        <div class="launch-panel-top"><span>MISSION AUTHORIZATION</span><small>GREEN CHECK SCORE</small></div>
        <div class="launch-score-ring launch-score-ring--${go?'go':'no-go'}" style="--score:${countGreens*20}%"><div>
          <strong>${countGreens*20}<small>%</small></strong><span>VERIFIED GREEN</span></div></div>
        <div class="launch-panel-lines"><div><span>Green checks</span><strong>${countGreens} / 5</strong></div>${meter(countGreens*20,go?'green':'amber')}
          <div><span>Critical red failures</span><strong class="${isComplete&&d.result.criticalReds?'text-danger':'text-success'}">${observed?d.result.items.slice(0,observed).filter(item=>item.critical&&item.status==='red').length:0}</strong></div></div>
        ${inCountdown ? `<div class="countdown-stage"><span>${d.clearance?'FLIGHT DIRECTOR CLEARANCE':'TERMINAL COUNTDOWN'}</span><strong>${d.clearance?'GO':String(d.remaining).padStart(2,'0')}</strong>
          <small>${d.clearance?(d.result?.greens===5?'ALL FIVE STATIONS REPORT GO':'FOUR GREEN · CAUTION ACCEPTED'):`T - ${d.remaining} SECONDS`}</small><div class="countdown-progress"><span style="width:${(10-d.remaining)*10}%"></span></div></div>
          <button class="button button--outline button--launch" data-action="abort-countdown">${icon('warning',18)} ABORT COUNTDOWN</button>` :
          isLiftoff ? `<div class="countdown-stage countdown-stage--liftoff"><span>MISSION TIME</span><strong>T+00</strong><small>LIFTOFF CONFIRMED</small><div class="launch-rocket-visual"><span>${icon('rocket',48)}</span><i></i></div></div>` :
          `<div class="launch-verdict launch-verdict--${go?'go':'no-go'}">${icon(go?'check':'lock',22)}<div>
            <strong>${isComplete?(go?(d.result.greens===5?'ALL FIVE STATIONS GO':'GO WITH CAUTION'):'LAUNCH HOLD'):'AWAITING DIAGNOSTICS'}</strong>
            <p>${running?'System checks are running…':isComplete?(go?(d.result.greens===5?'All five systems passed; terminal count is available.':'Four GREEN checks satisfy the game rule. Any remaining caution must be explained.') :d.result.criticalReds?'Critical faults must be corrected.':'A minimum of four GREEN checks is required.'):'Launch approval requires a completed diagnostic scan.'}</p></div></div>
          ${running?`<button class="button button--outline button--launch" data-action="cancel-diagnostics">${icon('warning',18)} CANCEL DIAGNOSTICS</button>`:
          `<button class="button button--outline button--launch" data-action="run-diagnostics">${icon('activity',18)} ${isComplete?'RERUN DIAGNOSTICS':'RUN PRE-LAUNCH DIAGNOSTICS'}</button>`}
          <button class="button button--primary button--launch" data-action="start-countdown" ${approvedToLaunch?'':'disabled'}>${icon(approvedToLaunch?'rocket':'lock',19)} ${approvedToLaunch?'AUTHORIZE LAUNCH':'LAUNCH LOCKED'} ${icon('arrow',18)}</button>`}
        <p class="launch-panel-caption">${inCountdown?'The Flight Director can abort at any time.':go?'The terminal countdown will begin at T−10 seconds.':'Correct any problems, then rerun the scan.'}</p>
        <div class="mission-director-tag">${icon('radio',16)} <span>MISSION CONTROL VOICE <b>${audio.enabled?'ENABLED':'MUTED'}</b></span></div>
        </aside></div>
      <div class="checklist-footnote">${icon('warning',17)}<span><strong>Educational simulation:</strong> NASA uses “CML 4” for <em>Concept Maturity Level 4 (Point Design)</em>, not an operational launch checklist. The ${fmt(MASS_LIMIT)} kg mass limit and all GO/NO-GO thresholds are fictional game values.</span></div>
      <div class="flow-actions"><button class="button button--text" data-action="to-hangar" ${running||inCountdown?'disabled':''}>${icon('back',17)} ADJUST SPACECRAFT</button>
        <span class="inline-assist">${icon('shield',16)} Crew safety comes first.</span></div>
    </main>`;
  };

  const originalAdvance = advance;
  advance = function() {
    const before = state.flight?.phaseIndex;
    originalAdvance();
    const flight = state.flight;
    if (!flight || flight.phaseIndex === before) return;
    const latest = flight.history[flight.history.length-1];
    const englishHistory = [
      ['Earth-orbit checkout complete', 'Orion has completed the simulated checkout and begun its journey to the Moon.'],
      ['Lunar flyby complete', 'The spacecraft buffered data during loss of contact and sent it after the radio link returned.'],
      ['Earth return complete', flight.ship.crewSafe
        ? 'The crew splashed down safely in this educational simulation.'
        : 'The simulated return did not satisfy all safety conditions.']
    ];
    [latest.title, latest.description] = englishHistory[flight.phaseIndex-1];
    const announcements = [
      'Flight Director, Earth orbit checkout is complete. The lunar far-side scene is now displayed. Prepare for radio blackout and science data buffering.',
      'Flight Director, the lunar flyby is complete. The Earth return scene is now displayed. Prepare for trajectory correction and reentry.',
      flight.ship.crewSafe
        ? 'Flight Director, the splashdown scene is displayed. The crew is safe. Excellent work.'
        : 'Flight Director, the Earth return is unsafe in this simulation. Review the outcome.'
    ];
    const expected = flight.phaseIndex;
    queue(() => {
      if (state.screen === 'flight' && state.flight === flight && flight.phaseIndex === expected) {
        speech.say(announcements[expected-1], { scene:expected===3?'flight-complete':`flight-phase-${expected+1}` });
      }
    }, 0);
  };

  flightPage = function() {
    const p = state.flight;
    if (!p) return '';
    const ship = p.ship;
    const complete = p.phaseIndex === 3;
    const stageData = [
      ['ORBITAL CHECKOUT', 'Check spacecraft systems in Earth orbit and prepare for the lunar journey.', ['Spacecraft checkout','Translunar departure']],
      ['LUNAR FLYBY', 'Data are buffered during lunar radio blackout and sent when contact returns.', ['Radio blackout','Battery management']],
      ['EARTH RETURN', 'The entry corridor and thermal protection are essential for a safe return.', ['Trajectory correction','Splashdown']]
    ];
    const stage = stageData[Math.min(p.phaseIndex,2)];
    return `<main class="page flow-page flight-page"><div class="flow-heading"><div>
      ${eyebrow('DEMO FLIGHT / TEAM INTEGRATION BRIDGE')}<h1>${complete?'Journey ':'Mission '}<span>${complete?'complete.':'in progress.'}</span></h1>
      <p>A simplified demonstration of resource continuity between the three phases. The other team members will implement the real gameplay.</p></div>
      <span class="label-demo">EDUCATIONAL DEMO</span></div>
      <div class="flight-timeline">${phases.map((phase,index) => `<div class="flight-timeline-phase ${p.phaseIndex>index?'flight-timeline-phase--completed':p.phaseIndex===index?'flight-timeline-phase--active':''}">
        <div class="flight-timeline-symbol">${icon(p.phaseIndex>index?'check':['earth','moon2','satellite'][index],20)}</div>
        <div><small>PHASE 0${index+1}</small><strong>${phase[0]}</strong></div>${index<2?'<div class="flight-timeline-line"></div>':''}</div>`).join('')}</div>
      <div class="flow-grid flight-grid"><section class="glass-panel flight-main-panel"><div class="panel-heading"><span class="panel-heading-icon">${icon('rocket',19)}</span>
        <div><h2>${complete?'Debriefing ready':stage[0]}</h2><p>${complete?'The three phase results are ready for review.':'Tracking Orion in the educational simulation.'}</p></div></div>
        <div class="flight-feature"><div class="flight-feature-orbit" data-visual-phase="${complete?'splashdown':p.phaseIndex===1?'moon':p.phaseIndex===2?'earth-return':'earth'}" role="img" aria-label="${complete?'Mission complete, splashdown confirmed':p.phaseIndex===1?'Orion near the Moon':p.phaseIndex===2?'Orion returning to Earth':'Orion in Earth orbit'}"><span class="flight-orbit-a"></span><span class="flight-orbit-b"></span>
          <span class="flight-planet flight-planet--earth"></span><span class="flight-planet flight-planet--moon"></span><span class="flight-ship"></span></div>
          <div class="flight-feature-copy"><span class="mini-eyebrow">${complete?'MISSION COMPLETE':`PHASE 0${p.phaseIndex+1}`}</span>
          <h2>${complete?'Welcome home.':phases[Math.min(p.phaseIndex,2)][0]}</h2>
          <p>${complete?'Examine the final score, mission medals, and NASA historical facts.':stage[1]}</p>
          <div class="tag-row">${complete?`<span>CREW: ${ship.crewSafe?'SAFE':'AT RISK'}</span><span>3 PHASES COMPLETE</span>`:stage[2].map(tag=>`<span>${tag}</span>`).join('')}</div></div></div>
        ${p.phaseIndex===2?`<div class="entry-angle-control"><div class="entry-angle-heading"><span>${icon('shield',17)} Reentry angle (game model)</span>
          <strong id="value-reentryAngleDeg">${fmtDecimal(ship.reentryAngleDeg)}°</strong></div>
          <input data-key="reentryAngleDeg" aria-label="Reentry angle" type="range" min="4.5" max="8" step="0.1" value="${ship.reentryAngleDeg}" />
          <div class="angle-scale"><span>4.5°</span><span>GAME GREEN ZONE: 5.5°–7.0°</span><span>8.0°</span></div></div>`:''}
        <div class="flight-history"><div class="flight-history-title">${icon('activity',16)} MISSION EVENT LOG <span>${p.history.length} EVENT(S)</span></div>
          ${p.history.length? p.history.map(rec=>`<div class="flight-history-item"><span class="history-check">${icon('check',17)}</span>
            <div><strong>${escape(rec.title)}</strong><p>${escape(rec.description)}</p></div><small>PHASE 0${rec.phase}</small></div>`).join(''):
            `<div class="flight-no-history">${icon('info',17)} Run Phase 1 to record the first mission event.</div>`}</div>
        <div class="flight-main-actions"><button class="button button--primary" data-action="${complete?'to-debrief':'advance'}">${complete?'OPEN MISSION DEBRIEFING':p.phaseIndex===0?'RUN PHASE 1':p.phaseIndex===1?'RUN PHASE 2':'SIMULATE REENTRY'} ${icon('arrow',18)}</button>
          <small>${complete?'Mission data are ready.':'Resources carry over unchanged until the next phase updates them.'}</small></div>
      </section><aside class="glass-panel flight-telemetry"><div class="panel-heading"><span class="panel-heading-icon">${icon('activity',19)}</span>
      <div><h2>Telemetry</h2><p>Resources are never reset between phases.</p></div></div>
      <div class="flight-metrics-grid">${metric('PROPELLANT Δv',fmt(ship.fuelRemainingDeltaV),'m/s remaining','amber')}
        ${metric('BATTERY',`${fmt(ship.batteryChargePercent)}%`,'charge remaining')}
        ${metric('SCIENCE COLLECTED',fmt(ship.scienceDataCollectedMb),'megabytes (MB)','mint')}
        ${metric('DATA SENT',fmt(ship.scienceDataTransmittedMb),'megabytes (MB)','violet')}</div>
      <div class="telemetry-gauge-list"><div><span>${icon('battery',15)} Battery</span><strong>${fmt(ship.batteryChargePercent)}%</strong></div>
        ${meter(ship.batteryChargePercent,ship.batteryChargePercent>=20?'cyan':'amber')}
        <div><span>${icon('fuel',15)} Maneuver reserve</span><strong>${fmt(ship.fuelRemainingDeltaV)} m/s</strong></div>${meter(ship.fuelRemainingDeltaV/4400*100,'amber')}
        <div><span>${icon('database',15)} Buffer storage</span><strong>${fmt(ship.scienceDataCollectedMb-ship.scienceDataTransmittedMb)} MB</strong></div>
        ${meter((ship.scienceDataCollectedMb-ship.scienceDataTransmittedMb)/500*100,'green')}</div>
      <div class="flight-note-box">${icon('radio',19)}<div><strong>${ship.antennaActive?'ANTENNA ONLINE':'ANTENNA OFFLINE'}</strong>
        <p>${ship.antennaActive?'Science data can be sent outside the lunar occultation.':'Science data remain buffered without a radio link.'}</p></div></div>
        ${tip('Continuous mission state', 'The team physics module will eventually replace this demonstration. These results show how the handoff will work.')}</aside></div>
      <div class="flow-note">${icon('info',15)} A radio blackout and a solar eclipse are different events and do not necessarily occur at the same time.</div>
    </main>`;
  };

  report = function() {
    const flight = state.flight;
    if (!flight) return null;
    const s = flight.ship;
    const crewSafe = flight.phaseIndex === 3 && s.crewSafe === true;
    const score = (crewSafe?500:0) + Math.min(300,Math.round(s.scienceDataTransmittedMb*.7)) +
      (s.fuelRemainingDeltaV>=300?100:0) + (s.batteryChargePercent>=15?100:0);
    const medals = [
      { id:'return', title:'Safe Return', description:'Recover the crew safely.', earned: crewSafe },
      { id:'science', title:'Lunar Scientist', description:'Transmit at least 250 MB of science data.', earned:s.scienceDataTransmittedMb>=250 },
      { id:'resources', title:'Resource Manager', description:'Retain 300 m/s delta-v and at least 15% battery.', earned:s.fuelRemainingDeltaV>=300&&s.batteryChargePercent>=15 },
      { id:'director', title:'Flight Director', description:'Earn all other mission medals.', earned: crewSafe&&s.scienceDataTransmittedMb>=250&&s.fuelRemainingDeltaV>=300&&s.batteryChargePercent>=15 }
    ];
    return {
      missionId:'ARTEMIS-II-NICOLAS-EDU-DEMO', completed:flight.phaseIndex===3,
      crewSafe, score,
      grade:score>=900?'OUTSTANDING':score>=700?'EXCELLENT':score>=450?'NEEDS IMPROVEMENT':'MISSION REVIEW REQUIRED',
      scienceCollectedMb:s.scienceDataCollectedMb, scienceTransmittedMb:s.scienceDataTransmittedMb,
      scienceBufferedMb:Math.max(0,s.scienceDataCollectedMb-s.scienceDataTransmittedMb),
      fuelRemainingDeltaV:s.fuelRemainingDeltaV,
      batteryRemainingPercent:s.batteryChargePercent,
      heatShieldRemainingPercent:s.heatShieldHealthPercent,
      blackoutMinutes:s.blackoutMinutes,
      simulatedDays:s.missionElapsedDays, reentryAngleDeg:s.reentryAngleDeg,
      medals, history:flight.history,
      educationalDisclaimer:'Game resources, safety thresholds, medal rules, scores, and data volumes are fictional educational parameters, not official NASA telemetry.',
      historicalReference:'https://www.nasa.gov/mission/artemis-ii/'
    };
  };
  debrief = function() {
    const r = report();
    if (!r) return '';
    const recommendations = [];
    if (!r.crewSafe) recommendations.push('Review reentry angle, heat-shield integrity, propellant and battery reserves.');
    if (r.scienceBufferedMb>0) recommendations.push('Keep communications available to send the remaining buffered science data.');
    if (r.batteryRemainingPercent<15) recommendations.push('Preserve battery reserves for spacecraft systems and potential eclipses.');
    if (r.fuelRemainingDeltaV<300) recommendations.push('Reserve more delta-v for the return and course-correction maneuvers.');
    if (!recommendations.length) recommendations.push('Well done. Your crew returned safely while preserving key resources.');
    return `<main class="page flow-page debrief-page"><div class="flow-heading"><div>${eyebrow('MISSION DEBRIEF / FINAL REPORT')}
      <h1>Mission <span>debriefing.</span></h1><p>Your decisions, crew outcome, mission awards, and comparison with real NASA history.</p></div>
      <span class="top-status top-status--${r.crewSafe?'go':'no-go'}"><span class="top-status-dot"></span>${r.crewSafe?'CREW SAFE':'CREW AT RISK'}</span></div>
      <div class="debrief-hero glass-panel"><div class="debrief-result-emblem ${r.crewSafe?'debrief-result-emblem--success':'debrief-result-emblem--failure'}">${icon(r.crewSafe?'check':'close',32)}</div>
        <div class="debrief-result-copy"><span>MISSION STATUS · SIMULATION</span><h2>${r.crewSafe?'Welcome home, Orion.':'Mission review required.'}</h2>
          <p>${r.crewSafe?'Splashdown is confirmed and the simulated crew returned safely. Congratulations, Flight Director.':'One or more simulated safety requirements were not met. Review the timeline and try again.'}</p></div>
        <div class="debrief-score"><span>FINAL SCORE</span><strong><span id="animated-score" data-score="${r.score}">${state.ui.scoreAnimated?fmt(r.score):'0'}</span><small>/ 1,000</small></strong><div>${r.grade}</div></div>
      </div>
      <div class="debrief-metrics">
        ${metric('DATA TRANSMITTED',`${fmt(r.scienceTransmittedMb)} MB`,`${fmt(r.scienceCollectedMb)} MB collected`)}
        ${metric('DATA BUFFERED',`${fmt(r.scienceBufferedMb)} MB`,'Awaiting transmission','violet')}
        ${metric('REMAINING Δv',`${fmt(r.fuelRemainingDeltaV)} m/s`,'Maneuvering reserve','amber')}
        ${metric('FINAL BATTERY',`${fmt(r.batteryRemainingPercent)}%`,'Energy remaining','mint')}
      </div>
      <div class="debrief-content-grid"><section class="glass-panel medals-panel"><div class="panel-heading"><span class="panel-heading-icon">${icon('medal',20)}</span><div><h2>Mission medals</h2><p>Achievements earned from your decisions.</p></div></div>
        <div class="medals-grid">${r.medals.map((medal,index)=>`<div class="medal-card ${medal.earned?'medal-card--earned':'medal-card--locked'}" style="--medal-order:${index}">
          <div class="medal-symbol">${icon(({return:'shield',science:'target',resources:'award',director:'trophy'})[medal.id],25)}</div>
          <strong>${medal.title}</strong><p>${medal.description}</p><span>${medal.earned?'AWARDED':'NOT EARNED'}</span></div>`).join('')}</div>
        <div class="mission-score-rule">${icon('sparkles',17)} Scores and medals are game achievements. They are not assigned by NASA.</div>
        <div class="debrief-advice"><strong>${icon('target',17)} FLIGHT DIRECTOR'S NOTES</strong>
          ${recommendations.map(text=>`<p>${icon('check',14)} ${escape(text)}</p>`).join('')}</div>
      </section><aside class="glass-panel reality-panel"><div class="panel-heading"><span class="panel-heading-icon">${icon('flag',19)}</span>
        <div><h2>NASA Artemis II · Real mission</h2><p>Verified historical facts; not game telemetry.</p></div></div>
        <div class="reality-heading">WHAT REALLY HAPPENED?</div>
        ${[['LAUNCH',NASA.launch],['SPLASHDOWN',NASA.splash],['DURATION',NASA.duration],['MISSION',NASA.type],['RECOVERY',NASA.landing],['CREW',NASA.crew]].map(pair=>`<div class="reality-row"><span>${pair[0]}</span><strong>${pair[1]}</strong></div>`).join('')}
        <div class="reality-divider"></div>
        <div class="reality-comparison" aria-label="Your simulated mission compared with real Artemis II">
          <strong>YOUR MISSION VS. REAL ARTEMIS II</strong>
          <div class="comparison-labels"><span>YOUR GAME</span><span>REAL NASA MISSION</span></div>
          <div class="comparison-pair"><span>${r.crewSafe?'Crew returned safely':'Crew return unsafe'}</span><span>Crew recovered safely</span></div>
          <div class="comparison-pair"><span>${fmtDecimal(r.simulatedDays)} simulated days</span><span>${NASA.duration}</span></div>
          <div class="comparison-pair"><span>${fmt(r.scienceTransmittedMb)} MB (game data)</span><span>Not directly comparable</span></div>
        </div>
        <div class="reality-divider"></div>
        <div class="reality-row"><span>GAME DURATION</span><strong>${fmtDecimal(r.simulatedDays)} simulated days</strong></div>
        <div class="reality-row"><span>GAME REENTRY</span><strong>${fmtDecimal(r.reentryAngleDeg)}° (simplified model)</strong></div>
        <div class="reality-row"><span>SCIENCE DATA</span><strong>Game numbers not comparable to NASA telemetry</strong></div>
        <a href="https://www.nasa.gov/mission/artemis-ii/" target="_blank" rel="noopener noreferrer" class="nasa-link">OFFICIAL NASA ARTEMIS II MISSION ${icon('external',15)}</a>
      </aside></div>
      ${state.ui.resultsExpanded?`<section class="glass-panel review-panel"><div class="panel-heading"><span class="panel-heading-icon">${icon('activity',19)}</span>
        <div><h2>Mission event review</h2><p>Review every phase and the recorded resource changes.</p></div></div>
        <div class="review-grid">${r.history.map((event,index)=>`<article class="review-phase"><div class="review-phase-index">PHASE 0${event.phase}</div><h3>${escape(event.title)}</h3>
          <p>${escape(event.description)}</p><div><span>Science collected</span><strong>${fmt(event.collectedMb)} MB</strong></div>
          <div><span>Delta-v used</span><strong>${fmt(event.fuelSpentDeltaV)} m/s</strong></div>
          <div><span>Battery consumed</span><strong>${fmt(event.batterySpentPercent)}%</strong></div>
          <div><span>Data transmitted</span><strong>${fmt(event.transmittedMb)} MB</strong></div></article>`).join('')}</div>
          <div class="review-disclaimer">${escape(r.educationalDisclaimer)}</div>
        </section>`:''}
      <div class="debrief-learning">${tip('Mission lesson', 'An entire lunar flight relies on coordination between mass, electrical power, radio communications, maneuvering propellant, and thermal protection.')}</div>
      <div class="debrief-actions">
        <button class="button button--outline" data-action="reset">${icon('reset',18)} REPLAY MISSION</button>
        <button class="button button--outline" data-action="review-results" aria-expanded="${state.ui.resultsExpanded}">${icon('file',18)} ${state.ui.resultsExpanded?'HIDE MISSION REVIEW':'REVIEW MISSION RESULTS'}</button>
        <button class="button button--outline" data-action="narrate-results">${icon('radio',18)} HEAR RESULTS</button>
        <button class="button button--primary" data-action="export">${icon('download',18)} DOWNLOAD REPORT JSON</button>
      </div>
      <div class="debrief-footer"><span>${icon('file',15)} ${r.missionId}</span><span>${icon('book',15)} EDUCATIONAL MODEL · NOT NASA-CERTIFIED</span>
        <a href="https://www.nasa.gov/news-release/nasa-welcomes-record-setting-artemis-ii-moonfarers-back-to-earth/" target="_blank" rel="noopener noreferrer">NASA RETURN REPORT ${icon('arrow',15)}</a></div>
    </main>`;
  };

  const baseGoto = goto;
  goto = function(screen) {
    speech.stop();
    if (state.screen === 'checklist' && screen !== 'checklist') cancelDiagnosticSession();
    if ((screen === 'briefing' || screen === 'hangar') && state.screen !== screen) {
      invalidateDiagnostics();
    }
    if (screen === 'debrief') {
      state.ui.scoreAnimated = false;
      state.ui.resultsExpanded = false;
    }
    baseGoto(screen);
    if (screen === 'hangar') {
      speech.say('Flight Director, configure the spacecraft and review the engineering indicators before the launch checks.');
    } else if (screen === 'checklist') {
      speech.say('Mission Control. Pre-launch checklist is ready. Select Run Pre-Launch Diagnostics to begin.');
    } else if (screen === 'flight') {
      speech.say('Flight Director, liftoff complete. Earth orbit checkout is now displayed. Run Phase One to continue.', {scene:'flight-phase-1'});
    } else if (screen === 'debrief') {
      const r = report();
      if (r) speech.say(r.crewSafe
        ? `Flight Director, the simulated crew is safe. Mission score: ${r.score} points. Science data transmitted: ${r.scienceTransmittedMb} megabytes. Welcome home.`
        : `Flight Director, mission review required. The crew did not meet the safety criteria. Review the report and try again.`);
    }
  };

  const baseRender = render;
  render = function() {
    if (diagnostics().status === 'complete' && diagnostics().signature !== shipSignature(state.ship)) {
      invalidateDiagnostics('Configuration changed. Re-run diagnostics to authorize launch.');
    }
    baseRender();
    const shell = document.getElementById('app-shell');
    const visualScene = state.screen === 'briefing' ?
      (state.ui.selectedPhase === 1 ? 'moon' : state.ui.selectedPhase === 2 ? 'earth-return' : 'earth') :
      state.screen === 'flight' ?
        (state.flight?.phaseIndex === 1 ? 'moon' : state.flight?.phaseIndex >= 2 ? 'earth-return' : 'earth') :
        state.screen === 'debrief' ? 'earth-return' : 'earth';
    if (shell) { shell.dataset.visualScene = visualScene; shell.dataset.activeMissionScene = sceneKey(); }
    ensureCaptions();
    const counter = document.getElementById('animated-score');
    if (counter && !state.ui.scoreAnimated && window.requestAnimationFrame) {
      state.ui.scoreAnimated = true;
      const value = Number(counter.dataset.score);
      const start = performance.now();
      const duration = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 1 : 1150;
      const frame = now => {
        if (!counter.isConnected) return;
        const position = Math.min(1, (now-start)/duration);
        const eased = 1 - Math.pow(1-position, 3);
        counter.textContent = fmt(Math.round(value*eased));
        if (position < 1) window.requestAnimationFrame(frame);
      };
      window.requestAnimationFrame(frame);
    }
  };

  // Handle the new actions separately; the original demo event handlers still handle its old actions.
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    const action = target.dataset.action;
    switch (action) {
      case 'listen-briefing':
        speech.say('Flight Director, welcome to Artemis Two: Lunar Odyssey. Explore the three mission phases, prepare Orion, and return the crew safely to Earth. Your decisions matter.');
        break;
      case 'select-phase': {
        state.ui.selectedPhase = Number(target.dataset.index);
        render();
        const lesson = lessons[state.ui.selectedPhase];
        speech.say(`${lesson.title}. ${lesson.body}`, { scene:`briefing-phase-${state.ui.selectedPhase+1}` });
        break;
      }
      case 'select-rule': {
        state.ui.selectedRule = Number(target.dataset.index);
        render();
        const rule = ruleLessons[state.ui.selectedRule];
        speech.say(`${rule.title}. ${rule.details}`, { scene:`briefing-rule-${state.ui.selectedRule+1}` });
        break;
      }
      case 'narrate-phase': {
        const lesson = lessons[state.ui.selectedPhase];
        speech.say(`${lesson.title}. ${lesson.body} ${lesson.challenge}`, {scene:`briefing-phase-${state.ui.selectedPhase+1}`});
        break;
      }
      case 'narrate-rule': {
        const rule = ruleLessons[state.ui.selectedRule];
        speech.say(`${rule.title}. ${rule.details}`, {scene:`briefing-rule-${state.ui.selectedRule+1}`});
        break;
      }
      case 'run-diagnostics': runDiagnostics(); break;
      case 'cancel-diagnostics': cancelRunningDiagnostics(); break;
      case 'start-countdown': startCountdown(); break;
      case 'abort-countdown': abortCountdown(); break;
      case 'review-results':
        state.ui.resultsExpanded = !state.ui.resultsExpanded;
        render();
        break;
      case 'narrate-results': {
        const r = report();
        if (r) speech.say(r.crewSafe
          ? `Flight Director, splashdown confirmed. You earned ${r.score} points and transmitted ${r.scienceTransmittedMb} megabytes of scientific data. Congratulations on bringing the crew home safely.`
          : `Flight Director, the crew did not achieve a safe return in this simulation. Your score is ${r.score}. Review the event log, make adjustments, and try again.`);
        break;
      }
      case 'toggle-voice': {
        const continuation = speech.takeContinuation();
        audio.enabled = !audio.enabled;
        if (!audio.enabled) {
          speech.say('Narration muted. Closed captions remain enabled.', {captionOnly:true});
        } else {
          speech.say('Mission Control narration enabled.');
        }
        render();
        if (continuation) queue(() => continuation(), 350);
        break;
      }
      case 'reset':
        state.ui.validationError = null;
        invalidateDiagnostics();
        render();
        break;
      case 'ideal':
      case 'fail':
        state.ui.validationError = null;
        invalidateDiagnostics('Configuration changed. Run pre-launch diagnostics again.');
        render();
        break;
      case 'toggle-sound-settings':
        state.ui.audioHelp = !state.ui.audioHelp;
        render();
        break;
      case 'test-voice': {
        const continuation = speech.takeContinuation();
        speech.say('Mission Control voice test. Flight Director, all stations are standing by.', {
          onDone: continuation || undefined
        });
        break;
      }
      case 'hide-caption':
        document.getElementById('mission-captions')?.classList.remove('mission-captions--active');
        break;
    }
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'voice-volume') {
      audio.volume = Number(event.target.value)/100;
      const counter = document.getElementById('voice-volume-number');
      if (counter) counter.textContent = `${fmt(audio.volume*100)}%`;
    }
  });

  // A small, explicit integration API lets teammates provide engineering data safely.
  // Calling it invalidates previously completed checks, preventing stale launch authorization.
  const numericRanges = {
    totalMassKg: [1, 1000000], batteryChargePercent: [0, 100],
    powerBalanceWatts: [-1000000, 1000000], heatShieldHealthPercent: [0, 100],
    fuelRemainingDeltaV: [0, 100000], scienceDataCollectedMb: [0, 100000000],
    scienceDataTransmittedMb: [0, 100000000], reentryAngleDeg: [0, 90],
    blackoutMinutes: [0, 1000000], missionElapsedDays: [0, 100000]
  };
  const numericKeys = Object.keys(numericRanges);
  function validateSnapshot(partial, baseline, allowResult = false) {
    if (!partial || typeof partial !== 'object' || Array.isArray(partial)) {
      throw new TypeError('Spacecraft state must be a plain object.');
    }
    const next = { ...baseline };
    for (const key of numericKeys) {
      if (!Object.prototype.hasOwnProperty.call(partial, key)) continue;
      const value = partial[key];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new TypeError(`${key} must be a finite number.`);
      }
      const [min, max] = numericRanges[key];
      if (value < min || value > max) {
        throw new RangeError(`${key} must be between ${min} and ${max}.`);
      }
      next[key] = value;
    }
    for (const key of ['heatShieldInstalled', 'antennaActive']) {
      if (Object.prototype.hasOwnProperty.call(partial, key)) {
        if (typeof partial[key] !== 'boolean') throw new TypeError(`${key} must be a boolean.`);
        next[key] = partial[key];
      }
    }
    if (Object.prototype.hasOwnProperty.call(partial,'crewSafe')) {
      if (!allowResult || (partial.crewSafe !== null && typeof partial.crewSafe !== 'boolean')) {
        throw new TypeError('crewSafe can only be set in a completed mission result.');
      }
      next.crewSafe = partial.crewSafe;
    }
    if (next.scienceDataTransmittedMb > next.scienceDataCollectedMb) {
      throw new RangeError('scienceDataTransmittedMb cannot exceed scienceDataCollectedMb.');
    }
    return next;
  }
  function rejectIntegration(error) {
    state.ui.validationError = error.message;
    invalidateDiagnostics(`INVALID INTEGRATION INPUT · ${error.message}`);
    if (state.screen === 'checklist' || state.screen === 'hangar') render();
  }
  window.ArtemisNicolas = Object.freeze({
    setShipSnapshot(partial) {
      let next;
      try { next = validateSnapshot(partial, state.ship); }
      catch (error) { rejectIntegration(error); throw error; }
      state.ship = next;
      state.ui.validationError = null;
      invalidateDiagnostics('Spacecraft data updated. Please run diagnostics again.');
      if (state.screen === 'checklist' || state.screen === 'hangar') render();
      return checklist(state.ship);
    },
    getReadiness() { const readiness = structuredClone(checklist(state.ship)); return {...readiness, approved: readiness.approved && !state.ui.validationError, validationError: state.ui.validationError}; },
    getReport() { return report() ? structuredClone(report()) : null; },
    openChecklist() { goto('checklist'); },
    openBriefing() { goto('briefing'); },
    setMissionResult(payload) {
      if (!payload || typeof payload !== 'object' || !payload.ship || !Array.isArray(payload.history)) {
        throw new TypeError('A completed mission must provide ship and history.');
      }
      if (payload.phaseIndex !== 3 || payload.history.length !== 3) {
        throw new Error('The debriefing requires three completed mission phases.');
      }
      let ship;
      try { ship = validateSnapshot(payload.ship, IDEAL_SHIP, true); }
      catch (error) { rejectIntegration(error); throw error; }
      state.flight = { phaseIndex: 3, ship, history: payload.history };
      state.ui.validationError = null;
      goto('debrief');
    }

  });

  // Update the baseline content without needing external scripts or network requests.
  render();
})();
