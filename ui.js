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
        });
    });
};

// Event listeners
window.initEventListeners = function() {
    document.getElementById('play-pause').addEventListener('click', window.togglePlay);
    document.getElementById('bpm-slider').addEventListener('input', window.updateBPM);
    // Bar selector
    document.querySelectorAll('.bar-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bars = parseInt(e.target.dataset.bars);
            window.changeDrumBars(bars);
        });
    });
};