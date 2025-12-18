// audio.js - Audio setup and master chain

// Global audio variables
window.AudioContext = window.AudioContext || window.webkitAudioContext;
window.audioContext = new AudioContext();

Tone.context.lookAhead = 0.05; // Slightly increase to avoid timing issues

// Master chain
window.reverb = new Tone.Reverb({ decay: 2.5, wet: 0.3 });
window.compressor = new Tone.Compressor({ threshold: -24, ratio: 4 });
window.limiter = new Tone.Limiter(-1);

Tone.Destination.chain(window.reverb, window.compressor, window.limiter);

// Drum synths
window.kickSynth = new Tone.MembraneSynth({
    pitchDecay: 0.1,
    octaves: 8,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.5, sustain: 0.01, release: 1.5 }
}).connect(window.reverb);

window.snareSynth = new Tone.FMSynth({
    harmonicity: 1,
    modulationIndex: 10,
    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
    modulationEnvelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 }
}).connect(window.reverb);

window.hatSynth = new Tone.MetalSynth({
    frequency: 200,
    envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5
}).connect(window.reverb);

window.openHatSynth = new Tone.MetalSynth({
    frequency: 300,
    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
    harmonicity: 7.1,
    modulationIndex: 20,
    resonance: 6000,
    octaves: 2
}).connect(window.reverb);

// Drum sounds array
window.drumSounds = [window.kickSynth, window.snareSynth, window.hatSynth, window.openHatSynth];