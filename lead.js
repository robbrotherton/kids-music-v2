// lead.js - Lead synth and sequencer (monophonic)

// Lead track
window.leadTrack = {
    lengthSteps: 16,
    events: [], // { startStep, endStep, noteIndex }
    enabled: true
};

// Lead notes (C4..B5 covering two octaves)
window.leadNotes = ['C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4','C5','C#5','D5','D#5','E5','F5','F#5','G5','G#5','A5','A#5','B5'];

// Initialize lead keyboard
window.initLeadKeyboard = function() {
    const keyboardContainer = document.getElementById('lead-keyboard');
    if (!keyboardContainer) return;

    window.createPianoKeyboard({
        container: keyboardContainer,
        octaves: 2,
        startOctave: 4,
        instrument: 'lead',
        onKeyDown: (note, frequency) => {
            try { Tone.start(); } catch (e) {}
            if (window.leadSynth) {
                // monophonic: triggerAttack with frequency
                try { window.leadSynth.triggerAttack(frequency); } catch (err) { try { window.leadSynth.triggerAttack(note); } catch (err2) {} }
            }
        },
        onKeyUp: (note, frequency) => {
            if (window.leadSynth) {
                try { window.leadSynth.triggerRelease(); } catch (e) {}
            }
        }
    });
    try { if (window.updateAllControls) window.updateAllControls(); } catch (e) {}
};

// Initialize lead grid (monophonic)
window.initLeadGrid = function() {
    window.initSequencerGrid({
        gridId: 'lead-grid',
        track: window.leadTrack,
        rowLabels: window.leadNotes,
        cellClass: 'lead-step',
        toggleFunction: window.toggleLeadStep,
        isPolyphonic: false,
        rowClass: 'lead-row',
        hasLabels: true
    });
};

// Toggle lead step - use generic monophonic span toggle
window.toggleLeadStep = function(e, spanData) {
    window.toggleSpanStep(e, spanData, { track: window.leadTrack, dataKey: 'note', eventKey: 'noteIndex', cellClass: 'lead-step' });
};

// Clear lead track
window.clearLeadTrack = function() {
    window.clearTrack(window.leadTrack, 'lead-step');
};
