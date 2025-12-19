// bass.js - Bass sequencer logic

// Bass track
window.bassTrack = {
    lengthSteps: 16,
    events: [], // {startStep, endStep, noteIndex} - for long notes
    enabled: true
};

// Bass notes (12-note chromatic, moved down an octave)
window.bassNotes = ['C1', 'C#1', 'D1', 'D#1', 'E1', 'F1', 'F#1', 'G1', 'G#1', 'A1', 'A#1', 'B1'];

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
        startOctave: 1,
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

// Toggle bass step - now supports drag for spans and click for single notes
window.toggleBassStep = function(e, spanData) {
    let startStep, endStep, noteIndex;
    
    if (spanData) {
        // Drag selection: create span
        ({ startStep, endStep, noteIndex, cellClass } = spanData);
    } else {
        // Single click: toggle individual cell
        noteIndex = parseInt(e.target.dataset.note);
        startStep = endStep = parseInt(e.target.dataset.step);
    }
    
    // Remove any existing notes that overlap with this range on this note
    window.bassTrack.events = window.bassTrack.events.filter(event => 
        !(event.noteIndex === noteIndex && 
          event.startStep <= endStep && 
          event.endStep >= startStep)
    );
    
    // Check if the entire span is already active
    const existingSpan = window.bassTrack.events.find(event => 
        event.startStep === startStep && 
        event.endStep === endStep && 
        event.noteIndex === noteIndex
    );
    
    if (existingSpan) {
        // Remove the span
        window.bassTrack.events = window.bassTrack.events.filter(event => event !== existingSpan);
        // Update UI for all steps in the span
        for (let s = startStep; s <= endStep; s++) {
            document.querySelectorAll(`.bass-step[data-step="${s}"][data-note="${noteIndex}"]`).forEach(btn => {
                btn.classList.remove('active');
            });
        }
    } else {
        // Add the new span
        window.bassTrack.events.push({
            startStep: startStep,
            endStep: endStep,
            noteIndex: noteIndex
        });
        // Update UI for all steps in the span
        for (let s = startStep; s <= endStep; s++) {
            document.querySelectorAll(`.bass-step[data-step="${s}"][data-note="${noteIndex}"]`).forEach(btn => {
                btn.classList.add('active');
            });
        }
    }
};

// Clear bass track
window.clearBassTrack = function() {
    window.bassTrack.events = [];
    document.querySelectorAll('.bass-step').forEach(btn => btn.classList.remove('active'));
};;