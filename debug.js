// Debug script - paste this into browser console when viewing a play
console.log('=== FLAG FOOTBALL DEBUG ===\n');

// 1. Check if app exists
console.log('1. App instance:', window.app ? '✓ EXISTS' : '✗ MISSING');

// 2. Check current play data
if (window.app && window.app.currentPlay) {
    const play = window.app.currentPlay;
    console.log('2. Current play:', play.name);
    console.log('   Play data:', play.data);

    if (play.data && play.data.players) {
        console.log('   Number of players:', play.data.players.length);
        console.log('   First player coords:', play.data.players[0]);
    } else {
        console.log('   ✗ NO PLAYER DATA IN PLAY');
    }
} else {
    console.log('2. ✗ NO CURRENT PLAY');
}

// 3. Check DOM - players layer
const playersLayer = document.getElementById('players-layer');
console.log('3. Players layer HTML length:', playersLayer?.innerHTML.length || 0);
console.log('   Number of player groups:', playersLayer?.children.length || 0);

if (playersLayer && playersLayer.children.length > 0) {
    const firstPlayer = playersLayer.children[0];
    console.log('   First player element:', firstPlayer);
    console.log('   First player data-x:', firstPlayer.dataset.x);
    console.log('   First player data-y:', firstPlayer.dataset.y);
}

// 4. Check SVG viewBox
const svg = document.getElementById('play-canvas');
console.log('4. SVG viewBox:', svg?.getAttribute('viewBox'));
console.log('   SVG width:', svg?.getAttribute('width') || svg?.style.width);
console.log('   SVG height:', svg?.getAttribute('height') || svg?.style.height);

// 5. Try to get data from editor
if (window.app && window.app.editor) {
    const editorData = window.app.editor.getData();
    console.log('5. Editor getData() players:', editorData.players?.length || 0);
    if (editorData.players && editorData.players.length > 0) {
        console.log('   First player from getData:', editorData.players[0]);
    }
}

// 6. Check for JavaScript errors
console.log('6. Check console above for any red error messages');

console.log('\n=== END DEBUG ===');
