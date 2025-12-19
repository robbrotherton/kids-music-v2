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
        // Replace AutoWah with a simple LFO-driven bandpass (wah)
        wahFilter: new Tone.Filter({ type: 'bandpass', frequency: 600, Q: 6 }),
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
window.bassSynth = new Tone.Synth({
    oscillator: { type: 'sawtooth' },
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.1 },
    portamento: 0.1
});

window.bassChain = window.createSynthChain(window.bassSynth);

// Drum sounds array (all point to sampler)
window.drumSounds = [window.drumSampler, window.drumSampler, window.drumSampler, window.drumSampler];