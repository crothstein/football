
import { Editor } from './js/editor.js';

// Helper to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
    console.log('Starting Reproduction Test...');

    // 1. Add Player
    const addBtn = document.getElementById('add-offense');
    addBtn.click();
    console.log('Clicked Add Player');

    await wait(500);

    // Get the player
    const player = document.querySelector('.draggable');
    if (!player) {
        console.error('Player not found!');
        return;
    }
    console.log('Player found:', player.id);

    // 2. Force a Vertical Route
    // We need to access the editor instance. 
    // Since we can't easily access the 'editor' variable from app.js (it's not global),
    // we will simulate user interactions or use the DOM.

    // Let's simulate drawing a vertical route.
    // We need to be in route mode.
    const drawBtn = document.getElementById('draw-route');
    // It should be active after adding a player.

    // Click on the player to start route (if not already started)
    // Actually, app.js starts the route automatically.

    // Click directly ABOVE the player to make a vertical line.
    // Player is at 400, 300.
    // Click at 400, 200.

    const canvas = document.getElementById('play-canvas');
    const rect = canvas.getBoundingClientRect();

    // Simulate click
    const clickEvent = new MouseEvent('click', {
        clientX: rect.left + 400, // Center X
        clientY: rect.top + 200,  // Up Y
        bubbles: true
    });
    canvas.dispatchEvent(clickEvent);
    console.log('Dispatched Click at (400, 200)');

    await wait(500);

    // Finish route
    drawBtn.click(); // Toggle off
    console.log('Finished Route');

    await wait(500);

    // 3. Test Color Switcher
    // Select the player again (just in case)
    // Simulate mousedown on player
    const mouseDown = new MouseEvent('mousedown', {
        bubbles: true
    });
    player.dispatchEvent(mouseDown);
    console.log('Selected Player');

    await wait(500);

    // Click Red Color Button
    const redBtn = document.querySelector('button[data-color="#ef4444"]');
    if (redBtn) {
        redBtn.click();
        console.log('Clicked Red Button');
    } else {
        console.error('Red button not found');
    }

    await wait(500);

    // Check Color
    const newColor = player.dataset.color;
    console.log('Player Color:', newColor);

    if (newColor === '#ef4444') {
        console.log('SUCCESS: Color changed to Red');
    } else {
        console.error('FAILURE: Color did not change');
    }
}

// Run after a short delay to let app load
setTimeout(runTest, 2000);
