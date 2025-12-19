// pianoKeyboard.js - Piano keyboard component for instruments

window.createPianoKeyboard = function(options) {
    const {
        container,
        octaves = 2,
        startOctave = 3,
        onKeyDown,
        onKeyUp,
        instrument = 'bass'
    } = options;

    container.innerHTML = '';

    // Note names for white keys
    const whiteKeys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

    const keyboard = document.createElement('div');
    keyboard.className = 'piano-keyboard';
    keyboard.style.display = 'flex';
    keyboard.style.position = 'relative';
    // keyboard.style.padding = '00px';
    keyboard.style.backgroundColor = '#2c2c2c';
    keyboard.style.borderRadius = '8px';
    // keyboard.style.margin = '10px 0';

    // Create keys for each octave
    for (let octave = startOctave; octave < startOctave + octaves; octave++) {
        // White keys
        whiteKeys.forEach((note, index) => {
            const key = document.createElement('button');
            key.className = 'piano-key white-key';
            key.dataset.note = note + octave;
            key.dataset.frequency = Tone.Frequency(note + octave).toFrequency();
            key.textContent = note + octave;

            key.style.flex = '1';
            key.style.height = '120px';
            key.style.backgroundColor = 'white';
            key.style.border = '1px solid #ccc';
            key.style.borderRadius = '0 0 4px 4px';
            key.style.cursor = 'pointer';
            key.style.fontSize = '10px';
            key.style.color = '#333';
            key.style.display = 'flex';
            key.style.alignItems = 'flex-end';
            key.style.justifyContent = 'center';
            key.style.paddingBottom = '8px';

            // Add event listeners
            key.addEventListener('mousedown', (e) => {
                e.preventDefault();
                key.classList.add('active');
                if (onKeyDown) onKeyDown(key.dataset.note, key.dataset.frequency, instrument);
            });

            key.addEventListener('mouseup', () => {
                key.classList.remove('active');
                if (onKeyUp) onKeyUp(key.dataset.note, key.dataset.frequency, instrument);
            });

            key.addEventListener('mouseleave', () => {
                key.classList.remove('active');
                if (onKeyUp) onKeyUp(key.dataset.note, key.dataset.frequency, instrument);
            });

            keyboard.appendChild(key);
        });
    }

    // Add black keys after creating all white keys
    const whiteKeyElements = keyboard.querySelectorAll('.white-key');
    
    // Black keys appear between specific white keys: C-D, D-E, F-G, G-A, A-B
    const blackKeyPositions = [1, 2, 4, 5, 6]; // Indices within each octave where black keys should be placed
    const blackNoteNames = ['C#', 'D#', 'F#', 'G#', 'A#'];
    
    // For each octave, add black keys
    for (let octaveIndex = 0; octaveIndex < octaves; octaveIndex++) {
        const octaveStartIndex = octaveIndex * 7; // 7 white keys per octave
        
        blackKeyPositions.forEach((position, blackIndex) => {
            const absolutePosition = octaveStartIndex + position;
            if (absolutePosition < whiteKeyElements.length) {
                const whiteKey = whiteKeyElements[absolutePosition];
                const note = whiteKey.dataset.note;
                const octave = parseInt(note.slice(-1));
                
                const blackKey = document.createElement('button');
                blackKey.className = 'piano-key black-key';
                const blackNote = blackNoteNames[blackIndex] + octave;
                blackKey.dataset.note = blackNote;
                blackKey.dataset.frequency = Tone.Frequency(blackNote).toFrequency();

                const whiteKeyWidthPercent = 100 / (octaves * 7); // Percentage width of each white key
                const blackKeyOffsetPercent = whiteKeyWidthPercent * 0.3; // Offset to center the black key
                
                blackKey.style.width = `${whiteKeyWidthPercent * 0.6}%`; // Black key is 60% of white key width
                blackKey.style.height = '80px';
                blackKey.style.backgroundColor = 'black';
                blackKey.style.border = '1px solid #333';
                blackKey.style.borderRadius = '0 0 2px 2px';
                blackKey.style.position = 'absolute';
                blackKey.style.zIndex = '2';
                blackKey.style.cursor = 'pointer';
                blackKey.style.left = `${absolutePosition * whiteKeyWidthPercent - blackKeyOffsetPercent}%`;
                blackKey.style.color = 'white';
                blackKey.style.fontSize = '9px';
                blackKey.textContent = blackNote;

                // Add event listeners
                blackKey.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation(); // Prevent triggering white key
                    blackKey.classList.add('active');
                    if (onKeyDown) onKeyDown(blackKey.dataset.note, blackKey.dataset.frequency, instrument);
                });

                blackKey.addEventListener('mouseup', () => {
                    blackKey.classList.remove('active');
                    if (onKeyUp) onKeyUp(blackKey.dataset.note, blackKey.dataset.frequency, instrument);
                });

                blackKey.addEventListener('mouseleave', () => {
                    blackKey.classList.remove('active');
                    if (onKeyUp) onKeyUp(blackKey.dataset.note, blackKey.dataset.frequency, instrument);
                });

                keyboard.appendChild(blackKey);
            }
        });
    }

    container.appendChild(keyboard);

    // Add CSS for active states
    const style = document.createElement('style');
    style.textContent = `
        .piano-key.active {
            background-color: #4CAF50 !important;
            transform: scale(0.98);
        }
        .white-key.active {
            background-color: #e0e0e0 !important;
        }
        .black-key.active {
            background-color: #333 !important;
        }
    `;
    document.head.appendChild(style);
};