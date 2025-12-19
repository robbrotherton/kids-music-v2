// audio.js - Audio setup and master chain

// Global audio variables
window.AudioContext = window.AudioContext || window.webkitAudioContext;
window.audioContext = new AudioContext();

Tone.context.lookAhead = 0.05; // Slightly increase to avoid timing issues

// Global effects chain
window.globalEffects = {
    distortion: new Tone.Distortion({ distortion: 0 }),
    delay: new Tone.FeedbackDelay({ delayTime: 0.3, feedback: 0.3 }),
    delayDryGain: new Tone.Gain(1),
    delayWetGain: new Tone.Gain(0),
    reverb: new Tone.Reverb({ decay: 2.5, wet: 1 }), // Fully wet, we control mix externally
    reverbDryGain: new Tone.Gain(1),
    reverbWetGain: new Tone.Gain(0),
    compressor: new Tone.Compressor({ threshold: -24, ratio: 4 }),
    limiter: new Tone.Limiter(-1)
};

// Connect global chain with proper reverb wet/dry mixing
window.globalEffectsInput = new Tone.Gain();

// Split for reverb dry/wet
const reverbInput = new Tone.Gain();
const reverbDry = new Tone.Gain();
const reverbWet = new Tone.Gain();

// Connect: input -> splitter -> dry path and reverb
window.globalEffectsInput.connect(reverbInput);
reverbInput.connect(window.globalEffects.reverbDryGain);
reverbInput.connect(window.globalEffects.reverb);

// Reverb output -> wet gain
window.globalEffects.reverb.connect(window.globalEffects.reverbWetGain);

// Connect: input -> splitter -> dry path and reverb
window.globalEffectsInput.connect(reverbInput);
reverbInput.connect(window.globalEffects.reverbDryGain);
reverbInput.connect(window.globalEffects.reverb);

// Reverb output -> wet gain
window.globalEffects.reverb.connect(window.globalEffects.reverbWetGain);

// Mix dry and wet -> delayInput
const delayInput = new Tone.Gain();
window.globalEffects.reverbDryGain.connect(delayInput);
window.globalEffects.reverbWetGain.connect(delayInput);

// Delay wet/dry split
delayInput.connect(window.globalEffects.delayDryGain);
delayInput.connect(window.globalEffects.delay);

// Delay output -> wet gain
window.globalEffects.delay.connect(window.globalEffects.delayWetGain);

// Mix delay dry/wet -> distortion
const delayOutput = new Tone.Gain();
window.globalEffects.delayDryGain.connect(delayOutput);
window.globalEffects.delayWetGain.connect(delayOutput);

delayOutput.chain(
    window.globalEffects.distortion,
    window.globalEffects.compressor,
    window.globalEffects.limiter,
    Tone.Destination
);

// Per-instrument effect chain creator
window.createSynthChain = function(synth) {
    const chain = {
        filter: new Tone.Filter({ frequency: 2000, Q: 1 }),
        volume: new Tone.Volume(0),
        // per-wave base gain (applied before user volume)
        waveGain: new Tone.Volume(0),
        vibrato: new Tone.Vibrato({ frequency: 5, depth: 0 }),
        // Tremolo implemented as an LFO controlling a Gain node so depth=1 => silence
        tremoloGain: new Tone.Gain(1),
        tremoloLFO: new Tone.LFO(5, 1, 1), // frequency, min, max (min/max updated by depth)
        // Wah: start as a gentle lowpass so low notes (C1/C2) are not attenuated.
        // When the user enables a wah effect, controls can change the filter type/Q/range.
        wahFilter: new Tone.Filter({ type: 'lowpass', frequency: 2000, Q: 1 }),
        wahLFO: new Tone.LFO(5, 200, 2000) // rate, min, max will be adjusted by controls
    };

    // Start LFOs where needed
    try { chain.vibrato.start(); } catch (e) {}
    // start tremolo LFO
    try { chain.tremoloLFO.start(); } catch (e) {}
    chain.wahLFO.start();

    // Connect wah LFO to wahFilter frequency
    chain.wahLFO.connect(chain.wahFilter.frequency);

    // Connect tremolo LFO to tremoloGain.gain
    chain.tremoloLFO.connect(chain.tremoloGain.gain);

    // Connect synth through effects (simplified chain)
    // Order: vibrato -> filter -> tremolo -> wah -> waveGain (per-wave) -> user volume -> global effects
    synth.chain(
        chain.vibrato,
        chain.filter,
        chain.tremoloGain,
        chain.wahFilter,
        chain.waveGain,
        chain.volume,
        window.globalEffectsInput
    );

    return chain;
};

// Drum sampler (bypasses per-instrument effects, goes straight to global)
window.drumSampler = new Tone.Sampler({
    urls: {
        'C2': 'sounds/kick.wav',
        'D2': 'sounds/snare.wav',
        'E2': 'sounds/hihat.wav',
        'F2': 'sounds/openhat.wav',
    },
    onload: () => {
        console.log('Drum samples loaded');
    }
}).connect(window.globalEffectsInput);

// Bass synth with per-instrument effects
// Create bass synth with default sine oscillator to match UI default and avoid
// unexpected harmonic content at startup.
window.bassSynth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.1 },
    portamento: 0.1
});

window.bassChain = window.createSynthChain(window.bassSynth);

// Replace the bass synth instance while keeping the existing effect chain nodes.
// Useful when changing oscillator types in environments where direct assignment
// doesn't update the running oscillator instance reliably.
window.replaceBassSynth = function(type) {
    try {
        const prev = window.bassSynth;
        const prevEnv = prev && prev.envelope ? {
            attack: prev.envelope.attack || 0.01,
            decay: prev.envelope.decay || 0.1,
            sustain: prev.envelope.sustain || 0.8,
            release: prev.envelope.release || 0.1
        } : { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.1 };
        const prevPort = (prev && prev.portamento) ? prev.portamento : 0.1;

        // stop any sounding note
        try { if (prev && prev.triggerRelease) prev.triggerRelease(); } catch (e) {}
        try { if (prev && prev.disconnect) prev.disconnect(); } catch (e) {}
        try { if (prev && prev.dispose) prev.dispose(); } catch (e) {}

        // create new synth with requested oscillator type
        const newSynth = new Tone.Synth({
            oscillator: { type: type },
            envelope: prevEnv,
            portamento: prevPort
        });

        // connect new synth through existing chain nodes (vibrato -> filter -> tremolo -> wah -> waveGain -> volume -> globalEffectsInput)
        if (window.bassChain) {
            try {
                newSynth.chain(
                    window.bassChain.vibrato,
                    window.bassChain.filter,
                    window.bassChain.tremoloGain,
                    window.bassChain.wahFilter,
                    window.bassChain.waveGain,
                    window.bassChain.volume,
                    window.globalEffectsInput
                );
            } catch (err) {
                // fallback: connect directly to global effects input
                try { newSynth.connect(window.globalEffectsInput); } catch (e) { newSynth.toDestination(); }
            }
        } else {
            try { newSynth.connect(window.globalEffectsInput); } catch (e) { newSynth.toDestination(); }
        }

        window.bassSynth = newSynth;
        console.log('[audio] replaced bassSynth with oscillator type', type);
    } catch (err) {
        console.warn('[audio] replaceBassSynth error', err);
    }
};

// Drum sounds array (all point to sampler)
window.drumSounds = [window.drumSampler, window.drumSampler, window.drumSampler, window.drumSampler];

// Debug helpers: bypass all processing by connecting synths/samplers directly to the Destination,
// and restore them back to their chains. Useful for A/B testing which node is causing an issue.
window.disableAllProcessing = function() {
    window._processingBypass = window._processingBypass || {};

    try {
        if (window.bassSynth && window.bassChain) {
            window._processingBypass.bass = true;
            try { window.bassSynth.disconnect(); } catch (e) {}
            window.bassSynth.connect(Tone.Destination);
            console.log('[audio] bassSynth routed directly to Destination');
        }
    } catch (e) { console.warn('[audio] disableAllProcessing bass error', e); }

    try {
        if (window.drumSampler) {
            window._processingBypass.drum = true;
            try { window.drumSampler.disconnect(); } catch (e) {}
            window.drumSampler.connect(Tone.Destination);
            console.log('[audio] drumSampler routed directly to Destination');
        }
    } catch (e) { console.warn('[audio] disableAllProcessing drum error', e); }

    // Silence wet effect sends to avoid residual reverb/delay when bypassing
    try { if (window.globalEffects && window.globalEffects.reverbWetGain) window.globalEffects.reverbWetGain.gain.value = 0; } catch (e) {}
    try { if (window.globalEffects && window.globalEffects.delayWetGain) window.globalEffects.delayWetGain.gain.value = 0; } catch (e) {}

    console.log('[audio] processing bypass enabled');
};

window.restoreProcessing = function() {
    try {
        if (window.bassSynth && window.bassChain) {
            try { window.bassSynth.disconnect(); } catch (e) {}
            window.bassSynth.chain(
                window.bassChain.vibrato,
                window.bassChain.filter,
                window.bassChain.tremoloGain,
                window.bassChain.wahFilter,
                window.bassChain.waveGain,
                window.bassChain.volume,
                window.globalEffectsInput
            );
            console.log('[audio] bassSynth restored to chain');
        }
    } catch (e) { console.warn('[audio] restoreProcessing bass error', e); }

    try {
        if (window.drumSampler) {
            try { window.drumSampler.disconnect(); } catch (e) {}
            window.drumSampler.connect(window.globalEffectsInput);
            console.log('[audio] drumSampler restored to chain');
        }
    } catch (e) { console.warn('[audio] restoreProcessing drum error', e); }

    // Note: wet gains are left as-is; if you changed them manually while bypassed, restore them via controls.
    console.log('[audio] processing bypass disabled');
};

// Temporarily disable any gain/boosts (waveGain, user volume) and wet effect sends.
// Saves previous values to `window._boostBackup` so they can be restored.
window.disableAllBoosts = function() {
    window._boostBackup = window._boostBackup || {};
    try {
        const wg = window.bassChain && window.bassChain.waveGain;
        if (wg) {
            if (window._boostBackup.bassWaveGain === undefined) {
                window._boostBackup.bassWaveGain = (wg.volume && wg.volume.value !== undefined) ? wg.volume.value : (wg.value !== undefined ? wg.value : null);
            }
            if (wg.volume && wg.volume.value !== undefined) wg.volume.value = 0;
            else if (wg.value !== undefined) wg.value = 0;
        }
    } catch (e) { console.warn('[audio] disableAllBoosts bassWaveGain error', e); }

    try {
        const vol = window.bassChain && window.bassChain.volume;
        if (vol) {
            if (window._boostBackup.bassVolume === undefined) {
                window._boostBackup.bassVolume = (vol.volume && vol.volume.value !== undefined) ? vol.volume.value : (vol.value !== undefined ? vol.value : null);
            }
            if (vol.volume && vol.volume.value !== undefined) vol.volume.value = 0;
            else if (vol.value !== undefined) vol.value = 0;
        }
    } catch (e) { console.warn('[audio] disableAllBoosts bassVolume error', e); }

    try { if (window.globalEffects && window.globalEffects.reverbWetGain) { window._boostBackup.reverbWet = window.globalEffects.reverbWetGain.gain.value; window.globalEffects.reverbWetGain.gain.value = 0; } } catch (e) {}
    try { if (window.globalEffects && window.globalEffects.delayWetGain) { window._boostBackup.delayWet = window.globalEffects.delayWetGain.gain.value; window.globalEffects.delayWetGain.gain.value = 0; } } catch (e) {}

    console.log('[audio] boosts disabled (waveGain/volume/wet sends set to 0)');
};

window.restoreAllBoosts = function() {
    try {
        const wg = window.bassChain && window.bassChain.waveGain;
        if (wg && window._boostBackup && window._boostBackup.bassWaveGain !== undefined) {
            const v = window._boostBackup.bassWaveGain;
            if (wg.volume && wg.volume.value !== undefined) wg.volume.value = v;
            else if (wg.value !== undefined) wg.value = v;
        }
    } catch (e) { console.warn('[audio] restoreAllBoosts bassWaveGain error', e); }

    try {
        const vol = window.bassChain && window.bassChain.volume;
        if (vol && window._boostBackup && window._boostBackup.bassVolume !== undefined) {
            const v = window._boostBackup.bassVolume;
            if (vol.volume && vol.volume.value !== undefined) vol.volume.volume.value = v; // handle nested shape
            if (vol.volume && vol.volume.value !== undefined) vol.volume.value = v;
            else if (vol.value !== undefined) vol.value = v;
        }
    } catch (e) { console.warn('[audio] restoreAllBoosts bassVolume error', e); }

    try { if (window.globalEffects && window.globalEffects.reverbWetGain && window._boostBackup && window._boostBackup.reverbWet !== undefined) window.globalEffects.reverbWetGain.gain.value = window._boostBackup.reverbWet; } catch (e) {}
    try { if (window.globalEffects && window.globalEffects.delayWetGain && window._boostBackup && window._boostBackup.delayWet !== undefined) window.globalEffects.delayWetGain.gain.value = window._boostBackup.delayWet; } catch (e) {}

    console.log('[audio] boosts restored');
};