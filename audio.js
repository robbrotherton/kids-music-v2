// audio.js - Audio setup and master chain

// Global audio variables
window.AudioContext = window.AudioContext || window.webkitAudioContext;
window.audioContext = new AudioContext();

Tone.context.lookAhead = 0.05; // Slightly increase to avoid timing issues

// Global effects chain
window.globalEffects = {
    distortion: new Tone.Distortion({ distortion: 0 }),
    delay: new Tone.FeedbackDelay({ delayTime: 0.3, feedback: 0.3, wet: 0 }),
    reverb: new Tone.Reverb({ decay: 2.5, wet: 0.3 }),
    compressor: new Tone.Compressor({ threshold: -24, ratio: 4 }),
    limiter: new Tone.Limiter(-1)
};

// Connect global chain
window.globalEffectsInput = new Tone.Gain();
window.globalEffectsInput.chain(
    window.globalEffects.distortion,
    window.globalEffects.delay,
    window.globalEffects.reverb,
    window.globalEffects.compressor,
    window.globalEffects.limiter,
    Tone.Destination
);

// Per-instrument effect chain creator
window.createSynthChain = function(synth) {
    const chain = {
        filter: new Tone.Filter({ frequency: 2000, Q: 1 }),
        volume: new Tone.Volume(0),
        vibrato: new Tone.Vibrato({ frequency: 5, depth: 0 }),
        tremolo: new Tone.Tremolo({ frequency: 5, depth: 0 }),
        wah: new Tone.AutoWah({ baseFrequency: 400, octaves: 4, sensitivity: 0, Q: 2 })
    };

    // Connect synth through effects (simplified chain)
    synth.chain(
        chain.vibrato,
        chain.filter,
        chain.tremolo,
        chain.wah,
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
window.bassSynth = new Tone.Synth({
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.1 },
    portamento: 0.1
});

window.bassChain = window.createSynthChain(window.bassSynth);

// Drum sounds array (all point to sampler)
window.drumSounds = [window.drumSampler, window.drumSampler, window.drumSampler, window.drumSampler];