// drums.js - Drum sequencer logic

// Drum track
window.drumTrack = {
    lengthSteps: 16,
    events: [], // {step, soundIndex}
    enabled: true
};

// Initialize drum pads
window.initDrumPads = function() {
    const drumPads = document.getElementById('drum-pads');
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
};

// Play drum pad
window.playDrumPad = function(e) {
    const soundIndex = parseInt(e.target.dataset.sound);
    if (window.drumSounds[soundIndex]) {
        window.drumSounds[soundIndex].triggerAttackRelease('C2', '8n');
    }
};

// Initialize drum grid
window.initDrumGrid = function() {
    const drumGrid = document.getElementById('drum-grid');
    drumGrid.innerHTML = '';
    document.documentElement.style.setProperty('--steps', window.drumTrack.lengthSteps);
    const containerWidth = drumGrid.clientWidth - 20; // padding 10*2
    const maxHeight = 160; // max-height 10em
    const availableHeight = (maxHeight - 20) / 4; // padding and 4 rows
    const buttonSize = Math.min(containerWidth / window.drumTrack.lengthSteps, availableHeight);
    window.drumButtons = [];
    for (let sound = 0; sound < window.drumSounds.length; sound++) {
        window.drumButtons[sound] = [];
        const row = document.createElement('div');
        row.className = 'drum-row';
        for (let step = 0; step < window.drumTrack.lengthSteps; step++) {
            const stepBtn = document.createElement('button');
            stepBtn.className = `drum-step sound-${sound}`;
            stepBtn.dataset.sound = sound;
            stepBtn.dataset.step = step;
            stepBtn.style.width = buttonSize + 'px';
            stepBtn.style.height = buttonSize + 'px';
            // Check if active
            const isActive = window.drumTrack.events.some(ev => ev.step === step && ev.soundIndex === sound);
            if (isActive) stepBtn.classList.add('active');
            stepBtn.addEventListener('click', window.toggleDrumStep);
            row.appendChild(stepBtn);
            window.drumButtons[sound][step] = stepBtn;
        }
        drumGrid.appendChild(row);
    }
};

// Change drum bars
window.changeDrumBars = function(bars) {
    const wasPlaying = window.isPlaying;
    if (wasPlaying) {
        window.togglePlay(); // Stop
    }
    window.drumTrack.lengthSteps = bars * 16;
    // Clear events beyond new length
    window.drumTrack.events = window.drumTrack.events.filter(ev => ev.step < window.drumTrack.lengthSteps);
    window.initDrumGrid();
    // Reset step highlighting
    window.previousStep = -1;
    // Update bar buttons
    document.querySelectorAll('.bar-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.bars) === bars) btn.classList.add('active');
    });
    if (wasPlaying) {
        window.togglePlay(); // Restart
    }
};

// Toggle drum step
window.toggleDrumStep = function(e) {
    const sound = parseInt(e.target.dataset.sound);
    const step = parseInt(e.target.dataset.step);
    const existing = window.drumTrack.events.find(ev => ev.step === step && ev.soundIndex === sound);
    if (existing) {
        window.drumTrack.events = window.drumTrack.events.filter(ev => ev !== existing);
        e.target.classList.remove('active');
    } else {
        window.drumTrack.events.push({ step, soundIndex: sound });
        e.target.classList.add('active');
    }
};