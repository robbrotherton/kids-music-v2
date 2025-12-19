// ui.js - UI interactions

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