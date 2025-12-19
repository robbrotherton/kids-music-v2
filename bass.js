// bass.js - Bass sequencer logic

// Bass track
window.bassTrack = {
    lengthSteps: 16,
    events: [], // {startStep, endStep, noteIndex} - for long notes
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

// Toggle bass step - now supports long notes
window.toggleBassStep = function(e) {
    const noteIndex = parseInt(e.target.dataset.note);
    const step = parseInt(e.target.dataset.step);
    
    // Check if there's already a note spanning this step
    const existingEvent = window.bassTrack.events.find(event => 
        event.startStep <= step && event.endStep >= step && event.noteIndex === noteIndex
    );
    
    if (existingEvent) {
        // Remove the entire note span
        window.bassTrack.events = window.bassTrack.events.filter(event => event !== existingEvent);
        // Update UI for all steps in the span
        for (let s = existingEvent.startStep; s <= existingEvent.endStep; s++) {
            document.querySelectorAll(`.bass-step[data-step="${s}"][data-note="${noteIndex}"]`).forEach(btn => {
                btn.classList.remove('active');
            });
        }
    } else {
        // Check if we're extending an existing note
        const adjacentStart = window.bassTrack.events.find(event => 
            event.endStep === step - 1 && event.noteIndex === noteIndex
        );
        const adjacentEnd = window.bassTrack.events.find(event => 
            event.startStep === step + 1 && event.noteIndex === noteIndex
        );
        
        if (adjacentStart) {
            // Extend the note forward
            adjacentStart.endStep = step;
            e.target.classList.add('active');
        } else if (adjacentEnd) {
            // Extend the note backward
            adjacentEnd.startStep = step;
            e.target.classList.add('active');
        } else {
            // Start a new note (for now, just 1 step - user can extend)
            window.bassTrack.events.push({
                startStep: step,
                endStep: step,
                noteIndex: noteIndex
            });
            e.target.classList.add('active');
        }
    }
};

// Clear bass track
window.clearBassTrack = function() {
    window.bassTrack.events = [];
    document.querySelectorAll('.bass-step').forEach(btn => btn.classList.remove('active'));
};;