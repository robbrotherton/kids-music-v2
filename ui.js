// ui.js - UI interactions

// Generic sequencer grid initialization
window.initSequencerGrid = function(config) {
    const {
        gridId,
        track,
        rowLabels,
        cellClass,
        toggleFunction,
        isPolyphonic = false,
        rowClass = '',
        hasLabels = false,
        labelWidth = '40px'
    } = config;

    const grid = document.getElementById(gridId);
    grid.innerHTML = '';

    let buttonSize; // For dynamic sizing (drums)

    // For drums, we might need dynamic sizing
    if (gridId === 'drum-grid') {
        document.documentElement.style.setProperty('--steps', track.lengthSteps);
        const containerWidth = grid.clientWidth - 20; // padding 10*2
        const maxHeight = 160; // max-height 10em
        const availableHeight = (maxHeight - 20) / rowLabels.length; // padding and rows
        buttonSize = Math.min(containerWidth / track.lengthSteps, availableHeight);
        window.drumButtons = [];
    }

    for (let rowIndex = 0; rowIndex < rowLabels.length; rowIndex++) {
        const row = document.createElement('div');
        row.className = `sequencer-row ${rowClass}`;

        if (hasLabels) {
            const label = document.createElement('div');
            label.textContent = rowLabels[rowIndex];
            label.style.width = labelWidth;
            label.style.textAlign = 'right';
            label.style.marginRight = '10px';
            row.appendChild(label);
        }

        if (gridId === 'drum-grid') {
            window.drumButtons[rowIndex] = [];
        }

        for (let step = 0; step < track.lengthSteps; step++) {
            const stepBtn = document.createElement('button');
            stepBtn.className = `sequencer-cell ${cellClass}`;
            if (step % 4 === 0) stepBtn.classList.add('beat');
            stepBtn.dataset.step = step;

            if (isPolyphonic) {
                stepBtn.dataset.sound = rowIndex;
                stepBtn.className += ` sound-${rowIndex}`;
            } else {
                stepBtn.dataset.note = rowIndex;
            }

            if (gridId === 'drum-grid') {
                stepBtn.style.width = buttonSize + 'px';
                stepBtn.style.height = buttonSize + 'px';
            }

            // Check if active
            let isActive = false;
            if (isPolyphonic) {
                isActive = track.events.some(ev => ev.step === step && ev.soundIndex === rowIndex);
            } else {
                isActive = track.events.some(ev => ev.step === step && ev.noteIndex === rowIndex);
            }
            if (isActive) stepBtn.classList.add('active');

            stepBtn.addEventListener('click', toggleFunction);

            row.appendChild(stepBtn);

            if (gridId === 'drum-grid') {
                window.drumButtons[rowIndex][step] = stepBtn;
            }
        }
        grid.appendChild(row);
    }
};

// Generic track clearing
window.clearTrack = function(track, cellClass) {
    // Clear events
    track.events = [];
    // Clear UI
    document.querySelectorAll(`.${cellClass}.active`).forEach(step => {
        step.classList.remove('active');
    });
};

// Generic step toggle function
window.toggleStep = function(e, config) {
    const {
        track,
        isPolyphonic,
        dataKey, // 'sound' or 'note'
        eventKey, // 'soundIndex' or 'noteIndex'
        cellClass // for UI updates in monophonic mode
    } = config;

    const index = parseInt(e.target.dataset[dataKey]);
    const step = parseInt(e.target.dataset.step);

    if (isPolyphonic) {
        // Polyphonic: toggle individual sound on/off
        const existing = track.events.find(ev => ev.step === step && ev[eventKey] === index);
        if (existing) {
            track.events = track.events.filter(ev => ev !== existing);
            e.target.classList.remove('active');
        } else {
            track.events.push({ step, [eventKey]: index });
            e.target.classList.add('active');
        }
    } else {
        // Monophonic: only one note per step
        const existing = track.events.find(ev => ev.step === step && ev[eventKey] === index);
        if (existing) {
            // Remove this note
            track.events = track.events.filter(ev => ev !== existing);
            e.target.classList.remove('active');
        } else {
            // Remove any on this step
            track.events = track.events.filter(ev => ev.step !== step);
            // Add new
            track.events.push({ step, [eventKey]: index });
            // Update UI
            document.querySelectorAll(`.${cellClass}[data-step="${step}"]`).forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
        }
    }
};

// Tab switching
window.initTabs = function() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
            // Show/hide sequencer grids
            const gridId = tab.dataset.tab === 'drums' ? 'drum-grid' : tab.dataset.tab + '-grid';
            document.querySelectorAll('.sequencer-grid').forEach(g => g.style.display = 'none');
            const activeGrid = document.getElementById(gridId);
            if (activeGrid) {
                activeGrid.style.display = 'block';
                // Adjust app padding to fit the grid height
                const height = activeGrid.scrollHeight;
                document.getElementById('app').style.paddingBottom = height + 'px';
            } else {
                document.getElementById('app').style.paddingBottom = '1.25em'; // Default
            }
        });
    });
};

// Event listeners
window.initEventListeners = function() {
    document.getElementById('play-pause').addEventListener('click', window.togglePlay);
    document.getElementById('clear-sequencer').addEventListener('click', window.clearSequencer);
    document.getElementById('bpm-slider').addEventListener('input', window.updateBPM);
    // Bar selector
    document.querySelectorAll('.bar-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bars = parseInt(e.target.dataset.bars);
            window.changeDrumBars(bars);
        });
    });
};