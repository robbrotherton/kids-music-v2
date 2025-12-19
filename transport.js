// transport.js - Transport controls and scheduling

// Global transport variables
window.isPlaying = false;
window.currentStep = 0;
window.bpm = 120;
window.previousStep = -1;
window.previousBassStep = -1;

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
                    console.log(`Bass single note: start=${event.startStep}, end=${event.endStep}, note=${window.bassNotes[event.noteIndex]}`);
                    window.bassSynth.triggerAttackRelease(freq, stepTime, time);
                } else {
                    // Multi-step note: just attack, release will happen later
                    console.log(`Bass span start: start=${event.startStep}, end=${event.endStep}, note=${window.bassNotes[event.noteIndex]}`);
                    window.bassSynth.triggerAttack(freq, time);
                }
            });
            
            // Check for notes that should end on this step (only for multi-step notes)
            const endingNotes = window.bassTrack.events.filter(event => 
                event.endStep === value.step && event.startStep !== event.endStep
            );
            if (endingNotes.length > 0) {
                console.log(`Bass span end: start=${endingNotes[0].startStep}, end=${endingNotes[0].endStep}, note=${window.bassNotes[endingNotes[0].noteIndex]}`);
                // For monophonic bass, just release current note
                window.bassSynth.triggerRelease(time + stepTime);
            }
        }        // Highlight bass current step
        window.highlightCurrentStep('.bass-step', value.step, window.previousBassStep);
        window.previousBassStep = value.step;
        window.currentStep = (value.step + 1) % window.drumTrack.lengthSteps;
    }, events);
    window.part.loop = true;
    window.part.loopEnd = `0:1:0`; // 1 measure, but since lengthSteps can be 8,16,32, need to adjust
    // Actually, for loopEnd, since it's 16th notes, loopEnd should be based on lengthSteps
    window.part.loopEnd = `0:0:${window.drumTrack.lengthSteps}`;
};