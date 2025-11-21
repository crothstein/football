export class UI {
    constructor(store, editor) {
        this.store = store;
        this.editor = editor;
        this.playListEl = document.getElementById('play-list');
    }

    renderPlayList() {
        const plays = this.store.getPlays();
        this.playListEl.innerHTML = '';

        if (plays.length === 0) {
            this.playListEl.innerHTML = '<div class="empty-state">No plays saved.</div>';
            return;
        }

        plays.forEach(play => {
            const div = document.createElement('div');
            div.className = 'play-item';
            div.textContent = play.name || 'Untitled Play';
            div.onclick = () => this.loadPlay(play);
            this.playListEl.appendChild(div);
        });
    }

    loadPlay(play) {
        this.editor.loadData(play);
        document.getElementById('play-name').value = play.name;

        // Highlight active
        const items = document.querySelectorAll('.play-item');
        items.forEach(i => i.classList.remove('active'));
        // (In a real app we'd match ID to highlight)
    }
}
