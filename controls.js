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
        waveSelect.value = window.controlState.bass.waveType;
        waveSelect.addEventListener('change', (e) => {
            window.controlState.bass.waveType = e.target.value;
            window.bassSynth.oscillator.type = e.target.value;
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
                window.bassChain[effect][param] = window.controlState.bass[stateKey];
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
                window.globalEffects.delay[param] = window.controlState.global[stateKey];
            });
        }
    });

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

    window.bassChain.vibrato.depth = window.controlState.bass.vibratoDepth;
    window.bassChain.vibrato.frequency = window.controlState.bass.vibratoRate;
    window.bassChain.tremolo.depth = window.controlState.bass.tremoloDepth;
    window.bassChain.tremolo.frequency = window.controlState.bass.tremoloRate;
    window.bassChain.wah.depth = window.controlState.bass.wahDepth;
    window.bassChain.wah.gain = window.controlState.bass.wahRate;

    // Global
    window.globalEffects.distortion.distortion = window.controlState.global.distortion;
    window.globalEffects.delay.delayTime = window.controlState.global.delayTime;
    window.globalEffects.delay.feedback = window.controlState.global.delayFeedback;
    window.globalEffects.delay.wet = window.controlState.global.delayWet;
    window.globalEffects.reverb.decay = window.controlState.global.reverbDecay;
    // Set reverb wet/dry mix
    const reverbWet = window.controlState.global.reverbWet;
    window.globalEffects.reverbDryGain.gain.value = 1 - reverbWet;
    window.globalEffects.reverbWetGain.gain.value = reverbWet;
};