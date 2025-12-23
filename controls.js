// controls.js - Audio controls UI and parameter management

// Control state
window.controlState = {
    // Bass controls
    bass: {
        waveType: 'sine',
        // per-wave base gain (dB) applied in addition to user `volume` control
        waveGainDb: {
            sine: 0,
            triangle: 0,
            sawtooth: 0,
            square: 0
        },
        // glide / portamento
        glideEnabled: false,
        glideTime: 0.12,
        volume: 0, // dB
        filterFreq: 2000,
        filterQ: 1,
        attack: 0.01,
        decay: 0.1,
        sustain: 0.8,
        release: 0.1,
        // Removed filter envelope for now
        vibratoDepth: 0,
        vibratoRate: 5,
        tremoloDepth: 0,
        tremoloRate: 5,
        wahDepth: 0,
        wahRate: 5
    },
    // Global controls
    global: {
        distortion: 0,
        distortionWet: 0.3,
        delayTime: 0.3,
        delayFeedback: 0.3,
        delayWet: 0,
        // Modulation shape for vibrato/tremolo/wah: 'sine'|'triangle'|'sawtooth'|'square'
        modShape: 'sine',
        reverbDecay: 2.5,
        reverbWet: 0
    }
    ,
    // Rhythm controls (polyphonic instrument)
    rhythm: {
        waveType: 'sine',
        waveGainDb: { sine: 0, triangle: 0, sawtooth: 0, square: 0 },
        volume: 0,
        filterFreq: 2000,
        filterQ: 1,
        attack: 0.01,
        decay: 0.1,
        sustain: 0.8,
        release: 0.1,
        vibratoDepth: 0,
        vibratoRate: 5,
        tremoloDepth: 0,
        tremoloRate: 5,
        wahDepth: 0,
        wahRate: 5
    }
    ,
    // Lead controls (monophonic)
    lead: {
        waveType: 'sawtooth',
        waveGainDb: { sine: 0, triangle: 0, sawtooth: 0, square: 0 },
        volume: -6,
        filterFreq: 3000,
        filterQ: 1,
        attack: 0.01,
        decay: 0.1,
        sustain: 0.7,
        release: 0.2,
        vibratoDepth: 0,
        vibratoRate: 5,
        tremoloDepth: 0,
        tremoloRate: 5,
        wahDepth: 0,
        wahRate: 5
    }
};

// Instrument lookup helpers
window.activeInstrument = window.activeInstrument || 'bass';

window.getInstrumentNodes = function(name) {
    name = name || window.activeInstrument;
    const synth = window[`${name}Synth`];
    const chain = window[`${name}Chain`];
    const state = (window.controlState && window.controlState[name]) ? window.controlState[name] : null;
    return { name, synth, chain, state };
};

window.getActiveSynth = function() { return window.getInstrumentNodes().synth; };
window.getActiveChain = function() { return window.getInstrumentNodes().chain; };
window.getActiveState = function() { return window.getInstrumentNodes().state; };

// Bind shared controls to a named instrument (sets activeInstrument and refreshes UI)
window.bindControlsToInstrument = function(name) {
    if (!name) return;
    window.activeInstrument = name;
    try {
        // Call the existing update routine which applies controlState -> nodes
        if (typeof window.updateAllControls === 'function') window.updateAllControls();
    } catch (e) {}
    try { if (typeof window.refreshControlsUI === 'function') window.refreshControlsUI(); } catch (e) {}
};

// Refresh visible control values from the active instrument state
window.refreshControlsUI = function() {
    const nodes = window.getInstrumentNodes();
    if (!nodes || !nodes.state) return;
    const s = nodes.state;
    try {
        const waveEl = document.getElementById('bass-wave-type'); if (waveEl) waveEl.value = s.waveType;
        const vol = document.getElementById('bass-volume'); if (vol) vol.value = s.volume;
        const ff = document.getElementById('bass-filter-freq'); if (ff) ff.value = s.filterFreq;
        const fq = document.getElementById('bass-filter-q'); if (fq) fq.value = s.filterQ;
        ['attack','decay','sustain','release'].forEach(param => { const el = document.getElementById(`bass-${param}`); if (el) el.value = s[param]; });
        const glideEl = document.getElementById('bass-glide'); if (glideEl) glideEl.checked = !!s.glideEnabled;
        // effects
        const map = ['vibrato','tremolo','wah'];
        map.forEach(prefix => {
            const depth = document.getElementById(`bass-${prefix}-depth`); if (depth) depth.value = s[`${prefix}Depth`];
            const rate = document.getElementById(`bass-${prefix}-rate`); if (rate) rate.value = s[`${prefix}Rate`];
        });
    } catch (e) {}
};

// Rhythm controls (mirrors bass controls but scoped to rhythmChain/rhythmSynth)
window.initRhythmControls = function() {
    const waveSelect = document.getElementById('rhythm-wave-type');
    if (waveSelect) {
        try { waveSelect.value = window.controlState.rhythm.waveType; } catch(e){}
        waveSelect.addEventListener('change', (e) => {
            const val = (e && (e.detail && e.detail.value)) || (e.target && e.target.value) || waveSelect.value || waveSelect.getAttribute('value');
            window.controlState.rhythm.waveType = val;
            try {
                if (window.rhythmSynth && window.rhythmSynth.set) {
                    window.rhythmSynth.set({ oscillator: { type: val } });
                }
            } catch (err) { console.warn('[controls] could not set rhythm oscillator.type', err); }
            try {
                let baseDb = (window.controlState.rhythm.waveGainDb && window.controlState.rhythm.waveGainDb[val] !== undefined) ? window.controlState.rhythm.waveGainDb[val] : 0;
                const userDb = (window.controlState.rhythm && window.controlState.rhythm.volume) ? window.controlState.rhythm.volume : 0;
                if ((baseDb + userDb) > MAX_COMBINED_DB) baseDb = MAX_COMBINED_DB - userDb;
                if (window.rhythmChain && window.rhythmChain.waveGain) {
                    if (window.rhythmChain.waveGain.volume !== undefined && window.rhythmChain.waveGain.volume.value !== undefined) window.rhythmChain.waveGain.volume.value = baseDb;
                    else if (window.rhythmChain.waveGain.value !== undefined) window.rhythmChain.waveGain.value = baseDb;
                }
                if (window.rhythmChain && window.rhythmChain.volume) {
                    if (window.rhythmChain.volume.volume !== undefined && window.rhythmChain.volume.volume.value !== undefined) window.rhythmChain.volume.volume.value = window.controlState.rhythm.volume;
                    else if (window.rhythmChain.volume.value !== undefined) window.rhythmChain.volume.value = window.controlState.rhythm.volume;
                }
            } catch (err) { console.warn('[controls] error applying rhythm wave gain', err); }
        });
    }

    // Volume
    const vol = document.getElementById('rhythm-volume');
    if (vol) {
        vol.value = window.controlState.rhythm.volume;
        vol.addEventListener('input', (e) => {
            window.controlState.rhythm.volume = parseFloat(e.target.value);
            try {
                if (window.rhythmChain && window.rhythmChain.volume) {
                    if (window.rhythmChain.volume.volume !== undefined && window.rhythmChain.volume.volume.value !== undefined) window.rhythmChain.volume.volume.value = window.controlState.rhythm.volume;
                    else if (window.rhythmChain.volume.value !== undefined) window.rhythmChain.volume.value = window.controlState.rhythm.volume;
                }
            } catch (err) { console.warn('[controls] error setting rhythm volume', err); }
        });
    }

    // Filter freq
    const ff = document.getElementById('rhythm-filter-freq');
    if (ff) {
        ff.value = window.controlState.rhythm.filterFreq;
        ff.addEventListener('input', (e)=>{
            window.controlState.rhythm.filterFreq = parseFloat(e.target.value);
            if (window.rhythmChain && window.rhythmChain.filter) window.rhythmChain.filter.frequency.value = window.controlState.rhythm.filterFreq;
        });
    }

    // Filter Q
    const fq = document.getElementById('rhythm-filter-q');
    if (fq) {
        fq.value = window.controlState.rhythm.filterQ;
        fq.addEventListener('input', (e)=>{
            window.controlState.rhythm.filterQ = parseFloat(e.target.value);
            if (window.rhythmChain && window.rhythmChain.filter) window.rhythmChain.filter.Q.value = window.controlState.rhythm.filterQ;
        });
    }

    // ADSR
    ['attack','decay','sustain','release'].forEach(param=>{
        const s = document.getElementById(`rhythm-${param}`);
        if (s) {
            s.value = window.controlState.rhythm[param];
            s.addEventListener('input',(e)=>{
                window.controlState.rhythm[param] = parseFloat(e.target.value);
                if (window.rhythmSynth && window.rhythmSynth.set) {
                    try { window.rhythmSynth.set({ envelope: { [param]: window.controlState.rhythm[param] } }); } catch(e){}
                }
            });
        }
    });

    // Effects: reuse existing effect slider mapping where present
    const effectSliders = [
        { id: 'rhythm-vibrato-depth', stateKey: 'vibratoDepth', effect: 'vibrato', param: 'depth' },
        { id: 'rhythm-vibrato-rate', stateKey: 'vibratoRate', effect: 'vibrato', param: 'frequency' },
        { id: 'rhythm-tremolo-depth', stateKey: 'tremoloDepth', effect: 'tremolo', param: 'depth' },
        { id: 'rhythm-tremolo-rate', stateKey: 'tremoloRate', effect: 'tremolo', param: 'frequency' },
        { id: 'rhythm-wah-depth', stateKey: 'wahDepth', effect: 'wah', param: 'depth' },
        { id: 'rhythm-wah-rate', stateKey: 'wahRate', effect: 'wah', param: 'gain' }
    ];
    effectSliders.forEach(({id,stateKey,effect,param})=>{
        const slider = document.getElementById(id);
        if (!slider) return;
        slider.value = window.controlState.rhythm[stateKey];
        slider.addEventListener('input',(e)=>{
            window.controlState.rhythm[stateKey] = parseFloat(e.target.value);
            const v = window.controlState.rhythm[stateKey];
            if (effect === 'vibrato' && window.rhythmChain && window.rhythmChain.vibrato) {
                if (param === 'depth') try { window.rhythmChain.vibrato.depth.value = v; } catch(e){ window.rhythmChain.vibrato.depth = v; }
                if (param === 'frequency') try { window.rhythmChain.vibrato.frequency.value = v; } catch(e){ window.rhythmChain.vibrato.frequency = v; }
            } else if (effect === 'tremolo' && window.rhythmChain && window.rhythmChain.tremoloLFO && window.rhythmChain.tremoloGain) {
                if (param === 'depth') {
                    try { window.rhythmChain.tremoloLFO.min = Math.max(0,1-v); window.rhythmChain.tremoloLFO.max = 1; } catch(e){}
                }
                if (param === 'frequency') try { window.rhythmChain.tremoloLFO.frequency.value = v; } catch(e){ window.rhythmChain.tremoloLFO.frequency = v; }
            } else if (effect === 'wah' && window.rhythmChain && window.rhythmChain.wahLFO && window.rhythmChain.wahFilter) {
                if (param === 'depth') {
                    const center = 600; const range = 600;
                    window.rhythmChain.wahLFO.min = Math.max(50, center - v * range);
                    window.rhythmChain.wahLFO.max = Math.min(5000, center + v * range);
                }
                if (param === 'gain') try { window.rhythmChain.wahLFO.frequency.value = v; } catch(e){ window.rhythmChain.wahLFO.frequency = v; }
            }
        });
    });
};

// Lead controls (mirrors bass controls but scoped to leadChain/leadSynth)
/* lead control initialization removed to reuse shared bass controls for lead (switch via active tab) */

// Maximum allowed combined boost (wave base gain + user volume) to avoid clipping
const MAX_COMBINED_DB = 6; // dB

// Initialize controls
window.initControls = function() {
    // Initializing controls

    // Bass controls
    initBassControls();

    // Rhythm controls
    initRhythmControls();

    // Global controls
    initGlobalControls();

    // Apply initial values
    updateAllControls();

    // Controls initialized
};

// Bass controls
window.initBassControls = function() {
    // Wave type
    const waveSelect = document.getElementById('bass-wave-type');
    if (waveSelect) {
        try { waveSelect.value = (window.getActiveState() && window.getActiveState().waveType) || window.controlState.bass.waveType; } catch(e){}
        waveSelect.addEventListener('change', (e) => {
            const val = (e && (e.detail && e.detail.value)) || (e.target && e.target.value) || waveSelect.value || waveSelect.getAttribute('value');
            const nodes = window.getInstrumentNodes();
            if (!nodes.state) return;
            nodes.state.waveType = val;
            try {
                if (nodes.synth && nodes.synth.oscillator && typeof nodes.synth.oscillator.type !== 'undefined') {
                    nodes.synth.oscillator.type = val;
                }
                if (nodes.synth && typeof nodes.synth.set === 'function') {
                    try { nodes.synth.set({ oscillator: { type: val } }); } catch (e) {}
                }
                // platform-specific synth replacement (keep existing behavior for bass)
                try { if (nodes.name === 'bass' && typeof window.replaceBassSynth === 'function') window.replaceBassSynth(val); } catch (e) { }
            } catch (err) { }
            try {
                let baseDb = (nodes.state.waveGainDb && nodes.state.waveGainDb[val] !== undefined) ? nodes.state.waveGainDb[val] : 0;
                try {
                    const userDb = (nodes.state && nodes.state.volume) ? nodes.state.volume : 0;
                    if ((baseDb + userDb) > MAX_COMBINED_DB) baseDb = MAX_COMBINED_DB - userDb;
                } catch (e) {}
                if (nodes.chain && nodes.chain.waveGain) {
                    if (nodes.chain.waveGain.volume !== undefined && nodes.chain.waveGain.volume.value !== undefined) nodes.chain.waveGain.volume.value = baseDb;
                    else if (nodes.chain.waveGain.value !== undefined) nodes.chain.waveGain.value = baseDb;
                }
                if (nodes.chain && nodes.chain.volume) {
                    if (nodes.chain.volume.volume !== undefined && nodes.chain.volume.volume.value !== undefined) nodes.chain.volume.volume.value = nodes.state.volume;
                    else if (nodes.chain.volume.value !== undefined) nodes.chain.volume.value = nodes.state.volume;
                }
            } catch (err) {}
        });
    }

    // Glide (portamento) toggle
    const glideEl = document.getElementById('bass-glide');
    if (glideEl) {
        try { glideEl.checked = !!(window.getActiveState() && window.getActiveState().glideEnabled); } catch (e) {}
        glideEl.addEventListener('change', (e) => {
            const nodes = window.getInstrumentNodes();
            if (!nodes.state) return;
            nodes.state.glideEnabled = !!e.target.checked;
            try {
                if (nodes.synth) nodes.synth.portamento = nodes.state.glideEnabled ? nodes.state.glideTime : 0.0;
            } catch (err) { }
        });
    }

    // Volume
    const volumeSlider = document.getElementById('bass-volume');
    if (volumeSlider) {
        try { volumeSlider.value = (window.getActiveState() && window.getActiveState().volume) || window.controlState.bass.volume; } catch(e){}
        volumeSlider.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            const nodes = window.getInstrumentNodes();
            if (!nodes.state) return;
            nodes.state.volume = v;
            try {
                if (nodes.chain && nodes.chain.volume) {
                    if (nodes.chain.volume.volume !== undefined && nodes.chain.volume.volume.value !== undefined) nodes.chain.volume.volume.value = v;
                    else if (nodes.chain.volume.value !== undefined) nodes.chain.volume.value = v;
                    else if (typeof nodes.chain.volume === 'number') nodes.chain.volume = v;
                }
            } catch (err) { }
        });
    }

    // Filter frequency
    const filterFreqSlider = document.getElementById('bass-filter-freq');
    if (filterFreqSlider) {
        try { filterFreqSlider.value = (window.getActiveState() && window.getActiveState().filterFreq) || window.controlState.bass.filterFreq; } catch(e){}
        filterFreqSlider.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            const nodes = window.getInstrumentNodes();
            if (!nodes.state) return;
            nodes.state.filterFreq = v;
            try { if (nodes.chain && nodes.chain.filter) nodes.chain.filter.frequency.value = v; } catch (err) {}
        });
    }

    // Filter Q
    const filterQSlider = document.getElementById('bass-filter-q');
    if (filterQSlider) {
        try { filterQSlider.value = (window.getActiveState() && window.getActiveState().filterQ) || window.controlState.bass.filterQ; } catch(e){}
        filterQSlider.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            const nodes = window.getInstrumentNodes();
            if (!nodes.state) return;
            nodes.state.filterQ = v;
            try { if (nodes.chain && nodes.chain.filter) nodes.chain.filter.Q.value = v; } catch (err) {}
        });
    }

    // ADSR
    const adsrSliders = ['attack', 'decay', 'sustain', 'release'];
    adsrSliders.forEach(param => {
        const slider = document.getElementById(`bass-${param}`);
        if (slider) {
            try { slider.value = (window.getActiveState() && window.getActiveState()[param]) || window.controlState.bass[param]; } catch(e){}
            slider.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                const nodes = window.getInstrumentNodes();
                if (!nodes.state) return;
                nodes.state[param] = v;
                    try {
                        if (nodes.synth && typeof nodes.synth.set === 'function') {
                            const obj = { envelope: { [param]: v } };
                            try { nodes.synth.set(obj); } catch (err) {}
                        } else if (nodes.synth && nodes.synth.envelope) {
                            nodes.synth.envelope[param] = v;
                        }
                    } catch (err) {}
            });
        }
    });

    // Filter ADSR - removed for now
    // const filterAdsrSliders = ['filter-attack', 'filter-decay', 'filter-sustain', 'filter-release'];
    // filterAdsrSliders.forEach(param => {
    //     const slider = document.getElementById(`bass-${param}`);
    //     if (slider) {
    //         const stateKey = param.replace('filter-', '').replace('-', '');
    //         slider.value = window.controlState.bass[stateKey];
    //         slider.addEventListener('input', (e) => {
    //             window.controlState.bass[stateKey] = parseFloat(e.target.value);
    //             window.bassChain.filterEnvelope[param.replace('filter-', '').replace('-', '')] = window.controlState.bass[stateKey];
    //         });
    //     }
    // });

    // Effects
    const effectSliders = [
        { id: 'bass-vibrato-depth', stateKey: 'vibratoDepth', effect: 'vibrato', param: 'depth' },
        { id: 'bass-vibrato-rate', stateKey: 'vibratoRate', effect: 'vibrato', param: 'frequency' },
        { id: 'bass-tremolo-depth', stateKey: 'tremoloDepth', effect: 'tremolo', param: 'depth' },
        { id: 'bass-tremolo-rate', stateKey: 'tremoloRate', effect: 'tremolo', param: 'frequency' },
        { id: 'bass-wah-depth', stateKey: 'wahDepth', effect: 'wah', param: 'depth' },
        { id: 'bass-wah-rate', stateKey: 'wahRate', effect: 'wah', param: 'gain' }
    ];

    effectSliders.forEach(({ id, stateKey, effect, param }) => {
        const slider = document.getElementById(id);
        if (slider) {
            slider.value = (window.getActiveState() && window.getActiveState()[stateKey]) || window.controlState.bass[stateKey];
            slider.addEventListener('input', (e) => {
                const v = parseFloat(e.target.value);
                const nodes = window.getInstrumentNodes();
                if (!nodes.state) return;
                nodes.state[stateKey] = v;
                if (effect === 'vibrato' && nodes.chain && nodes.chain.vibrato) {
                    if (param === 'depth') try { nodes.chain.vibrato.depth.value = v; } catch (err) { nodes.chain.vibrato.depth = v; }
                    if (param === 'frequency') try { nodes.chain.vibrato.frequency.value = v; } catch (err) { nodes.chain.vibrato.frequency = v; }
                } else if (effect === 'tremolo' && nodes.chain && nodes.chain.tremoloLFO && nodes.chain.tremoloGain) {
                    if (param === 'depth') {
                        try { nodes.chain.tremoloLFO.min = Math.max(0,1-v); nodes.chain.tremoloLFO.max = 1; } catch(e){}
                    }
                    if (param === 'frequency') try { nodes.chain.tremoloLFO.frequency.value = v; } catch(e){ nodes.chain.tremoloLFO.frequency = v; }
                } else if (effect === 'wah' && nodes.chain && nodes.chain.wahLFO && nodes.chain.wahFilter) {
                    if (param === 'depth') {
                        const center = 600; const range = 600;
                        nodes.chain.wahLFO.min = Math.max(50, center - v * range);
                        nodes.chain.wahLFO.max = Math.min(5000, center + v * range);
                    }
                    if (param === 'gain') try { nodes.chain.wahLFO.frequency.value = v; } catch(e){ nodes.chain.wahLFO.frequency = v; }
                }
            });
        }
    });
};

// Global controls
window.initGlobalControls = function() {
    // Distortion
    const distortionSlider = document.getElementById('global-distortion');
    if (distortionSlider) {
        distortionSlider.value = window.controlState.global.distortion;
        distortionSlider.addEventListener('input', (e) => {
            window.controlState.global.distortion = parseFloat(e.target.value);
            // Set waveshaper amount
            window.globalEffects.distortion.distortion = window.controlState.global.distortion;
            // Map slider to a gentle pre-gain (drive) curve to add harmonic content without huge level jumps
            try {
                const v = window.controlState.global.distortion;
                const preGain = 1 + Math.pow(v, 2) * 5; // maps 0->1, 1->6 (gentle exponential)
                if (window.globalEffects && window.globalEffects.distortionPreGain && window.globalEffects.distortionPreGain.gain) window.globalEffects.distortionPreGain.gain.value = preGain;
            } catch (err) {}
        });
    }

    // Distortion wet/dry mix
    const distortionWetEl = document.getElementById('global-distortion-wet');
    if (distortionWetEl) {
        distortionWetEl.value = window.controlState.global.distortionWet;
        distortionWetEl.addEventListener('input', (e) => {
            window.controlState.global.distortionWet = parseFloat(e.target.value);
            const wet = window.controlState.global.distortionWet;
            try {
                if (window.globalEffects && window.globalEffects.distortionWetGain && window.globalEffects.distortionDryGain) {
                    window.globalEffects.distortionWetGain.gain.value = wet;
                    window.globalEffects.distortionDryGain.gain.value = 1 - wet;
                }
            } catch (err) {}
        });
    }

    // Delay
    const delaySliders = [
        { id: 'global-delay-time', stateKey: 'delayTime', param: 'delayTime' },
        { id: 'global-delay-feedback', stateKey: 'delayFeedback', param: 'feedback' },
        { id: 'global-delay-wet', stateKey: 'delayWet', param: 'wet' }
    ];

    delaySliders.forEach(({ id, stateKey, param }) => {
        const slider = document.getElementById(id);
        if (slider) {
            slider.value = window.controlState.global[stateKey];
            slider.addEventListener('input', (e) => {
                window.controlState.global[stateKey] = parseFloat(e.target.value);
                if (param === 'wet') {
                    // Control wet/dry mix with gain nodes
                    const wetAmount = window.controlState.global[stateKey];
                    window.globalEffects.delayDryGain.gain.value = 1 - wetAmount;
                    window.globalEffects.delayWetGain.gain.value = wetAmount;
                } else {
                    // Try setting delay time/feedback dynamically (use .value for Tone.Signal)
                    const v = window.controlState.global[stateKey];
                    // setting delay param
                    if (param === 'delayTime') {
                        if (window.globalEffects.delay && window.globalEffects.delay.delayTime) {
                            window.globalEffects.delay.delayTime.value = v;
                        }
                    } else if (param === 'feedback') {
                        if (window.globalEffects.delay && window.globalEffects.delay.feedback) {
                            window.globalEffects.delay.feedback.value = v;
                        }
                    }
                }
            });
        }
    });

    // Modulation shape (affects vibrato, tremolo, wah LFO)
    const modShapeEl = document.getElementById('global-mod-shape');
    if (modShapeEl) {
        // If it's a checkbox toggle we map: unchecked -> 'sine', checked -> 'square'
        if (modShapeEl.type === 'checkbox') {
            try { modShapeEl.checked = (window.controlState.global.modShape === 'square'); } catch (e) {}
            // Visual helper: toggle class on the parent .mod-toggle for icon highlighting
            function updateModToggleVisual(el) {
                try {
                    const root = el.closest('.mod-toggle');
                    if (!root) return;
                    if (el.checked) root.classList.add('active-square'); else root.classList.remove('active-square');
                } catch (err) {}
            }
            try { updateModToggleVisual(modShapeEl); } catch (e) {}
            modShapeEl.addEventListener('change', (e) => {
                const val = e.target.checked ? 'square' : 'sine';
                window.controlState.global.modShape = val;
                const t = val;
                try { updateModToggleVisual(e.target); } catch (err) {}
                if (window.bassChain) {
                    try { if (window.bassChain.vibrato) window.bassChain.vibrato.type = t; } catch (err) {}
                    try { if (window.bassChain.vibrato && window.bassChain.vibrato.oscillator) window.bassChain.vibrato.oscillator.type = t; } catch (err) {}
                    try { if (window.bassChain.tremoloLFO) window.bassChain.tremoloLFO.type = t; } catch (err) {}
                    try { if (window.bassChain.wahLFO) window.bassChain.wahLFO.type = t; } catch (err) {}
                }
            });
        } else {
            // Fallback for older select-based control
            try { modShapeEl.value = window.controlState.global.modShape; } catch (e) {}
            modShapeEl.addEventListener('change', (e) => {
                window.controlState.global.modShape = e.target.value;
                const t = e.target.value;
                if (window.bassChain) {
                    try { if (window.bassChain.vibrato) window.bassChain.vibrato.type = t; } catch (err) {}
                    try { if (window.bassChain.vibrato && window.bassChain.vibrato.oscillator) window.bassChain.vibrato.oscillator.type = t; } catch (err) {}
                    try { if (window.bassChain.tremoloLFO) window.bassChain.tremoloLFO.type = t; } catch (err) {}
                    try { if (window.bassChain.wahLFO) window.bassChain.wahLFO.type = t; } catch (err) {}
                }
            });
        }
    }

    // Reverb
    const reverbSliders = [
        { id: 'global-reverb-decay', stateKey: 'reverbDecay', param: 'decay' },
        { id: 'global-reverb-wet', stateKey: 'reverbWet', param: 'wet' }
    ];

    reverbSliders.forEach(({ id, stateKey, param }) => {
        const slider = document.getElementById(id);
        if (slider) {
            slider.value = window.controlState.global[stateKey];
            slider.addEventListener('input', (e) => {
                window.controlState.global[stateKey] = parseFloat(e.target.value);
                if (param === 'decay') {
                    // setting reverb param
                    window.globalEffects.reverb[param] = window.controlState.global[stateKey];
                } else if (param === 'wet') {
                    // Control wet/dry mix with gain nodes
                    const wetAmount = window.controlState.global[stateKey];
                    window.globalEffects.reverbDryGain.gain.value = 1 - wetAmount;
                    window.globalEffects.reverbWetGain.gain.value = wetAmount;
                }
            });
        }
    });
};

// Apply all current control values
window.updateAllControls = function() {
    // Bass
    window.bassSynth.oscillator.type = window.controlState.bass.waveType;
    // Ensure portamento is set according to glide setting
    try { if (window.bassSynth) window.bassSynth.portamento = window.controlState.bass.glideEnabled ? window.controlState.bass.glideTime : 0.0; } catch (e) {}
    // Apply per-wave base gain (dB) to waveGain and set user volume
    try {
        const wave = window.controlState.bass.waveType;
        let baseDb = (window.controlState.bass.waveGainDb && window.controlState.bass.waveGainDb[wave] !== undefined) ? window.controlState.bass.waveGainDb[wave] : 0;
        // clamp combined base + user volume to avoid excessive boost
        try {
            const userDb = (window.controlState.bass && window.controlState.bass.volume) ? window.controlState.bass.volume : 0;
                if ((baseDb + userDb) > MAX_COMBINED_DB) {
                const allowedBase = MAX_COMBINED_DB - userDb;
                baseDb = allowedBase;
            }
        } catch (e) {}
        if (window.bassChain && window.bassChain.waveGain) {
                if (window.bassChain.waveGain.volume !== undefined && window.bassChain.waveGain.volume.value !== undefined) {
                window.bassChain.waveGain.volume.value = baseDb;
            } else if (window.bassChain.waveGain.value !== undefined) {
                window.bassChain.waveGain.value = baseDb;
            } else if (typeof window.bassChain.waveGain === 'number') {
                window.bassChain.waveGain = baseDb;
            } else {
            }
        }
        // set user volume
        const userDb = window.controlState.bass.volume;
        if (window.bassChain && window.bassChain.volume) {
            if (window.bassChain.volume.volume !== undefined && window.bassChain.volume.volume.value !== undefined) {
                window.bassChain.volume.volume.value = userDb;
            } else if (window.bassChain.volume.value !== undefined) {
                window.bassChain.volume.value = userDb;
            } else if (typeof window.bassChain.volume === 'number') {
                window.bassChain.volume = userDb;
            }
        }
    } catch (err) {
        console.warn('[controls] error applying initial waveGain/volume', err);
        try { if (window.bassChain && window.bassChain.volume && window.bassChain.volume.volume) window.bassChain.volume.volume.value = window.controlState.bass.volume; } catch (e) {}
    }
    window.bassChain.filter.frequency.value = window.controlState.bass.filterFreq;
    window.bassChain.filter.Q.value = window.controlState.bass.filterQ;

    window.bassSynth.envelope.attack = window.controlState.bass.attack;
    window.bassSynth.envelope.decay = window.controlState.bass.decay;
    window.bassSynth.envelope.sustain = window.controlState.bass.sustain;
    window.bassSynth.envelope.release = window.controlState.bass.release;

    // Removed filter envelope
    // window.bassChain.filterEnvelope.attack = window.controlState.bass.filterAttack;
    // window.bassChain.filterEnvelope.decay = window.controlState.bass.filterDecay;
    // window.bassChain.filterEnvelope.sustain = window.controlState.bass.filterSustain;
    // window.bassChain.filterEnvelope.release = window.controlState.bass.filterRelease;

    if (window.bassChain) {
        if (window.bassChain.vibrato) {
            try { window.bassChain.vibrato.depth.value = window.controlState.bass.vibratoDepth; } catch (e) { window.bassChain.vibrato.depth = window.controlState.bass.vibratoDepth; }
            try { window.bassChain.vibrato.frequency.value = window.controlState.bass.vibratoRate; } catch (e) { window.bassChain.vibrato.frequency = window.controlState.bass.vibratoRate; }
        }
        if (window.bassChain.tremoloLFO && window.bassChain.tremoloGain) {
            try { window.bassChain.tremoloLFO.min = Math.max(0, 1 - window.controlState.bass.tremoloDepth); } catch (e) {}
            try { window.bassChain.tremoloLFO.max = 1; } catch (e) {}
            try { window.bassChain.tremoloLFO.frequency.value = window.controlState.bass.tremoloRate; } catch (e) { window.bassChain.tremoloLFO.frequency = window.controlState.bass.tremoloRate; }
        }
        if (window.bassChain.wahLFO && window.bassChain.wahFilter) {
            const v = window.controlState.bass.wahDepth;
            const center = 600;
            const range = 600;
            window.bassChain.wahLFO.min = Math.max(50, center - v * range);
            window.bassChain.wahLFO.max = Math.min(5000, center + v * range);
            try { window.bassChain.wahLFO.frequency.value = window.controlState.bass.wahRate; } catch (e) { window.bassChain.wahLFO.frequency = window.controlState.bass.wahRate; }
        }
    }

    // Rhythm (polyphonic) - apply independent instrument settings if present
    try {
        if (window.rhythmSynth) {
            try { if (window.rhythmSynth.set) window.rhythmSynth.set({ oscillator: { type: window.controlState.rhythm.waveType } }); else if (window.rhythmSynth.oscillator) window.rhythmSynth.oscillator.type = window.controlState.rhythm.waveType; } catch (e) {}
        }
        // Apply per-wave base gain clamp + user volume to rhythmChain
        const rWave = window.controlState.rhythm.waveType;
        let rBaseDb = (window.controlState.rhythm.waveGainDb && window.controlState.rhythm.waveGainDb[rWave] !== undefined) ? window.controlState.rhythm.waveGainDb[rWave] : 0;
        try {
            const rUserDb = (window.controlState.rhythm && window.controlState.rhythm.volume) ? window.controlState.rhythm.volume : 0;
            if ((rBaseDb + rUserDb) > MAX_COMBINED_DB) {
                rBaseDb = MAX_COMBINED_DB - rUserDb;
            }
        } catch (e) {}
        if (window.rhythmChain && window.rhythmChain.waveGain) {
            if (window.rhythmChain.waveGain.volume !== undefined && window.rhythmChain.waveGain.volume.value !== undefined) {
                window.rhythmChain.waveGain.volume.value = rBaseDb;
            } else if (window.rhythmChain.waveGain.value !== undefined) {
                window.rhythmChain.waveGain.value = rBaseDb;
            }
        }
        // set user volume
        const rUserDb2 = window.controlState.rhythm.volume;
        if (window.rhythmChain && window.rhythmChain.volume) {
            if (window.rhythmChain.volume.volume !== undefined && window.rhythmChain.volume.volume.value !== undefined) {
                window.rhythmChain.volume.volume.value = rUserDb2;
            } else if (window.rhythmChain.volume.value !== undefined) {
                window.rhythmChain.volume.value = rUserDb2;
            }
        }
        // Filter and envelope
        if (window.rhythmChain && window.rhythmChain.filter) {
            window.rhythmChain.filter.frequency.value = window.controlState.rhythm.filterFreq;
            window.rhythmChain.filter.Q.value = window.controlState.rhythm.filterQ;
        }
        if (window.rhythmSynth) {
            try {
                if (typeof window.rhythmSynth.set === 'function') {
                    window.rhythmSynth.set({ envelope: {
                        attack: window.controlState.rhythm.attack,
                        decay: window.controlState.rhythm.decay,
                        sustain: window.controlState.rhythm.sustain,
                        release: window.controlState.rhythm.release
                    }});
                } else if (window.rhythmSynth.envelope) {
                    try { window.rhythmSynth.envelope.attack = window.controlState.rhythm.attack; } catch (e) {}
                    try { window.rhythmSynth.envelope.decay = window.controlState.rhythm.decay; } catch (e) {}
                    try { window.rhythmSynth.envelope.sustain = window.controlState.rhythm.sustain; } catch (e) {}
                    try { window.rhythmSynth.envelope.release = window.controlState.rhythm.release; } catch (e) {}
                }
            } catch (e) {}
        }
        if (window.rhythmChain) {
            if (window.rhythmChain.vibrato) {
                try { window.rhythmChain.vibrato.depth.value = window.controlState.rhythm.vibratoDepth; } catch (e) { window.rhythmChain.vibrato.depth = window.controlState.rhythm.vibratoDepth; }
                try { window.rhythmChain.vibrato.frequency.value = window.controlState.rhythm.vibratoRate; } catch (e) { window.rhythmChain.vibrato.frequency = window.controlState.rhythm.vibratoRate; }
            }
            if (window.rhythmChain.tremoloLFO && window.rhythmChain.tremoloGain) {
                try { window.rhythmChain.tremoloLFO.min = Math.max(0, 1 - window.controlState.rhythm.tremoloDepth); } catch (e) {}
                try { window.rhythmChain.tremoloLFO.max = 1; } catch (e) {}
                try { window.rhythmChain.tremoloLFO.frequency.value = window.controlState.rhythm.tremoloRate; } catch (e) { window.rhythmChain.tremoloLFO.frequency = window.controlState.rhythm.tremoloRate; }
            }
            if (window.rhythmChain.wahLFO && window.rhythmChain.wahFilter) {
                const v = window.controlState.rhythm.wahDepth;
                const center = 600;
                const range = 600;
                window.rhythmChain.wahLFO.min = Math.max(50, center - v * range);
                window.rhythmChain.wahLFO.max = Math.min(5000, center + v * range);
                try { window.rhythmChain.wahLFO.frequency.value = window.controlState.rhythm.wahRate; } catch (e) { window.rhythmChain.wahLFO.frequency = window.controlState.rhythm.wahRate; }
            }
        }
    } catch (e) { console.warn('[controls] error applying rhythm controls', e); }

    // Global
    // Distortion amount (waveshaper) and mapped pre-gain
    window.globalEffects.distortion.distortion = window.controlState.global.distortion;
    try {
        const v = window.controlState.global.distortion || 0;
        const preGain = 1 + Math.pow(v, 2) * 5;
        if (window.globalEffects && window.globalEffects.distortionPreGain && window.globalEffects.distortionPreGain.gain) window.globalEffects.distortionPreGain.gain.value = preGain;
    } catch (e) {}
    // Apply wet/dry mix for distortion
    try {
        const wet = (window.controlState.global.distortionWet !== undefined) ? window.controlState.global.distortionWet : 0;
        if (window.globalEffects && window.globalEffects.distortionWetGain && window.globalEffects.distortionDryGain) {
            window.globalEffects.distortionWetGain.gain.value = wet;
            window.globalEffects.distortionDryGain.gain.value = 1 - wet;
        }
    } catch (e) {}
    // Set delay wet/dry mix
    const delayWet = window.controlState.global.delayWet;
    window.globalEffects.delayDryGain.gain.value = 1 - delayWet;
    window.globalEffects.delayWetGain.gain.value = delayWet;
    // Use .value on Tone.Signal parameters
    if (window.globalEffects.delay && window.globalEffects.delay.delayTime) {
        window.globalEffects.delay.delayTime.value = window.controlState.global.delayTime;
    }
    if (window.globalEffects.delay && window.globalEffects.delay.feedback) {
        window.globalEffects.delay.feedback.value = window.controlState.global.delayFeedback;
    }
    window.globalEffects.reverb.decay = window.controlState.global.reverbDecay;
    // Set reverb wet/dry mix
    const reverbWet = window.controlState.global.reverbWet;
    window.globalEffects.reverbDryGain.gain.value = 1 - reverbWet;
    window.globalEffects.reverbWetGain.gain.value = reverbWet;

    // Apply modulation shape to existing chains
    const modShape = window.controlState.global.modShape;
    if (window.bassChain) {
        try { if (window.bassChain.vibrato) window.bassChain.vibrato.type = modShape; } catch (e) {}
        try { if (window.bassChain.vibrato && window.bassChain.vibrato.oscillator) window.bassChain.vibrato.oscillator.type = modShape; } catch (e) {}
        try { if (window.bassChain.tremoloLFO) window.bassChain.tremoloLFO.type = modShape; } catch (e) {}
        try { if (window.bassChain.wahLFO) window.bassChain.wahLFO.type = modShape; } catch (e) {}
    }
    // Lead (monophonic) - apply independent instrument settings if present
    try {
        if (window.leadSynth) {
            try { if (window.leadSynth.set) window.leadSynth.set({ oscillator: { type: window.controlState.lead.waveType } }); else if (window.leadSynth.oscillator) window.leadSynth.oscillator.type = window.controlState.lead.waveType; } catch (e) {}
        }
        // Apply per-wave base gain clamp + user volume to leadChain
        const lWave = window.controlState.lead.waveType;
        let lBaseDb = (window.controlState.lead.waveGainDb && window.controlState.lead.waveGainDb[lWave] !== undefined) ? window.controlState.lead.waveGainDb[lWave] : 0;
        try {
            const lUserDb = (window.controlState.lead && window.controlState.lead.volume) ? window.controlState.lead.volume : 0;
            if ((lBaseDb + lUserDb) > MAX_COMBINED_DB) {
                lBaseDb = MAX_COMBINED_DB - lUserDb;
            }
        } catch (e) {}
        if (window.leadChain && window.leadChain.waveGain) {
            if (window.leadChain.waveGain.volume !== undefined && window.leadChain.waveGain.volume.value !== undefined) {
                window.leadChain.waveGain.volume.value = lBaseDb;
            } else if (window.leadChain.waveGain.value !== undefined) {
                window.leadChain.waveGain.value = lBaseDb;
            }
        }
        // set user volume
        const lUserDb2 = window.controlState.lead.volume;
        if (window.leadChain && window.leadChain.volume) {
            if (window.leadChain.volume.volume !== undefined && window.leadChain.volume.volume.value !== undefined) {
                window.leadChain.volume.volume.value = lUserDb2;
            } else if (window.leadChain.volume.value !== undefined) {
                window.leadChain.volume.value = lUserDb2;
            }
        }
        // Filter and envelope
        if (window.leadChain && window.leadChain.filter) {
            window.leadChain.filter.frequency.value = window.controlState.lead.filterFreq;
            window.leadChain.filter.Q.value = window.controlState.lead.filterQ;
        }
        if (window.leadSynth) {
            try {
                if (typeof window.leadSynth.set === 'function') {
                    window.leadSynth.set({ envelope: {
                        attack: window.controlState.lead.attack,
                        decay: window.controlState.lead.decay,
                        sustain: window.controlState.lead.sustain,
                        release: window.controlState.lead.release
                    }});
                } else if (window.leadSynth.envelope) {
                    try { window.leadSynth.envelope.attack = window.controlState.lead.attack; } catch (e) {}
                    try { window.leadSynth.envelope.decay = window.controlState.lead.decay; } catch (e) {}
                    try { window.leadSynth.envelope.sustain = window.controlState.lead.sustain; } catch (e) {}
                    try { window.leadSynth.envelope.release = window.controlState.lead.release; } catch (e) {}
                }
            } catch (e) {}
        }
        if (window.leadChain) {
            if (window.leadChain.vibrato) {
                try { window.leadChain.vibrato.depth.value = window.controlState.lead.vibratoDepth; } catch (e) { window.leadChain.vibrato.depth = window.controlState.lead.vibratoDepth; }
                try { window.leadChain.vibrato.frequency.value = window.controlState.lead.vibratoRate; } catch (e) { window.leadChain.vibrato.frequency = window.controlState.lead.vibratoRate; }
            }
            if (window.leadChain.tremoloLFO && window.leadChain.tremoloGain) {
                try { window.leadChain.tremoloLFO.min = Math.max(0, 1 - window.controlState.lead.tremoloDepth); } catch (e) {}
                try { window.leadChain.tremoloLFO.max = 1; } catch (e) {}
                try { window.leadChain.tremoloLFO.frequency.value = window.controlState.lead.tremoloRate; } catch (e) { window.leadChain.tremoloLFO.frequency = window.controlState.lead.tremoloRate; }
            }
            if (window.leadChain.wahLFO && window.leadChain.wahFilter) {
                const v = window.controlState.lead.wahDepth;
                const center = 600;
                const range = 600;
                window.leadChain.wahLFO.min = Math.max(50, center - v * range);
                window.leadChain.wahLFO.max = Math.min(5000, center + v * range);
                try { window.leadChain.wahLFO.frequency.value = window.controlState.lead.wahRate; } catch (e) { window.leadChain.wahLFO.frequency = window.controlState.lead.wahRate; }
            }
        }
    } catch (e) { console.warn('[controls] error applying lead controls', e); }
};