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

// Drum sampler
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
}).connect(window.compressor); // Bypass reverb, go to compressor

// Drum sounds array (all point to sampler, but we'll use notes)
window.drumSounds = [window.drumSampler, window.drumSampler, window.drumSampler, window.drumSampler];