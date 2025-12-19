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
    const grid = document.getElementById('bass-grid');
    grid.innerHTML = '';
    for (let noteIndex = 0; noteIndex < window.bassNotes.length; noteIndex++) {
        const row = document.createElement('div');
        row.className = 'sequencer-row bass-row';
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        const label = document.createElement('div');
        label.textContent = window.bassNotes[noteIndex];
        label.style.width = '40px';
        label.style.textAlign = 'right';
        label.style.marginRight = '10px';
        row.appendChild(label);
        for (let step = 0; step < window.bassTrack.lengthSteps; step++) {
            const stepBtn = document.createElement('button');
            stepBtn.className = 'sequencer-cell bass-step';
            if (step % 4 === 0) stepBtn.classList.add('beat');
            stepBtn.dataset.note = noteIndex;
            stepBtn.dataset.step = step;
            stepBtn.addEventListener('click', window.toggleBassStep);
            row.appendChild(stepBtn);
        }
        grid.appendChild(row);
    }
};

// Toggle bass step
window.toggleBassStep = function(e) {
    const noteIndex = parseInt(e.target.dataset.note);
    const step = parseInt(e.target.dataset.step);
    const existing = window.bassTrack.events.find(ev => ev.step === step && ev.noteIndex === noteIndex);
    if (existing) {
        // Remove this note
        window.bassTrack.events = window.bassTrack.events.filter(ev => ev !== existing);
        e.target.classList.remove('active');
    } else {
        // Remove any on this step
        window.bassTrack.events = window.bassTrack.events.filter(ev => ev.step !== step);
        // Add new
        window.bassTrack.events.push({ step, noteIndex });
        // Update UI
        document.querySelectorAll(`.bass-step[data-step="${step}"]`).forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
    }
};