import { Editor } from './editor.js?v=2';
import { Store } from './store.js?v=2';
import { UI } from './ui.js?v=3';
import { getFormations } from './formations.js?v=2';
import { AuthManager } from './auth.js?v=2';

class App {
    constructor() {
        this.auth = new AuthManager();
        this.store = new Store();
        this.editor = new Editor('play-canvas');
        this.ui = new UI(this.store, this.editor, this);

        this.currentPlaybook = null;
        this.currentPlay = null;

        this.views = {
            auth: document.getElementById('view-auth'),
            create: document.getElementById('view-create-playbook'),
            overview: document.getElementById('view-playbook-overview'),
            editor: document.getElementById('view-play-editor')
        };

        this.init();
    }

    async init() {
        try {
            console.log('App initializing...');
            // Check Auth
            const session = await this.auth.getSession();
            if (!session) {
                console.log('No session, switching to auth view');
                this.switchView('auth');
                this.bindAuthEvents(); // Prepare auth listeners

                // Check specific auth mode from URL (e.g. ?mode=signup)
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('mode') === 'signup') {
                    this.toggleAuthForms('signup');
                }

                return;
            }

            // If authenticated, proceed
            console.log('Session found, initializing app');
            this.initializeApp();
        } catch (err) {
            console.error('Initialization error:', err);
            alert('Failed to initialize app: ' + err.message);
            // Fallback to auth view just in case
            this.switchView('auth');
            this.bindAuthEvents();
        }
    }

    async initializeApp() {
        this.editor.init();

        // Helper to check playbooks and route
        const playbooks = await this.store.getPlaybooks();
        if (playbooks.length > 0) {
            this.openPlaybook(playbooks[0].id);
        } else {
            this.switchView('create');
        }

        this.bindEvents();
    }

    bindAuthEvents() {
        // Auth Toggles
        const toSignup = document.getElementById('link-to-signup');
        const toLogin = document.getElementById('link-to-login');

        if (toSignup) {
            toSignup.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAuthForms('signup');
            });
        }

        if (toLogin) {
            toLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAuthForms('login');
            });
        }

        // Login
        const btnLogin = document.getElementById('btn-login');
        if (btnLogin) {
            btnLogin.addEventListener('click', async () => {
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                try {
                    await this.auth.login(email, password);
                    this.initializeApp();
                } catch (error) {
                    alert('Login failed: ' + error.message);
                }
            });
        }

        // Signup
        const btnSignup = document.getElementById('btn-signup');
        if (btnSignup) {
            btnSignup.addEventListener('click', async () => {
                const name = document.getElementById('signup-name').value;
                const email = document.getElementById('signup-email').value;
                const password = document.getElementById('signup-password').value;

                if (!name) {
                    alert('Please enter your name.');
                    return;
                }

                try {
                    await this.auth.signup(email, password, name);
                    alert('Signup successful! Check your email for confirmation link.');
                    this.toggleAuthForms('login'); // Switch back to login
                } catch (error) {
                    alert('Signup failed: ' + error.message);
                }
            });
        }
    }

    // Toggle between Login and Signup forms
    toggleAuthForms(mode) {
        const loginForm = document.getElementById('form-login');
        const signupForm = document.getElementById('form-signup');

        if (mode === 'signup') {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
        } else {
            signupForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        }
    }

    bindEvents() {
        // Create Playbook (Modal "Check" button)
        const confirmBtn = document.getElementById('confirm-create-playbook');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.handleCreatePlaybook();
            });
        }

        // Close Modal Button (X)
        const closeBtn = document.getElementById('close-create-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', async () => {
                const playbooks = await this.store.getPlaybooks();
                if (playbooks.length > 0) {
                    this.openPlaybook(playbooks[0].id);
                } else {
                    alert('You must create a playbook to start.');
                }
            });
        }

        // Navigation
        const switchBtn = document.getElementById('switch-playbook-btn');
        // Navigation & Dropdown
        const dropdown = document.getElementById('playbook-dropdown-menu');

        if (switchBtn && dropdown) {
            switchBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent closing immediately
                dropdown.classList.toggle('hidden');
                // Refresh list when opening
                if (!dropdown.classList.contains('hidden')) {
                    this.ui.renderPlaybookDropdownItems();
                }
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                if (!dropdown.classList.contains('hidden')) {
                    dropdown.classList.add('hidden');
                }
            });

            // Prevent closing when clicking inside dropdown
            dropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        const dropdownCreateBtn = document.getElementById('dropdown-new-playbook');
        if (dropdownCreateBtn) {
            dropdownCreateBtn.addEventListener('click', () => {
                if (dropdown) dropdown.classList.add('hidden');
                this.switchView('create');
                this.ui.renderCreatePlaybookView();
            });
        }

        const navNewPlay = document.getElementById('nav-new-play');
        if (navNewPlay) {
            navNewPlay.addEventListener('click', () => {
                this.handleNewPlay();
            });
        }

        const navEditFormation = document.getElementById('nav-edit-formation');
        if (navEditFormation) {
            navEditFormation.addEventListener('click', () => {
                this.handleEditDefaultFormation();
            });
        }

        // Header New Play button
        const headerNewPlay = document.getElementById('header-new-play-btn');
        if (headerNewPlay) {
            headerNewPlay.addEventListener('click', () => {
                this.handleNewPlay();
            });
        }

        const backBtn = document.getElementById('back-to-book');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.switchView('overview');
                this.currentPlay = null;
                this.isEditingDefaultFormation = false; // Reset
                this.editor.clear();
                this.ui.renderPlaybookOverview(this.currentPlaybook);
            });
        }

        // Editor Actions (Save & Lock Logic)
        const toggleLockBtn = document.getElementById('toggle-lock-btn');
        if (toggleLockBtn) {
            toggleLockBtn.addEventListener('click', () => {
                if (this.editor.isLocked) {
                    // Unlock
                    this.editor.setLocked(false);
                } else {
                    // Save & Lock
                    if (this.isEditingDefaultFormation) {
                        this.saveDefaultFormation();
                    } else {
                        this.saveCurrentPlay();
                    }
                    this.editor.setLocked(true);
                }
            });
        }

        // Print Button
        const printBtn = document.getElementById('print-play');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }

        // User Profile & Logout
        const profileBtn = document.getElementById('user-profile-btn');
        const userMenu = document.getElementById('user-menu');
        const logoutBtn = document.getElementById('btn-logout');

        if (profileBtn && userMenu) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenu.classList.toggle('hidden');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!profileBtn.contains(e.target) && !userMenu.contains(e.target)) {
                    userMenu.classList.add('hidden');
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await this.auth.logout();
                    alert('Logged out successfully.');
                    window.location.reload(); // Reload to clear state and show Auth view
                } catch (err) {
                    alert('Error logging out: ' + err.message);
                }
            });
        }
    }

    switchView(viewName) {
        Object.values(this.views).forEach(el => {
            if (el) el.classList.add('hidden');
        });
        if (this.views[viewName]) this.views[viewName].classList.remove('hidden');
    }

    async handleCreatePlaybook() {
        const nameInput = document.getElementById('new-playbook-name');
        const name = nameInput.value.trim();
        if (!name) {
            alert('Please enter a playbook name');
            return;
        }

        // Get size from hidden input managed by UI class
        const sizeInput = document.getElementById('selected-team-size');
        const size = sizeInput ? sizeInput.value : '5';

        const formationSelect = document.getElementById('base-formation-select');
        const formationIdx = formationSelect ? formationSelect.value : 0;

        // Store the default formation preference for this playbook
        // Ensure teamSize matches formations.js keys (e.g. "5v5")
        const formattedSize = size.includes('v') ? size : `${size}v${size}`;

        const newPlaybook = {
            // id: Date.now().toString(), // DB handles ID now
            name: name,
            teamSize: formattedSize,
            defaultFormationIndex: formationIdx,
            plays: []
        };

        try {
            const savedBook = await this.store.savePlaybook(newPlaybook);
            this.openPlaybook(savedBook.id);
            // Reset form
            nameInput.value = '';
        } catch (err) {
            alert('Error creating playbook: ' + err.message);
        }
    }

    async openPlaybook(playbookId) {
        this.currentPlaybook = await this.store.getPlaybook(playbookId);
        if (this.currentPlaybook) {
            this.switchView('overview');
            this.ui.renderPlaybookOverview(this.currentPlaybook);

            // Update Header/Sidebar Names
            if (this.ui.currentPlaybookNameEl) this.ui.currentPlaybookNameEl.textContent = this.currentPlaybook.name;
            if (this.ui.headerPlaybookName) this.ui.headerPlaybookName.textContent = this.currentPlaybook.name;
        }
    }

    handleEditDefaultFormation() {
        if (!this.currentPlaybook) return;

        console.log('Editing default formation');
        this.isEditingDefaultFormation = true; // State flag

        // Get current default or fallback to template
        let players = [];
        if (this.currentPlaybook.defaultFormation) {
            players = JSON.parse(JSON.stringify(this.currentPlaybook.defaultFormation));
        } else {
            const formations = getFormations(this.currentPlaybook.teamSize);
            const defaultFormationIdx = this.currentPlaybook.defaultFormationIndex || 0;
            const template = formations[defaultFormationIdx];
            players = template ? JSON.parse(JSON.stringify(template.players)) : [];
        }

        // Setup Editor
        this.switchView('editor');
        this.editor.clear();
        this.editor.setMode('formation');

        // Render players (no routes)
        players.forEach(p => {
            // Strip routes just in case
            p.route = [];
            this.editor.renderPlayer(p);
        });

        // Update UI for Formation Mode
        document.getElementById('play-name').style.display = 'none';
        document.getElementById('formation-editor-title').style.display = 'block';

        this.editor.setLocked(true);
    }

    saveDefaultFormation() {
        if (!this.currentPlaybook) return;

        const data = this.editor.getData();
        // Save only players, ignore routes (which shouldn't exist anyway)
        this.currentPlaybook.defaultFormation = data.players.map(p => ({
            ...p,
            route: [] // Force empty routes
        }));

        this.store.savePlaybook(this.currentPlaybook);
        console.log('Default formation saved');
    }

    async handleNewPlay() {
        console.log('handleNewPlay called');
        if (!this.currentPlaybook) {
            console.error('No current playbook!');
            return;
        }

        this.isEditingDefaultFormation = false; // Reset flag

        // Determine starting players
        let startingPlayers = [];

        if (this.currentPlaybook.defaultFormation) {
            // Use user-defined default
            startingPlayers = JSON.parse(JSON.stringify(this.currentPlaybook.defaultFormation));
        } else {
            // Use systemic default
            const formations = getFormations(this.currentPlaybook.teamSize);
            console.log('Formations for size:', this.currentPlaybook.teamSize, formations);
            const defaultFormationIdx = this.currentPlaybook.defaultFormationIndex || 0;
            const template = formations[defaultFormationIdx];
            startingPlayers = template ? JSON.parse(JSON.stringify(template.players)) : [];
        }

        // Create new play object
        const newPlay = {
            // id: Date.now().toString(), // Let DB or save handle ID
            name: 'New Play',
            formation: 'Custom',
            players: startingPlayers,
            routes: []
        };

        // Save it immediately so it has an ID and exists
        try {
            const savedPlay = await this.store.savePlay(this.currentPlaybook.id, newPlay);
            console.log('Created new play:', savedPlay.id);

            // REFRESH STATE: Update local playbook reference from store
            this.currentPlaybook = await this.store.getPlaybook(this.currentPlaybook.id);

            // Open it
            this.openPlay(savedPlay.id);
        } catch (err) {
            alert('Error creating play: ' + err.message);
        }
    }

    openPlay(playId) {
        console.log('openPlay called for:', playId);
        if (!this.currentPlaybook) return;

        this.isEditingDefaultFormation = false; // Reset flag

        const play = this.currentPlaybook.plays.find(p => p.id === playId);
        if (!play) {
            console.error('Play not found in current playbook:', playId);
            return;
        }

        this.currentPlay = play;
        this.switchView('editor');
        this.editor.setMode('play'); // Normal mode
        console.log('Switched to editor view');

        // Reset UI for Play Mode
        document.getElementById('play-name').style.display = 'block';
        document.getElementById('formation-editor-title').style.display = 'none';

        // Load into editor
        this.editor.loadData(play);

        // Update Play Name Input
        const nameInput = document.getElementById('play-name');
        nameInput.value = play.name;

        // ... rest of listeners ...

        nameInput.oninput = (e) => {
            this.currentPlay.name = e.target.value;
        };

        const saveName = () => {
            this.currentPlay.name = nameInput.value;
            this.saveCurrentPlay();
        };

        // Auto-save on blur or enter (renaming should stick immediately)
        nameInput.onblur = saveName;
        nameInput.onchange = saveName; // catches Enter key often

        this.editor.setLocked(true); // Start locked
    }

    async saveCurrentPlay() {
        if (!this.currentPlay || !this.currentPlaybook) return;

        const data = this.editor.getData();
        this.currentPlay.players = data.players;
        this.currentPlay.routes = data.routes;
        // Name is already updated via input listener, but let's ensure
        this.currentPlay.name = document.getElementById('play-name').value;

        try {
            await this.store.savePlay(this.currentPlaybook.id, this.currentPlay);

            // REFRESH STATE: Update local playbook reference so UI/Logic stays in sync
            this.currentPlaybook = await this.store.getPlaybook(this.currentPlaybook.id);
            console.log('Play saved', this.currentPlay);
        } catch (err) {
            console.error('Error saving play:', err);
        }
    }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    console.log('App initialized and assigned to window.app');
});
