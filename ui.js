// ui.js - UI interactions

// Drag selection state for monophonic tracks
window.dragState = {
    isDragging: false,
    startStep: null,
    startNote: null,
    currentStep: null,
    currentNote: null
};

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

            // Check if active - handle both discrete steps and note spans
            let isActive = false;
            if (isPolyphonic) {
                isActive = track.events.some(ev => ev.step === step && ev.soundIndex === rowIndex);
            } else {
                // For monophonic tracks, check if this step falls within any note span
                isActive = track.events.some(ev => 
                    ev.startStep <= step && ev.endStep >= step && ev.noteIndex === rowIndex
                );
            }
            if (isActive) stepBtn.classList.add('active');

            // Attach event listeners
            if (isPolyphonic) {
                stepBtn.addEventListener('click', toggleFunction);
            } else {
                // Monophonic: support click for single toggle, drag for spans
                stepBtn.addEventListener('mousedown', (e) => {
                    window.dragState.isDragging = true;
                    window.dragState.startStep = step;
                    window.dragState.startNote = rowIndex;
                    window.dragState.currentStep = step;
                    window.dragState.currentNote = rowIndex;
                });
                stepBtn.addEventListener('mouseenter', (e) => {
                    if (window.dragState.isDragging && window.dragState.startNote === rowIndex) {
                        window.dragState.currentStep = step;
                    }
                });
                stepBtn.addEventListener('mouseup', (e) => {
                    if (window.dragState.isDragging) {
                        const start = Math.min(window.dragState.startStep, window.dragState.currentStep);
                        const end = Math.max(window.dragState.startStep, window.dragState.currentStep);
                        toggleFunction(e, { startStep: start, endStep: end, noteIndex: rowIndex, cellClass });
                        window.dragState.isDragging = false;
                    }
                });
            }

            row.appendChild(stepBtn);

            if (gridId === 'drum-grid') {
                window.drumButtons[rowIndex][step] = stepBtn;
            }
        }
        grid.appendChild(row);
    }

    // Global mouseup to handle drag end outside grid
    if (!isPolyphonic) {
        document.addEventListener('mouseup', () => {
            window.dragState.isDragging = false;
        });
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

// Generic monophonic span toggle (reusable for bass-like tracks)
// Usage: toggleSpanStep(e, spanData, { track, dataKey, eventKey, cellClass })
window.toggleSpanStep = function(e, spanData, config) {
    const { track, dataKey = 'note', eventKey = 'noteIndex', cellClass } = config || {};
    let startStep, endStep, noteIndex;

    if (spanData) {
        ({ startStep, endStep, noteIndex } = spanData);
    } else {
        noteIndex = parseInt(e.target.dataset[dataKey]);
        startStep = endStep = parseInt(e.target.dataset.step);
    }

    // Find any events on this note that overlap the clicked range
    const overlapping = track.events.filter(ev => ev[eventKey] === noteIndex && ev.startStep <= endStep && ev.endStep >= startStep);

    if (overlapping.length > 0) {
        // Remove overlapping events
        track.events = track.events.filter(ev => !(ev[eventKey] === noteIndex && ev.startStep <= endStep && ev.endStep >= startStep));
        // Clear UI for all steps in the clicked range
        for (let s = startStep; s <= endStep; s++) {
            const selector = cellClass ? `.${cellClass}[data-step="${s}"][data-note="${noteIndex}"]` : `[data-step="${s}"][data-note="${noteIndex}"]`;
            document.querySelectorAll(selector).forEach(btn => {
                btn.classList.remove('active');
                btn.classList.remove('span-start');
                btn.classList.remove('span-cont');
            });
        }
        return;
    }

    // No overlapping events for this note -> remove any events on other notes that overlap the range (monophonic behavior)
    track.events = track.events.filter(ev => !(ev.startStep <= endStep && ev.endStep >= startStep));
    // Clear UI active state for all notes in the affected step range
    for (let s = startStep; s <= endStep; s++) {
        const allSelector = cellClass ? `.${cellClass}[data-step="${s}"]` : `[data-step="${s}"]`;
        document.querySelectorAll(allSelector).forEach(btn => {
            btn.classList.remove('active');
            btn.classList.remove('span-start');
            btn.classList.remove('span-cont');
        });
    }
    // Add the new span
    track.events.push({ startStep, endStep, [eventKey]: noteIndex });
    for (let s = startStep; s <= endStep; s++) {
        const selector = cellClass ? `.${cellClass}[data-step="${s}"][data-note="${noteIndex}"]` : `[data-step="${s}"][data-note="${noteIndex}"]`;
        document.querySelectorAll(selector).forEach((btn, idx) => {
            btn.classList.add('active');
            if (s === startStep) {
                btn.classList.add('span-start');
            } else {
                btn.classList.add('span-cont');
            }
        });
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
            document.querySelectorAll('.sequencer-grid').forEach(g => g.style.display = 'none');
            const gridId = tab.dataset.tab === 'drums' ? 'drum-grid' : tab.dataset.tab + '-grid';
            const activeGrid = document.getElementById(gridId);
            if (activeGrid) {
                activeGrid.style.display = 'block';
            }
        });
    });
    
    // Activate first tab by default
    if (tabs.length > 0) {
        tabs[0].click();
    }
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