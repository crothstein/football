import { getFormations } from './formations.js';

export class UI {
    constructor(store, editor, app) {
        this.store = store;
        this.editor = editor;
        this.app = app; // Reference to main app for callbacks

        // Element caching
        this.playbookListEl = document.getElementById('existing-playbooks-list');
        this.playsGridEl = document.getElementById('plays-grid');
        this.baseFormationSelect = document.getElementById('base-formation-select');
        this.teamSizeSelector = document.getElementById('team-size-selector');
        this.selectedTeamSizeInput = document.getElementById('selected-team-size');
        this.currentPlaybookNameEl = document.getElementById('current-playbook-name');

        // Header elements
        this.headerPlaybookName = document.getElementById('header-playbook-name');
        this.headerNewPlayBtn = document.getElementById('header-new-play-btn');

        this.initEventListeners();
    }

    initEventListeners() {
        // Team Size Change (Delegation)
        if (this.teamSizeSelector) {
            this.teamSizeSelector.addEventListener('click', (e) => {
                const btn = e.target.closest('.size-btn');
                if (!btn) return;

                // Update UI
                this.teamSizeSelector.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update State
                const size = btn.dataset.value;
                this.selectedTeamSizeInput.value = size; // e.g. "5"

                // Trigger formation update (convert "5" to "5v5" format expected by formations.js?)
                // formations.js expects "5v5", "6v6", etc.
                this.renderFormationOptions(size + 'v' + size);
            });
        }
    }

    renderCreatePlaybookView() {
        // Render existing playbooks list (hidden but preserved or used for "Cancel")
        const playbooks = this.store.getPlaybooks();
        this.playbookListEl.innerHTML = '';

        if (playbooks.length > 0) {
            playbooks.forEach(pb => {
                const btn = document.createElement('button');
                btn.className = 'btn-outline full-width mb-2';
                btn.textContent = `Switch to "${pb.name}"`;
                btn.onclick = () => this.app.openPlaybook(pb.id);
                this.playbookListEl.appendChild(btn);
            });
        }

        // Initialize formation selection
        // Default to 5
        const defaultSize = '5';
        this.selectTeamSize(defaultSize);
    }

    selectTeamSize(size) {
        if (!this.teamSizeSelector) return;

        // Update visuals
        this.teamSizeSelector.querySelectorAll('.size-btn').forEach(b => {
            if (b.dataset.value === size) b.classList.add('active');
            else b.classList.remove('active');
        });
        this.selectedTeamSizeInput.value = size;
        this.renderFormationOptions(size + 'v' + size);
    }

    renderPlaybookDropdownItems() {
        const listEl = document.getElementById('dropdown-playbook-list');
        if (!listEl) return;

        const playbooks = this.store.getPlaybooks();
        listEl.innerHTML = '';

        const currentId = this.app.currentPlaybook ? this.app.currentPlaybook.id : null;

        playbooks.forEach(pb => {
            const btn = document.createElement('button');
            btn.className = `dropdown-item ${pb.id === currentId ? 'active' : ''}`;

            // Create dot indicator
            const dot = document.createElement('span');
            dot.className = 'dot-indicator';
            dot.style.visibility = pb.id === currentId ? 'visible' : 'hidden';
            dot.textContent = '●';

            const text = document.createElement('span');
            text.textContent = pb.name;

            btn.appendChild(dot);
            btn.appendChild(text);

            btn.onclick = () => {
                this.app.openPlaybook(pb.id);
                document.getElementById('playbook-dropdown-menu').classList.add('hidden');
            };

            listEl.appendChild(btn);
        });
    }

    renderFormationOptions(teamSize) {
        const formations = getFormations(teamSize);
        this.baseFormationSelect.innerHTML = '';

        formations.forEach((fmt, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = fmt.name;
            this.baseFormationSelect.appendChild(opt);
        });
    }

    renderPlaybookOverview(playbook) {
        this.currentPlaybookNameEl.textContent = playbook.name;

        const plays = playbook.plays || [];
        this.playsGridEl.innerHTML = '';

        if (plays.length === 0) {
            this.playsGridEl.innerHTML = `
                <div class="empty-state">
                    <p>No plays in this playbook yet.</p>
                </div>`;
            return;
        }

        plays.forEach(play => {
            const card = document.createElement('div');
            card.className = 'play-card';
            // Placeholder for preview image if we had one
            card.innerHTML = `
                <div class="play-card-preview">
                    <!-- SVG Preview could go here -->
                    <div class="play-card-icon">🏈</div>
                </div>
                <div class="play-card-info">
                    <div class="play-name">${play.name || 'Untitled Play'}</div>
                    <div class="play-meta">${play.formation || '-'}</div>
                </div>
            `;
            card.onclick = () => this.app.openPlay(play.id);
            this.playsGridEl.appendChild(card);
        });
    }

    refreshPlayList(playbook) {
        // Re-render only the play list part
        this.renderPlaybookOverview(playbook);
    }
}
