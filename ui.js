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
    // Defensive fallback: if we couldn't measure the grid (e.g. it's hidden),
    // pick a reasonable default so cells render with stable sizing instead
    // of producing invalid widths (NaN / negative).
    if (!isFinite(buttonSize) || buttonSize <= 0) {
        buttonSize = 30; // matches sequencer CSS min size
    }

    for (let rowIndex = 0; rowIndex < rowLabels.length; rowIndex++) {
        const row = document.createElement('div');
        row.className = `sequencer-row ${rowClass}`;
        // create per-row overlay for span connectors (drawn behind cells)
        const overlay = document.createElement('div');
        overlay.className = 'row-span-overlay';
        row.appendChild(overlay);

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

            // Check if active - handle discrete steps and note spans for both poly and mono
            let isActive = false;
            // Consider both point events ({step, noteIndex}) and span events ({startStep,endStep,noteIndex})
            isActive = track.events.some(ev => {
                // point event
                if (ev.step !== undefined && ev.step === step) {
                    return Object.keys(ev).some(k => k !== 'step' && ev[k] === rowIndex);
                }
                // span event
                if (ev.startStep !== undefined && ev.endStep !== undefined) {
                    return ev.startStep <= step && ev.endStep >= step && (ev.noteIndex === rowIndex || ev.note === rowIndex);
                }
                return false;
            });
            if (isActive) stepBtn.classList.add('active');

            // Attach event listeners
            if (isPolyphonic) {
                stepBtn.addEventListener('click', toggleFunction);
                // Enable drag-to-span for polyphonic grids: start drag on mousedown and complete on mouseup
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
                        // call polyphonic span toggle
                        window.togglePolySpanStep(e, { startStep: start, endStep: end, noteIndex: rowIndex }, { track, eventKey: 'noteIndex', dataKey: 'sound', cellClass });
                        window.dragState.isDragging = false;
                    }
                });
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
        // Draw any existing spans for this row
        try { window.drawSpanOverlayForRow(row, track, cellClass); } catch (e) {}
    }

    // Global mouseup to handle drag end outside grid
    if (!isPolyphonic) {
        document.addEventListener('mouseup', () => {
            window.dragState.isDragging = false;
        });
    }
};

// Draw span connector rectangles for a single row element using the track data.
window.drawSpanOverlayForRow = function(rowElement, track, cellClass) {
    if (!rowElement) return;
    const overlay = rowElement.querySelector('.row-span-overlay');
    if (!overlay) return;
    // clear existing connectors
    overlay.innerHTML = '';

    // Determine this row's note/sound index from any cell in it
    const sampleCell = rowElement.querySelector(`.${cellClass}`);
    if (!sampleCell) return;
    // noteIndex for monophonic rows is in data-note; for polyphonic rows it's data-sound
    const noteKey = sampleCell.dataset.note !== undefined ? 'note' : (sampleCell.dataset.sound !== undefined ? 'sound' : 'note');
    const rowNoteIndex = parseInt(sampleCell.dataset[noteKey]);

    // For each span event on the track that belongs to this row, draw a connector
    track.events.forEach(ev => {
        const start = ev.startStep;
        const end = ev.endStep;
        const evIndex = ev.noteIndex ?? ev.note ?? ev.sound ?? ev.soundIndex;
        if (start === undefined || end === undefined) return;
        if (evIndex === undefined) return;
        // Only draw spans that belong to this row
        if (evIndex !== rowNoteIndex) return;

        const startCell = rowElement.querySelector(`.${cellClass}[data-step="${start}"]`);
        const endCell = rowElement.querySelector(`.${cellClass}[data-step="${end}"]`);
        if (!startCell || !endCell) return;

        const left = startCell.offsetLeft;
        const width = (endCell.offsetLeft + endCell.offsetWidth) - left;

        const rect = document.createElement('div');
        rect.className = 'span-connector';
        rect.style.left = left + 'px';
        rect.style.width = Math.max(0, width) + 'px';
        overlay.appendChild(rect);
    });
};

// Redraw overlays for the row that contains the given cell (helper)
window.redrawOverlayForCell = function(cellElement, track, cellClass) {
    if (!cellElement) return;
    const row = cellElement.closest('.sequencer-row');
    if (!row) return;
    window.drawSpanOverlayForRow(row, track, cellClass);
};

// Generic track clearing
window.clearTrack = function(track, cellClass) {
    // Clear events
    track.events = [];
    // Clear UI - remove active and any span-related classes so styling fully resets
    document.querySelectorAll(`.${cellClass}`).forEach(step => {
        step.classList.remove('active');
        step.classList.remove('span-start');
        step.classList.remove('span-cont');
    });
    // Clear any overlays for grids containing this cellClass
    document.querySelectorAll(`.${cellClass}`).forEach(step => {
        const row = step.closest('.sequencer-row');
        if (row) {
            const overlay = row.querySelector('.row-span-overlay');
            if (overlay) overlay.innerHTML = '';
        }
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
        const toRemove = track.events.filter(ev => (ev[eventKey] === noteIndex && ev.startStep <= endStep && ev.endStep >= startStep));
        track.events = track.events.filter(ev => !toRemove.includes(ev));
        // Clear UI for the full ranges of removed events (not just the clicked sub-range)
        toRemove.forEach(ev => {
            const rs = ev.startStep;
            const re = ev.endStep;
            for (let s = rs; s <= re; s++) {
                const selector = cellClass ? `.${cellClass}[data-step="${s}"][data-note="${noteIndex}"]` : `[data-step="${s}"][data-note="${noteIndex}"]`;
                document.querySelectorAll(selector).forEach(btn => {
                    btn.classList.remove('active');
                    btn.classList.remove('span-start');
                    btn.classList.remove('span-cont');
                });
            }
        });
        // redraw overlay for this row
        const sample = document.querySelector(cellClass ? `.${cellClass}[data-note="${noteIndex}"]` : `[data-note="${noteIndex}"]`);
        try { if (sample) window.redrawOverlayForCell(sample, track, cellClass); } catch (e) {}
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
    // redraw overlay for this row
    const sample = document.querySelector(cellClass ? `.${cellClass}[data-note="${noteIndex}"]` : `[data-note="${noteIndex}"]`);
    try { if (sample) window.redrawOverlayForCell(sample, track, cellClass); } catch (e) {}
};

// Polyphonic span toggle: allow creating/removing spans per-note without removing
// other notes that overlap the same step range. This is used by the rhythm grid.
window.togglePolySpanStep = function(e, spanData, config) {
    const { track, eventKey = 'noteIndex', cellClass } = config || {};
    let startStep, endStep, noteIndex;
    if (spanData) {
        ({ startStep, endStep, noteIndex } = spanData);
    } else {
        noteIndex = parseInt(e.target.dataset.sound || e.target.dataset.note);
        startStep = endStep = parseInt(e.target.dataset.step);
    }

    // Find overlapping spans for the same noteIndex
    const overlapping = track.events.filter(ev => ev[eventKey] === noteIndex && ev.startStep !== undefined && ev.startStep <= endStep && ev.endStep >= startStep);

    if (overlapping.length > 0) {
        // Remove overlapping spans for this note (may be larger than clicked range)
        const toRemove = track.events.filter(ev => (ev[eventKey] === noteIndex && ev.startStep !== undefined && ev.startStep <= endStep && ev.endStep >= startStep));
        track.events = track.events.filter(ev => !toRemove.includes(ev));
        // Clear UI for the full ranges of removed spans for this note
        toRemove.forEach(ev => {
            const rs = ev.startStep;
            const re = ev.endStep;
            for (let s = rs; s <= re; s++) {
                const selector = cellClass ? `.${cellClass}[data-step="${s}"][data-sound="${noteIndex}"]` : `[data-step="${s}"][data-sound="${noteIndex}"]`;
                document.querySelectorAll(selector).forEach(btn => {
                    btn.classList.remove('active');
                    btn.classList.remove('span-start');
                    btn.classList.remove('span-cont');
                });
            }
        });
        // redraw overlay for this row
        const sample = document.querySelector(cellClass ? `.${cellClass}[data-sound="${noteIndex}"]` : `[data-sound="${noteIndex}"]`);
        try { if (sample) window.redrawOverlayForCell(sample, track, cellClass); } catch (e) {}
        return;
    }

    // Add span for this specific note (don't remove events on other notes)
    track.events.push({ startStep, endStep, [eventKey]: noteIndex });
    for (let s = startStep; s <= endStep; s++) {
        const selector = cellClass ? `.${cellClass}[data-step="${s}"][data-sound="${noteIndex}"]` : `[data-step="${s}"][data-sound="${noteIndex}"]`;
        document.querySelectorAll(selector).forEach((btn, idx) => {
            btn.classList.add('active');
            if (s === startStep) btn.classList.add('span-start'); else btn.classList.add('span-cont');
        });
    }
    // redraw overlay for this row (polyphonic)
    const sample = document.querySelector(cellClass ? `.${cellClass}[data-sound="${noteIndex}"]` : `[data-sound="${noteIndex}"]`);
    try { if (sample) window.redrawOverlayForCell(sample, track, cellClass); } catch (e) {}
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
            // Move the instrument controls panel into the active tab content so instrument-specific controls sit inside the tab
            try {
                const controlsPanel = document.getElementById('controls-panel');
                const targetContent = document.getElementById(tab.dataset.tab);
                if (controlsPanel && targetContent) {
                    // Prefer inserting before known keyboard/pad elements so controls appear above them
                    const insertBeforeEl = targetContent.querySelector('#drum-pads, #bass-keyboard, #rhythm-keyboard, #lead-keyboard');
                    if (insertBeforeEl) targetContent.insertBefore(controlsPanel, insertBeforeEl);
                    else targetContent.insertBefore(controlsPanel, targetContent.firstChild);
                }
            } catch (e) {}
            // Show/hide shared effects vs drum-specific controls
            try {
                const shared = document.getElementById('shared-effects');
                const drumControls = document.getElementById('drum-controls');
                const controlsPanel = document.getElementById('controls-panel');
                // Global shared effects should always be visible at the bottom
                if (shared) shared.style.display = 'flex';
                // Keep drum-specific controls hidden for now
                if (drumControls) drumControls.style.display = 'none';
                // Show/hide the instrument controls panel for non-drum tabs
                if (tab.dataset.tab === 'drums') {
                    if (controlsPanel) controlsPanel.style.display = 'none';
                } else {
                    if (controlsPanel) controlsPanel.style.display = 'block';
                }
            } catch (e) {}
            // Rebind shared controls to the active instrument (if available)
            try { if (window.bindControlsToInstrument) window.bindControlsToInstrument(tab.dataset.tab); } catch (e) {}
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