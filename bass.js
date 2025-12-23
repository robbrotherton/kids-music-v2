// bass.js - Bass sequencer logic

// Bass track
window.bassTrack = {
    lengthSteps: 16,
    events: [], // {startStep, endStep, noteIndex} - for long notes
    enabled: true
};

// Bass notes (12-note chromatic, moved down an octave)
window.bassNotes = ['C1', 'C#1', 'D1', 'D#1', 'E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1'];

// Initialize bass keyboard
window.initBassKeyboard = function() {
    const keyboardContainer = document.getElementById('bass-keyboard');
    if (!keyboardContainer) return;

    window.createPianoKeyboard({
        container: keyboardContainer,
        octaves: 2,
        startOctave: 1,
        instrument: 'bass',
        onKeyDown: (note, frequency) => {
            // bass keyboard keydown
            if (window.bassSynth) {
                window.bassSynth.triggerAttack(frequency);
            }
        },
        onKeyUp: (note, frequency) => {
            // bass keyboard keyup
            if (window.bassSynth) {
                window.bassSynth.triggerRelease();
            }
        }
    });

    // Quick sanity check: log C1 and C2 frequencies and their ratio (should be 2)
        try {
            const c1 = Tone.Frequency('C1').toFrequency();
            const c2 = Tone.Frequency('C2').toFrequency();
        } catch (e) {
        }
};

// Initialize bass grid
window.initBassGrid = function() {
    window.initSequencerGrid({
        gridId: 'bass-grid',
        track: window.bassTrack,
        rowLabels: window.bassNotes,
        cellClass: 'bass-step',
        toggleFunction: window.toggleBassStep,
        isPolyphonic: false,
        rowClass: 'bass-row',
        hasLabels: true
    });
};

// Toggle bass step - delegate to generic monophonic span toggle
window.toggleBassStep = function(e, spanData) {
    window.toggleSpanStep(e, spanData, { track: window.bassTrack, dataKey: 'note', eventKey: 'noteIndex', cellClass: 'bass-step' });
};

// Clear bass track
window.clearBassTrack = function() {
    window.clearTrack(window.bassTrack, 'bass-step');
};