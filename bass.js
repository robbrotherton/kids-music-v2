// bass.js - Bass sequencer logic

// Bass track
window.bassTrack = {
    lengthSteps: 16,
    events: [], // {step, noteIndex}
    enabled: true
};

// Bass notes (12-note chromatic)
window.bassNotes = ['C2', 'C#2', 'D2', 'D#2', 'E2', 'F2', 'F#2', 'G2', 'G#2', 'A2', 'A#2', 'B2'];

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

// Initialize bass keyboard
window.initBassKeyboard = function() {
    const keyboardContainer = document.getElementById('bass-keyboard');
    if (!keyboardContainer) return;

    window.createPianoKeyboard({
        container: keyboardContainer,
        octaves: 2,
        startOctave: 2,
        instrument: 'bass',
        onKeyDown: (note, frequency) => {
            if (window.bassSynth) {
                window.bassSynth.triggerAttack(frequency);
            }
        },
        onKeyUp: (note, frequency) => {
            if (window.bassSynth) {
                window.bassSynth.triggerRelease();
            }
        }
    });
};

// Toggle bass step
window.toggleBassStep = function(e) {
    window.toggleStep(e, {
        track: window.bassTrack,
        isPolyphonic: false,
        dataKey: 'note',
        eventKey: 'noteIndex',
        cellClass: 'bass-step'
    });
};

// Clear bass track
window.clearBassTrack = function() {
    window.clearTrack(window.bassTrack, 'bass-step');
};