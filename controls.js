// controls.js - Audio controls UI and parameter management

// Control state
window.controlState = {
    // Bass controls
    bass: {
        waveType: 'sawtooth',
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
        reverbWet: 0.3
    }
};

// Initialize controls
window.initControls = function() {
    console.log('Initializing controls...');

    // Bass controls
    initBassControls();

    // Global controls
    initGlobalControls();

    // Apply initial values
    updateAllControls();

    console.log('Controls initialized');
};

// Bass controls
window.initBassControls = function() {
    // Wave type
    const waveSelect = document.getElementById('bass-wave-type');
    if (waveSelect) {
        try { waveSelect.value = window.controlState.bass.waveType; } catch(e){}
        waveSelect.addEventListener('change', (e) => {
            // some events may not provide target.value, support component's property
            const val = (e.target && e.target.value) || waveSelect.value || waveSelect.getAttribute('value');
            window.controlState.bass.waveType = val;
            try { window.bassSynth.oscillator.type = val; } catch (err) {}
        });
    }

    // Volume
    const volumeSlider = document.getElementById('bass-volume');
    if (volumeSlider) {
        volumeSlider.value = window.controlState.bass.volume;
        volumeSlider.addEventListener('input', (e) => {
            window.controlState.bass.volume = parseFloat(e.target.value);
            window.bassChain.volume.volume.value = window.controlState.bass.volume;
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
                    console.log(`Setting delay ${param} to ${v}`);
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
                    console.log(`Setting reverb ${param} to ${window.controlState.global[stateKey]}`);
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
    window.bassChain.volume.volume.value = window.controlState.bass.volume;
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