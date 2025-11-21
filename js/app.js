import { Editor } from './editor.js';
import { Store } from './store.js';
import { UI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing App');
    // Initialize Modules
    const store = new Store();
    const editor = new Editor('play-canvas');
    const ui = new UI(store, editor);

    // Initialize Editor
    try {
        editor.init();
        console.log('Editor initialized successfully');
    } catch (e) {
        console.error('Failed to initialize editor:', e);
    }

    // Initialize UI
    // ui.init(); // UI class does not have init method currently
    console.log('UI initialized (no init method needed)');

    // Load initial state
    ui.renderPlayList();

    // Global Event Listeners
    const drawBtn = document.getElementById('draw-route');

    const updateRouteBtnState = (isActive) => {
        drawBtn.classList.toggle('active', isActive);
        drawBtn.querySelector('span').textContent = isActive ? '✕' : '✎';
    };

    document.getElementById('add-offense').addEventListener('click', () => {
        const player = editor.addPlayer('offense');

        // Auto-select the new player properly
        editor.selectElement(player);

        // Enable route mode immediately
        editor.toggleRouteMode(true);
        updateRouteBtnState(true);

        // Initialize the route starting from the player
        editor.startRouteFromPlayer(player);
    });

    drawBtn.addEventListener('click', () => {
        const isDrawing = editor.toggleRouteMode();
        updateRouteBtnState(isDrawing);
    });

    document.getElementById('clear-play').addEventListener('click', () => {
        if (confirm('Clear current play?')) editor.clear();
    });

    document.getElementById('save-play').addEventListener('click', () => {
        const playData = editor.exportData();
        const name = document.getElementById('play-name').value;
        store.savePlay({ ...playData, name });
        ui.renderPlayList();
        alert('Play Saved!');
    });

    // Properties Panel Logic
    const propPanel = document.getElementById('properties-panel');
    const closePropBtn = document.getElementById('close-prop');
    const deleteBtn = document.getElementById('delete-element');

    // Callback when editor selection changes
    editor.onSelectionChange = (el) => {
        if (el) {
            propPanel.classList.remove('hidden');
            // Set title based on type
            document.getElementById('prop-title').textContent =
                el.dataset.type.charAt(0).toUpperCase() + el.dataset.type.slice(1) + ' Settings';
        } else {
            propPanel.classList.add('hidden');
        }
    };

    closePropBtn.addEventListener('click', () => propPanel.classList.add('hidden'));

    deleteBtn.addEventListener('click', () => {
        editor.deleteSelected();
    });

    // Color Pickers
    // Color Pickers
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const color = e.target.dataset.color;
            console.log('Color button clicked:', color);
            if (color) {
                editor.updateElementColor(color);
            } else {
                console.error('No color found on button', e.target);
            }
        });
    });

    // Handle Play Name Change
    const playNameInput = document.getElementById('play-name');
    if (playNameInput) {
        playNameInput.addEventListener('input', (e) => {
            // Update current play name logic if needed
            console.log('Name changed:', e.target.value);
        });
    }
});
