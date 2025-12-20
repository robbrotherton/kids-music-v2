// transport.js - Transport controls and scheduling

// Global transport variables
window.isPlaying = false;
window.currentStep = 0;
window.bpm = 120;
window.previousStep = -1;
window.previousBassStep = -1;
window.previousRhythmStep = -1;

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
        // Rhythm - play polyphonic events (chords) on this step (independent of bass events)
        if (window.rhythmTrack && window.rhythmTrack.enabled && window.rhythmSynth) {
            const rhythmEvents = window.rhythmTrack.events.filter(ev => ev.step === value.step);
            if (rhythmEvents.length > 0) {
                const notes = rhythmEvents.map(ev => window.rhythmNotes[ev.noteIndex]);
                // Normalize chord loudness: apply a more aggressive attenuation per extra voice
                // to avoid harsh summing/clipping when multiple voices play. This uses a
                // configurable per-extra-voice attenuation (in dB).
                const nVoices = notes.length;
                const CHORD_ATTENUATION_DB_PER_EXTRA_VOICE = 14; // dB reduction per extra voice
                const attenuationDb = nVoices > 1 ? -CHORD_ATTENUATION_DB_PER_EXTRA_VOICE * (nVoices - 1) : 0;

                // Get volume node reference and current value
                const vNode = window.rhythmChain && window.rhythmChain.volume;
                let prevVol = 0;
                try {
                    if (vNode) {
                        if (vNode.volume !== undefined && vNode.volume.value !== undefined) prevVol = vNode.volume.value;
                        else if (vNode.value !== undefined) prevVol = vNode.value;
                    }
                } catch (e) { prevVol = window.controlState.rhythm.volume || 0; }

                const appliedVol = prevVol + attenuationDb;
                try {
                    if (vNode) {
                        if (vNode.volume !== undefined && vNode.volume.value !== undefined) vNode.volume.value = appliedVol;
                        else if (vNode.value !== undefined) vNode.value = appliedVol;
                    }
                } catch (e) {}

                // Scale velocity by number of voices (conservative: 1/n)
                const velocity = Math.max(0.05, 1 / nVoices);
                try {
                    window.rhythmSynth.triggerAttackRelease(notes, stepTime, time, velocity);
                } catch (e) {
                    notes.forEach(n => { try { window.rhythmSynth.triggerAttackRelease(n, stepTime, time, velocity); } catch (err) {} });
                }

                // Restore volume after the step duration (approximate) to previous value
                try {
                    setTimeout(() => {
                        try {
                            if (vNode) {
                                if (vNode.volume !== undefined && vNode.volume.value !== undefined) vNode.volume.value = prevVol;
                                else if (vNode.value !== undefined) vNode.value = prevVol;
                            }
                        } catch (e) {}
                    }, stepTime * 1000 + 10);
                } catch (e) {}
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