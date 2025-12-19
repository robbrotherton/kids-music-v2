// main.js - Main initialization

// Initialize everything
window.initApp = function() {
    if (window.appInitialized) {
        console.log('App already initialized, skipping');
        return;
    }
    console.log('Starting initApp');
    window.initDrumPads();
    console.log('Drum pads initialized');
    window.initDrumGrid();
    console.log('Drum grid initialized');
    window.initBassGrid();
    console.log('Bass grid initialized');
    window.initBassKeyboard();
    console.log('Bass keyboard initialized');
    window.initTabs();
    console.log('Tabs initialized');
    window.initEventListeners();
    console.log('Event listeners initialized');
    window.setupTransportSchedule();
    console.log('Transport schedule set up');
    window.updateBPM();
    console.log('BPM updated');
    console.log('App initialization complete');
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