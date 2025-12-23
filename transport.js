// transport.js - Transport controls and scheduling

// Global transport variables
window.isPlaying = false;
window.currentStep = 0;
window.bpm = 120;
window.previousStep = -1;
window.previousBassStep = -1;
window.previousRhythmStep = -1;
window.previousLeadStep = -1;

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
            window.part.stop();
            window.part.dispose();
            window.part = null;
        }
        Tone.Transport.stop();
        // Release any currently playing synths
        if (window.bassSynth) {
            window.bassSynth.triggerRelease();
        }
        if (window.rhythmSynth) {
            try { window.rhythmSynth.triggerRelease(); } catch (e) {}
        }
        if (window.leadSynth) {
            try { window.leadSynth.triggerRelease(); } catch (e) {}
        }
        // TODO: Add release for rhythm and lead synths when implemented
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
        // Bass - handle long notes
        if (window.bassTrack.enabled && window.bassSynth) {
            // Check for notes that should start on this step
            const startingNotes = window.bassTrack.events.filter(event => event.startStep === value.step);
            startingNotes.forEach(event => {
                const freq = Tone.Frequency(window.bassNotes[event.noteIndex]).toFrequency();
                
                // If this is a single-step note, use triggerAttackRelease
                if (event.startStep === event.endStep) {
                    // Bass single note event
                    window.bassSynth.triggerAttackRelease(freq, stepTime, time);
                } else {
                    // Multi-step note: just attack, release will happen later
                    // Bass span start
                    window.bassSynth.triggerAttack(freq, time);
                }
                
            });
            
            // Check for notes that should end on this step (only for multi-step notes)
            const endingNotes = window.bassTrack.events.filter(event => 
                event.endStep === value.step && event.startStep !== event.endStep
            );
            if (endingNotes.length > 0) {
                // Bass span end
                // For monophonic bass, just release current note
                window.bassSynth.triggerRelease(time + stepTime);
            }
        }        // Highlight bass current step
        window.highlightCurrentStep('.bass-step', value.step, window.previousBassStep);
        window.previousBassStep = value.step;
        // Lead - handle long notes (monophonic)
        if (window.leadTrack && window.leadTrack.enabled && window.leadSynth) {
            const startingNotesL = window.leadTrack.events.filter(event => event.startStep === value.step);
            startingNotesL.forEach(event => {
                const freq = Tone.Frequency(window.leadNotes[event.noteIndex]).toFrequency();
                if (event.startStep === event.endStep) {
                    window.leadSynth.triggerAttackRelease(freq, stepTime, time);
                } else {
                    window.leadSynth.triggerAttack(freq, time);
                }
            });

            const endingNotesL = window.leadTrack.events.filter(event => event.endStep === value.step && event.startStep !== event.endStep);
            if (endingNotesL.length > 0) {
                window.leadSynth.triggerRelease(time + stepTime);
            }
        }
        // Highlight lead current step
        window.highlightCurrentStep('.lead-step', value.step, window.previousLeadStep);
        window.previousLeadStep = value.step;
        // Rhythm - support both point events ({step}) and span events ({startStep,endStep})
        if (window.rhythmTrack && window.rhythmTrack.enabled && window.rhythmSynth) {
            const events = window.rhythmTrack.events || [];

            // Find events that start on this step (either point events or span starts)
            const startingEvents = events.filter(ev => (ev.step !== undefined && ev.step === value.step) || (ev.startStep !== undefined && ev.startStep === value.step));

            const immediateNotes = [];
            const sustainedNotes = [];

            startingEvents.forEach(ev => {
                if (ev.step !== undefined) {
                    immediateNotes.push(window.rhythmNotes[ev.noteIndex]);
                } else if (ev.startStep !== undefined) {
                    if (ev.endStep !== undefined && ev.endStep === ev.startStep) immediateNotes.push(window.rhythmNotes[ev.noteIndex]);
                    else sustainedNotes.push(window.rhythmNotes[ev.noteIndex]);
                }
            });

            // Trigger immediate notes as a chord for the step. Use the same velocity
            // scaling used by the keyboard chord mode (1 / nVoices, clipped) so sequenced
            // chords match manual key presses.
            if (immediateNotes.length > 0) {
                const nVoices = immediateNotes.length;
                const velocity = Math.max(0.05, 1 / nVoices);
                try {
                    window.rhythmSynth.triggerAttackRelease(immediateNotes, stepTime, time, velocity);
                } catch (e) {
                    immediateNotes.forEach(n => { try { window.rhythmSynth.triggerAttackRelease(n, stepTime, time, velocity); } catch (err) {} });
                }
            }

            // Trigger sustained notes (attack now, release scheduled at their endStep)
            if (sustainedNotes.length > 0) {
                const nVoices = sustainedNotes.length;
                const velocity = Math.max(0.05, 1 / nVoices);
                try {
                    window.rhythmSynth.triggerAttack(sustainedNotes, time, velocity);
                } catch (e) {
                    sustainedNotes.forEach(n => { try { window.rhythmSynth.triggerAttack(n, time, velocity); } catch (err) {} });
                }
            }

            // Releases for span events that end on this step
            const endingEvents = events.filter(ev => ev.endStep !== undefined && ev.endStep === value.step && (ev.startStep === undefined || ev.startStep !== ev.endStep));
            if (endingEvents.length > 0) {
                const notesToRelease = endingEvents.map(ev => window.rhythmNotes[ev.noteIndex]);
                try {
                    window.rhythmSynth.triggerRelease(notesToRelease, time + stepTime);
                } catch (e) {
                    notesToRelease.forEach(n => { try { window.rhythmSynth.triggerRelease(n, time + stepTime); } catch (err) {} });
                }
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