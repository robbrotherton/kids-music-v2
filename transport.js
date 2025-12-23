// transport.js - Transport controls and scheduling

// Global transport variables
window.isPlaying = false;
window.currentStep = 0;
window.bpm = 120;
window.previousStep = -1;
window.previousBassStep = -1;
window.previousRhythmStep = -1;
window.previousLeadStep = -1;

// Public helper to immediately release any sounding notes for a synth/voice.
window.safeReleaseSynth = function(s) {
    if (!s) return;
    try {
        const now = (typeof Tone !== 'undefined' && Tone.now) ? Tone.now() : undefined;
        try { if (s.releaseAll && typeof s.releaseAll === 'function') { s.releaseAll(now); return; } } catch (e) {}
        try { if (s.triggerRelease && typeof s.triggerRelease === 'function') { if (now !== undefined) { s.triggerRelease(undefined, now); } else { s.triggerRelease(); } return; } } catch (e) {}
        try { if (s.triggerReleaseAll && typeof s.triggerReleaseAll === 'function') { s.triggerReleaseAll(now); return; } } catch (e) {}
        // Last resort: disconnect and reconnect to stop sound
        try { if (s.disconnect) { s.disconnect(); if (s.connect) s.connect(window.globalEffectsInput); } } catch (e) {}
    } catch (err) {}
};

// Reusable function to highlight current step in any grid
window.highlightCurrentStep = function(selector, current, previous) {
    if (previous !== -1) {
        document.querySelectorAll(`${selector}[data-step="${previous}"]`).forEach(btn => btn.classList.remove('current'));
    }
    document.querySelectorAll(`${selector}[data-step="${current}"]`).forEach(btn => btn.classList.add('current'));
};

// Transport functions
window.togglePlay = async function() {
    if (window.isPlaying) {
        if (window.part) {
            // stop the scheduled part but keep it around to avoid recreation timing issues
            try { window.part.stop(); } catch (e) {}
        }
        Tone.Transport.stop();
        // Release any currently playing synths immediately (use Tone.now() where supported)
        function _safeRelease(s) {
            if (!s) return;
            try {
                const now = (typeof Tone !== 'undefined' && Tone.now) ? Tone.now() : undefined;
                // Prefer releaseAll if available (PolySynth may expose this)
                try { if (s.releaseAll && typeof s.releaseAll === 'function') { s.releaseAll(now); return; } } catch (e) {}
                // Fallback: call triggerRelease with undefined notes and a time to release all voices
                try { if (s.triggerRelease && typeof s.triggerRelease === 'function') { if (now !== undefined) { s.triggerRelease(undefined, now); } else { s.triggerRelease(); } return; } } catch (e) {}
                // Additional fallback attempts
                try { if (s.triggerReleaseAll && typeof s.triggerReleaseAll === 'function') { s.triggerReleaseAll(now); return; } } catch (e) {}
            } catch (err) {}
        }
        _safeRelease(window.bassSynth);
        _safeRelease(window.rhythmSynth);
        _safeRelease(window.leadSynth);
        document.getElementById('play-pause').textContent = 'Play';
        // Clear current step highlight
        if (window.previousStep !== -1 && window.drumButtons) {
            for (let sound = 0; sound < window.drumSounds.length; sound++) {
                if (window.drumButtons[sound] && window.drumButtons[sound][window.previousStep]) {
                    window.drumButtons[sound][window.previousStep].classList.remove('current');
                }
            }
        }
        // Clear current step highlight for bass
        document.querySelectorAll('.bass-step.current').forEach(btn => btn.classList.remove('current'));
        window.previousBassStep = -1;
        // Clear rhythm highlights
        document.querySelectorAll('.rhythm-step.current').forEach(btn => btn.classList.remove('current'));
        window.previousRhythmStep = -1;
        // Clear lead highlights
        document.querySelectorAll('.lead-step.current').forEach(btn => btn.classList.remove('current'));
        window.previousLeadStep = -1;
        window.previousStep = -1;
        window.currentStep = 0;
    } else {
        await Tone.start();
        if (!window.part) {
            window.setupTransportSchedule();
        }
        window.part.start(0);
        Tone.Transport.start();
        document.getElementById('play-pause').textContent = 'Pause';
    }
    window.isPlaying = !window.isPlaying;
};

window.updateBPM = function() {
    window.bpm = parseInt(document.getElementById('bpm-slider').value);
    Tone.Transport.bpm.value = window.bpm;
    document.getElementById('bpm-display').textContent = `BPM: ${window.bpm}`;
};

// Schedule repeat - will be set up after tracks are defined
window.setupTransportSchedule = function() {
    const events = [];
    const stepTime = Tone.Time("16n").toSeconds();
    for (let step = 0; step < window.drumTrack.lengthSteps; step++) {
        events.push({
            time: `0:0:${step}`,
            step: step
        });
    }
    window.part = new Tone.Part((time, value) => {
        if (!window.isPlaying) return;
        // Highlight current step
        window.highlightCurrentStep('.drum-step', value.step, window.previousStep);
        window.previousStep = value.step;

        // Drums
        if (window.drumTrack.enabled) {
            window.drumTrack.events.forEach(event => {
                if (event.step === value.step && window.drumSampler) {
                    const notes = ['C2', 'D2', 'E2', 'F2'];
                    window.drumSampler.triggerAttackRelease(notes[event.soundIndex], time);
                }
            });
        }
        // Bass - handle long notes using triggerAttackRelease for reliable scheduling
        if (window.bassTrack.enabled && window.bassSynth) {
            const stepDur = stepTime; // seconds per 16th
            const startingNotes = window.bassTrack.events.filter(ev => ev.startStep === value.step);
            startingNotes.forEach(ev => {
                const freq = Tone.Frequency(window.bassNotes[ev.noteIndex]).toFrequency();
                const durSteps = (ev.endStep !== undefined ? (ev.endStep - ev.startStep + 1) : 1);
                const dur = stepDur * durSteps;
                try {
                    window.bassSynth.triggerAttackRelease(freq, dur, time);
                } catch (e) {
                    try { window.bassSynth.triggerAttack(freq, time); window.bassSynth.triggerRelease(time + dur); } catch (err) {}
                }
            });
        }
        // Highlight bass current step
        window.highlightCurrentStep('.bass-step', value.step, window.previousBassStep);
        window.previousBassStep = value.step;
        // Lead - handle long notes (monophonic)
        if (window.leadTrack && window.leadTrack.enabled && window.leadSynth) {
            const stepDur = stepTime;
            const starts = window.leadTrack.events.filter(ev => ev.startStep === value.step);
            starts.forEach(ev => {
                const freq = Tone.Frequency(window.leadNotes[ev.noteIndex]).toFrequency();
                const durSteps = (ev.endStep !== undefined ? (ev.endStep - ev.startStep + 1) : 1);
                const dur = stepDur * durSteps;
                try {
                    window.leadSynth.triggerAttackRelease(freq, dur, time);
                } catch (e) {
                    try { window.leadSynth.triggerAttack(freq, time); window.leadSynth.triggerRelease(time + dur); } catch (err) {}
                }
            });
        }
        // Highlight lead current step
        window.highlightCurrentStep('.lead-step', value.step, window.previousLeadStep);
        window.previousLeadStep = value.step;
        // Rhythm - support both point events ({step}) and span events ({startStep,endStep})
        if (window.rhythmTrack && window.rhythmTrack.enabled && window.rhythmSynth) {
            const events = window.rhythmTrack.events || [];
            const stepDur = stepTime;
            // Handle starting events (point or span starts)
            const startingEvents = events.filter(ev => (ev.step !== undefined && ev.step === value.step) || (ev.startStep !== undefined && ev.startStep === value.step));

            // immediateNotes: notes that last only one step; sustained: have endStep > startStep
            const immediateNotes = [];
            const sustained = [];

            startingEvents.forEach(ev => {
                if (ev.step !== undefined) {
                    immediateNotes.push({ note: window.rhythmNotes[ev.noteIndex], durSteps: 1 });
                } else if (ev.startStep !== undefined) {
                    const durSteps = (ev.endStep !== undefined ? (ev.endStep - ev.startStep + 1) : 1);
                    if (durSteps <= 1) immediateNotes.push({ note: window.rhythmNotes[ev.noteIndex], durSteps: 1 });
                    else sustained.push({ note: window.rhythmNotes[ev.noteIndex], durSteps });
                }
            });

            if (immediateNotes.length > 0) {
                const notes = immediateNotes.map(n => n.note);
                const nVoices = notes.length;
                const velocity = Math.max(0.05, 1 / nVoices);
                try {
                    window.rhythmSynth.triggerAttackRelease(notes, stepDur, time, velocity);
                } catch (e) {
                    notes.forEach(n => { try { window.rhythmSynth.triggerAttackRelease(n, stepDur, time, velocity); } catch (err) {} });
                }
            }

            // sustained notes: schedule with explicit duration to avoid separate release scheduling
            if (sustained.length > 0) {
                sustained.forEach(s => {
                    const dur = stepDur * s.durSteps;
                    try {
                        window.rhythmSynth.triggerAttackRelease(s.note, dur, time);
                    } catch (e) {
                        try { window.rhythmSynth.triggerAttack(s.note, time); window.rhythmSynth.triggerRelease(time + dur); } catch (err) {}
                    }
                });
            }
        }
        // Highlight rhythm current step
        window.highlightCurrentStep('.rhythm-step', value.step, window.previousRhythmStep);
        window.previousRhythmStep = value.step;
        window.currentStep = (value.step + 1) % window.drumTrack.lengthSteps;
    }, events);
    window.part.loop = true;
    window.part.loopEnd = `0:1:0`; // 1 measure, but since lengthSteps can be 8,16,32, need to adjust
    // Actually, for loopEnd, since it's 16th notes, loopEnd should be based on lengthSteps
    window.part.loopEnd = `0:0:${window.drumTrack.lengthSteps}`;
};