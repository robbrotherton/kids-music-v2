// rhythm.js - Rhythm synth and sequencer (polyphonic)

// Rhythm track
window.rhythmTrack = {
    lengthSteps: 16,
    events: [], // { step, noteIndex } for polyphonic events
    enabled: true
};

// Rhythm notes: choose an octave range suitable for rhythm synth (e.g., C3..B3)
window.rhythmNotes = ['C3','C#3','D3','D#3','E3','F3','F#3','G3','G#3','A3','A#3','B3'];

// Initialize rhythm keyboard (reuse createPianoKeyboard)
window.initRhythmKeyboard = function() {
    const keyboardContainer = document.getElementById('rhythm-keyboard');
    if (!keyboardContainer) return;

    window.createPianoKeyboard({
        container: keyboardContainer,
        octaves: 1,
        startOctave: 3,
        instrument: 'rhythm',
        onKeyDown: (note, frequency) => {
            // rhythm keydown
            try { Tone.start(); } catch (e) {}
            // Chord mode: play a triad (root, major third, perfect fifth)
            if (window.rhythmSynth) {
                try {
                    const rootMidi = Tone.Frequency(note).toMidi();
                    const thirdMidi = rootMidi + 4; // major third
                    const fifthMidi = rootMidi + 7; // perfect fifth
                    const freqs = [
                        Tone.Frequency(rootMidi, 'midi').toFrequency(),
                        Tone.Frequency(thirdMidi, 'midi').toFrequency(),
                        Tone.Frequency(fifthMidi, 'midi').toFrequency()
                    ];
                    // triggerAttack accepts array of frequencies/notes on PolySynth
                    const nVoices = freqs.length || 1;
                    const velocity = Math.max(0.05, 1 / nVoices);
                    try { window.rhythmSynth.triggerAttack(freqs, undefined, velocity); } catch (err) { window.rhythmSynth.triggerAttack(freqs); }
                    // store last pressed chord on the element for release
                    try { e.target && (e.target._lastChord = freqs); } catch (err) {}
                } catch (e) {
                    // fallback: single note
                    try { window.rhythmSynth.triggerAttack(note); } catch (err) { try { window.rhythmSynth.triggerAttack(frequency); } catch (err2) {} }
                }
            }
        },
        onKeyUp: (note, frequency) => {
            // rhythm keyup
            if (window.rhythmSynth) {
                try {
                    const rootMidi = Tone.Frequency(note).toMidi();
                    const thirdMidi = rootMidi + 4;
                    const fifthMidi = rootMidi + 7;
                    const freqs = [
                        Tone.Frequency(rootMidi, 'midi').toFrequency(),
                        Tone.Frequency(thirdMidi, 'midi').toFrequency(),
                        Tone.Frequency(fifthMidi, 'midi').toFrequency()
                    ];
                    window.rhythmSynth.triggerRelease(freqs);
                } catch (e) {
                    try { window.rhythmSynth.triggerRelease(note); } catch (err) { try { window.rhythmSynth.triggerRelease(); } catch (err2) {} }
                }
            }
        }
    });
    // Ensure current control settings are applied to the rhythm synth/chain
    try { if (window.updateAllControls) window.updateAllControls(); } catch (e) {}
};

// Initialize rhythm grid (polyphonic)
window.initRhythmGrid = function() {
    window.initSequencerGrid({
        gridId: 'rhythm-grid',
        track: window.rhythmTrack,
        rowLabels: window.rhythmNotes,
        cellClass: 'rhythm-step',
        toggleFunction: function(e) {
            // use generic toggleStep with polyphonic config
            window.toggleStep(e, { track: window.rhythmTrack, isPolyphonic: true, dataKey: 'sound', eventKey: 'noteIndex', cellClass: 'rhythm-step' });
        },
        isPolyphonic: true,
        rowClass: 'rhythm-row',
        hasLabels: true
    });
};

// Clear rhythm track
window.clearRhythmTrack = function() {
    window.rhythmTrack.events = [];
    document.querySelectorAll('.rhythm-step').forEach(btn => btn.classList.remove('active'));
};
