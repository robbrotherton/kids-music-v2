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
        try { waveSelect.value = window.controlState.bass.waveType; } catch(e){}
        waveSelect.addEventListener('change', (e) => {
            // some events may not provide target.value, support component's property or detail
            const val = (e && (e.detail && e.detail.value)) || (e.target && e.target.value) || waveSelect.value || waveSelect.getAttribute('value');
            window.controlState.bass.waveType = val;
            
            try {
                // Try direct assignment first, then the more robust `set` API for Tone objects
                if (window.bassSynth && window.bassSynth.oscillator && typeof window.bassSynth.oscillator.type !== 'undefined') {
                    window.bassSynth.oscillator.type = val;
                }
                // Also call set to cover other internal shapes (some Tone versions prefer set)
                if (window.bassSynth && typeof window.bassSynth.set === 'function') {
                    try { window.bassSynth.set({ oscillator: { type: val } }); } catch (e) {}
                }
                
                // Some environments / Tone.js versions don't update the running oscillator
                // instance reliably via property assignment. Replace the synth instance
                // and reconnect it through the existing chain to guarantee the change.
                try { if (typeof window.replaceBassSynth === 'function') window.replaceBassSynth(val); } catch (e) { }
            } catch (err) { }
            // apply per-wave base gain (dB) to dedicated waveGain, keep user volume separate
            try {
                let baseDb = (window.controlState.bass.waveGainDb && window.controlState.bass.waveGainDb[val] !== undefined) ? window.controlState.bass.waveGainDb[val] : 0;
                // prevent combined gain (baseDb + user volume) from exceeding safe threshold
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
                // ensure user volume is preserved
                if (window.bassChain && window.bassChain.volume) {
                    if (window.bassChain.volume.volume !== undefined && window.bassChain.volume.volume.value !== undefined) {
                        window.bassChain.volume.volume.value = window.controlState.bass.volume;
                    } else if (window.bassChain.volume.value !== undefined) {
                        window.bassChain.volume.value = window.controlState.bass.volume;
                    } else if (typeof window.bassChain.volume === 'number') {
                        window.bassChain.volume = window.controlState.bass.volume;
                    }
                }
            } catch (err) { }
        });
    }

    // Glide (portamento) toggle
    const glideEl = document.getElementById('bass-glide');
    if (glideEl) {
        try { glideEl.checked = !!window.controlState.bass.glideEnabled; } catch (e) {}
        glideEl.addEventListener('change', (e) => {
            window.controlState.bass.glideEnabled = !!e.target.checked;
            try {
                if (window.bassSynth) window.bassSynth.portamento = window.controlState.bass.glideEnabled ? window.controlState.bass.glideTime : 0.0;
            } catch (err) { }
        });
    }

    // Volume
    const volumeSlider = document.getElementById('bass-volume');
    if (volumeSlider) {
        volumeSlider.value = window.controlState.bass.volume;
        volumeSlider.addEventListener('input', (e) => {
            window.controlState.bass.volume = parseFloat(e.target.value);
            try {
                // update only user volume control node; per-wave base gain remains on waveGain
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
            } catch (err) { }
        });
    }

    // Filter frequency
    const filterFreqSlider = document.getElementById('bass-filter-freq');
    if (filterFreqSlider) {
        filterFreqSlider.value = window.controlState.bass.filterFreq;
        filterFreqSlider.addEventListener('input', (e) => {
            window.controlState.bass.filterFreq = parseFloat(e.target.value);
            window.bassChain.filter.frequency.value = window.controlState.bass.filterFreq;
        });
    }

    // Filter Q
    const filterQSlider = document.getElementById('bass-filter-q');
    if (filterQSlider) {
        filterQSlider.value = window.controlState.bass.filterQ;
        filterQSlider.addEventListener('input', (e) => {
            window.controlState.bass.filterQ = parseFloat(e.target.value);
            window.bassChain.filter.Q.value = window.controlState.bass.filterQ;
        });
    }

    // ADSR
    const adsrSliders = ['attack', 'decay', 'sustain', 'release'];
    adsrSliders.forEach(param => {
        const slider = document.getElementById(`bass-${param}`);
        if (slider) {
            slider.value = window.controlState.bass[param];
            slider.addEventListener('input', (e) => {
                window.controlState.bass[param] = parseFloat(e.target.value);
                window.bassSynth.envelope[param] = window.controlState.bass[param];
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
            slider.value = window.controlState.bass[stateKey];
            slider.addEventListener('input', (e) => {
                window.controlState.bass[stateKey] = parseFloat(e.target.value);
                // Map controls to actual effect properties safely
                const v = window.controlState.bass[stateKey];
                    if (effect === 'vibrato' && window.bassChain && window.bassChain.vibrato) {
                        if (param === 'depth' && window.bassChain.vibrato.depth !== undefined) {
                            try { window.bassChain.vibrato.depth.value = v; } catch (err) { window.bassChain.vibrato.depth = v; }
                        }
                        if (param === 'frequency' && window.bassChain.vibrato.frequency !== undefined) {
                            try { window.bassChain.vibrato.frequency.value = v; } catch (err) { window.bassChain.vibrato.frequency = v; }
                        }
                    } else if (effect === 'tremolo' && window.bassChain && window.bassChain.tremoloLFO && window.bassChain.tremoloGain) {
                        // depth -> set LFO range so it oscillates between [1-depth, 1]
                        if (param === 'depth') {
                            const depth = v;
                            try {
                                window.bassChain.tremoloLFO.min = Math.max(0, 1 - depth);
                                window.bassChain.tremoloLFO.max = 1;
                            } catch (err) {}
                        }
                        // frequency -> set LFO rate
                        if (param === 'frequency') {
                            try { window.bassChain.tremoloLFO.frequency.value = v; } catch (err) { window.bassChain.tremoloLFO.frequency = v; }
                        }
                } else if (effect === 'wah' && window.bassChain && window.bassChain.wahLFO && window.bassChain.wahFilter) {
                    // wahDepth -> adjust LFO min/max around center
                    if (param === 'depth') {
                        const center = 600;
                        const range = 600; // +/- range
                        window.bassChain.wahLFO.min = Math.max(50, center - v * range);
                        window.bassChain.wahLFO.max = Math.min(5000, center + v * range);
                    }
                    // wahRate -> set LFO rate
                    if (param === 'gain') {
                        try { window.bassChain.wahLFO.frequency.value = v; } catch (err) { window.bassChain.wahLFO.frequency = v; }
                    }
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
            window.globalEffects.distortion.distortion = window.controlState.global.distortion;
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
        if (window.rhythmSynth && window.rhythmSynth.envelope) {
            try { window.rhythmSynth.envelope.attack = window.controlState.rhythm.attack; } catch (e) {}
            try { window.rhythmSynth.envelope.decay = window.controlState.rhythm.decay; } catch (e) {}
            try { window.rhythmSynth.envelope.sustain = window.controlState.rhythm.sustain; } catch (e) {}
            try { window.rhythmSynth.envelope.release = window.controlState.rhythm.release; } catch (e) {}
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
    window.globalEffects.distortion.distortion = window.controlState.global.distortion;
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
};