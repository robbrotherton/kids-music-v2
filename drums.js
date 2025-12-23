// drums.js - Drum sequencer logic

// Drum track
window.drumTrack = {
    lengthSteps: 16,
    events: [], // {step, soundIndex}
    enabled: true
};

// Initialize drum pads
window.initDrumPads = function() {
    // Initializing drum pads
    const drumPads = document.getElementById('drum-pads');
    // drumPads element obtained
    drumPads.innerHTML = '';
    const padLabels = ['Kick', 'Snare', 'Hat', 'Open'];
    for (let i = 0; i < window.drumSounds.length; i++) {
        const pad = document.createElement('button');
        pad.className = 'drum-pad';
        pad.textContent = padLabels[i];
        pad.dataset.sound = i;
        pad.addEventListener('click', window.playDrumPad);
        drumPads.appendChild(pad);
    }
    // Drum pads created
};

// Play drum pad
window.playDrumPad = function(e) {
    const soundIndex = parseInt(e.target.dataset.sound);
    const notes = ['C2', 'D2', 'E2', 'F2'];
    if (window.drumSampler) {
        window.drumSampler.triggerAttackRelease(notes[soundIndex], '8n');
    }
    // If playing, add to current step (live recording)
    if (window.isPlaying) {
        const step = window.currentStep;
        const existing = window.drumTrack.events.find(ev => ev.step === step && ev.soundIndex === soundIndex);
        if (!existing) {
            window.drumTrack.events.push({ step, soundIndex });
            // Update UI
            const button = document.querySelector(`.drum-step[data-sound="${soundIndex}"][data-step="${step}"]`);
            if (button) {
                button.classList.add('active');
            }
        }
    }
};

// Initialize drum grid
window.initDrumGrid = function() {
    // Initializing drum grid
    window.initSequencerGrid({
        gridId: 'drum-grid',
        track: window.drumTrack,
        rowLabels: ['Kick', 'Snare', 'Hat', 'Open'],
        cellClass: 'drum-step',
        toggleFunction: window.toggleDrumStep,
        isPolyphonic: true,
        rowClass: 'drum-row'
    });
    // Drum grid created
};

// Change drum bars
window.changeDrumBars = function(bars) {
    window.changeSequenceLength(bars, [window.drumTrack, window.bassTrack]);
};

// Toggle drum step
window.toggleDrumStep = function(e) {
    window.toggleStep(e, {
        track: window.drumTrack,
        isPolyphonic: true,
        dataKey: 'sound',
        eventKey: 'soundIndex'
    });
};

// Clear drum track
window.clearDrumTrack = function() {
    window.clearTrack(window.drumTrack, 'drum-step');
};

// Clear sequencer (all tracks)
window.clearSequencer = function() {
    // Clear only the track for the currently active tab/instrument.
    const active = window.activeInstrument || (document.querySelector('.tab.active') && document.querySelector('.tab.active').dataset.tab) || 'drums';
    try {
        if (active === 'drums') {
            window.clearDrumTrack();
        } else if (active === 'bass') {
            window.clearBassTrack();
            try { if (window.safeReleaseSynth) window.safeReleaseSynth(window.bassSynth); } catch (e) {}
        } else if (active === 'rhythm') {
            if (typeof window.clearRhythmTrack === 'function') window.clearRhythmTrack();
            try { if (window.safeReleaseSynth) window.safeReleaseSynth(window.rhythmSynth); } catch (e) {}
        } else if (active === 'lead') {
            if (typeof window.clearLeadTrack === 'function') window.clearLeadTrack();
            try { if (window.safeReleaseSynth) window.safeReleaseSynth(window.leadSynth); } catch (e) {}
        } else {
            // Fallback: clear drum track
            window.clearDrumTrack();
        }
    } catch (e) {
        // If anything fails, at least clear drum and bass to avoid leaving UI in inconsistent state
        try { window.clearDrumTrack(); } catch (err) {}
        try { window.clearBassTrack(); } catch (err) {}
    }
};