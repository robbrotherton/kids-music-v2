// main.js - Main initialization

// Initialize everything
window.initApp = function() {
    window.initDrumPads();
    window.initDrumGrid();
    window.initBassGrid();
    window.initTabs();
    window.initEventListeners();
    window.setupTransportSchedule();
    window.updateBPM();
};

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', window.initApp);