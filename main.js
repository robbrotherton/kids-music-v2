// main.js - Main initialization

// Initialize everything
window.initApp = function() {
    if (window.appInitialized) {
        return;
    }
    // Starting initApp
    window.initDrumPads();
    window.initDrumGrid();
    // Rhythm (poly synth)
    if (typeof window.initRhythmGrid === 'function') { window.initRhythmGrid(); }
    if (typeof window.initRhythmKeyboard === 'function') { window.initRhythmKeyboard(); }
    window.initBassGrid();
    window.initBassKeyboard();
    window.initTabs();
    window.initControls();
    window.initEventListeners();
    window.setupTransportSchedule();
    window.updateBPM();
    // App initialization complete
    window.appInitialized = true;
};

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', window.initApp);

// Fallback: try to initialize after a short delay in case DOMContentLoaded doesn't fire
setTimeout(() => {
    if (!window.appInitialized) {
        console.log('DOMContentLoaded may not have fired, trying fallback initialization');
        window.initApp();
        window.appInitialized = true;
    }
}, 100);