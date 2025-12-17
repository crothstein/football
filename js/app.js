import { Editor } from './editor.js?v=15';
import { Store } from './store.js?v=15';
import { UI } from './ui.js?v=15';
import { getFormations } from './formations.js?v=15';
import { AuthManager } from './auth.js?v=15';

class App {
    constructor() {
        this.auth = new AuthManager();
        this.store = new Store();
        this.editor = new Editor('play-canvas');
        this.editor.setApp(this); // Inject app reference for saving
        this.ui = new UI(this.store, this); // Pass app reference to UI
        this.editor.setUI(this.ui); // Inject UI for snackbar access

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
                this.initEventListeners(); // Attach login/signup listeners

                // Check specific auth mode from URL (e.g. ?mode=signup)
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('mode') === 'signup') {
                    this.toggleAuthForms('signup');
                }

                this.initEventListeners(); // Attach login/signup listeners
                return;
            }

            // If authenticated, proceed
            console.log('Session found, initializing app');
            await this.initializeApp();
            console.log('App initialized successfully');
        } catch (err) {
            console.error('Initialization error:', err);
            alert('Failed to initialize app: ' + err.message);
            // Fallback to auth view just in case
            this.switchView('auth');
        }
    }

    async initializeApp() {
        console.log('initializeApp: start');
        const user = this.auth.getUser();
        let profile = null;
        if (user) {
            console.log('Fetching profile for', user.id);
            profile = await this.store.getProfile(user.id);
            console.log('Profile fetched');
        }

        // Update User Profile UI
        this.ui.updateUserProfile(user, profile);

        this.editor.init();

        // Check for template_id in URL
        const urlParams = new URLSearchParams(window.location.search);
        const templateId = urlParams.get('template_id');

        if (templateId) {
            console.log('Loading template:', templateId);
            try {
                const templatePlay = await this.store.getPublicPlay(templateId);

                if (templatePlay) {
                    // We have the play data. We want to open it as a "New Play" (unsaved) 
                    // or force the user to "Save As".
                    // Best flow: 
                    // 1. Ensure we have a playbook (create one if needed? or use first?)
                    // 2. Open Editor with this data but NO ID (so it saves as new).

                    // Handle Playbooks
                    let playbooks = await this.store.getPlaybooks();
                    if (playbooks.length === 0) {
                        // User has no playbooks, prompt create or switch view?
                        // For now, let's open overview/create view but MAYBE pre-fill editor?
                        // This is tricky. Let's just load it into the editor "Transient"ly if possible.
                        // But App structure expects `currentPlaybook`.
                        alert("Please create a playbook first to save this template.");
                        this.switchView('create');
                        return;
                    }

                    this.currentPlaybook = playbooks[0]; // Default to first
                    this.switchView('editor');

                    // Prepare "Copy" of play
                    const playCopy = {
                        ...templatePlay,
                        id: 'new_template_' + Date.now(),
                        name: templatePlay.name + ' (Copy)'
                    };

                    this.currentPlay = playCopy;
                    this.editor.setMode('play');
                    this.editor.loadData(playCopy);

                    // Update UI inputs
                    document.getElementById('play-name').value = playCopy.name;
                    this.editor.setLocked(false); // Let them edit immediately
                    this.ui.showSnackbar("Template loaded! Click Save to add it to your playbook.");

                    this.initEventListeners();
                    return; // parsing template overrides default load
                }
            } catch (err) {
                console.error("Error loading template:", err);
            }
        }

        // Helper to check playbooks and route
        console.log('Fetching playbooks...');
        const playbooks = await this.store.getPlaybooks();
        console.log('Playbooks fetched:', playbooks.length);

        if (playbooks.length > 0) {
            console.log('Opening first playbook:', playbooks[0].id);
            await this.openPlaybook(playbooks[0].id);
            console.log('Playbook opened');
        } else {
            console.log('No playbooks, switching to create view');
            this.switchView('create');
        }

        this.initEventListeners();
    }

    checkUnsavedChanges() {
        if (!this.editor.isLocked) {
            return confirm("You have unsaved changes. Are you sure you want to leave? Your changes will be lost.");
        }
        return true;
    }

    initEventListeners() {
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
                    console.error('Login error:', error);
                    let msg = error.message;
                    if (msg === 'Invalid login credentials') {
                        msg = 'Incorrect email or password. Please try again.';
                    }
                    alert(msg);
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

        this.bindEvents();
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



        // Header New Play button
        const headerNewPlay = document.getElementById('header-new-play-btn');
        if (headerNewPlay) {
            headerNewPlay.addEventListener('click', () => {
                if (this.checkUnsavedChanges()) this.handleNewPlay();
            });
        }

        const backBtn = document.getElementById('back-to-book');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (!this.checkUnsavedChanges()) return;

                const wasEditingDefault = this.isEditingDefaultFormation;
                const shouldReturn = this.returnToSettings; // Check flag

                this.switchView('overview');
                this.currentPlay = null;
                this.isEditingDefaultFormation = false; // Reset
                this.returnToSettings = false; // Reset

                // FORCE RESET EDITOR STATE
                this.editor.setLocked(true);
                this.editor.clear(); // Clear canvas

                // Reset Lock Button UI
                const toggleLockBtn = document.getElementById('toggle-lock-btn');
                const lockText = toggleLockBtn.querySelector('.lock-text');
                const deletePlayBtn = document.getElementById('btn-delete-play');

                if (toggleLockBtn) {
                    // if (lockIcon) lockIcon.textContent = '🔒'; // Reset icon
                    if (lockText) lockText.textContent = 'Edit';
                    toggleLockBtn.classList.remove('btn-warning');
                    toggleLockBtn.classList.add('btn-primary');
                }
                // if (deletePlayBtn) deletePlayBtn.style.display = 'none'; // Removed - container hides anyway

                this.ui.renderPlaybookOverview(this.currentPlaybook);

                // If we were editing default formation from settings workflow, reopen modal
                if (wasEditingDefault && shouldReturn) {
                    this.ui.openPlaybookSettings();
                }
            });
        }

        // Editor Actions (Save & Lock Logic)
        const toggleLockBtn = document.getElementById('toggle-lock-btn');
        const deletePlayBtn = document.getElementById('btn-delete-play');

        // Delete Play Logic
        if (deletePlayBtn) {
            deletePlayBtn.addEventListener('click', async () => {
                if (!this.currentPlay) return;

                const confirmDelete = confirm(`Are you sure you want to delete "${this.currentPlay.name || 'this play'}"? This action cannot be undone.`);
                if (!confirmDelete) return;

                try {
                    await this.store.deletePlay(this.currentPlay.id);

                    // Update Local State: Remove play from currentPlaybook
                    if (this.currentPlaybook && this.currentPlaybook.plays) {
                        this.currentPlaybook.plays = this.currentPlaybook.plays.filter(p => p.id !== this.currentPlay.id);
                    }

                    // Force navigation back without checking unsaved changes (since deleted)
                    this.hasUnsavedChanges = false;
                    this.editor.setLocked(true); // Reset state
                    document.getElementById('back-to-book').click();
                } catch (err) {
                    alert('Error deleting play: ' + err.message);
                }
            });
        }

        const copyPlayBtn = document.getElementById('btn-copy-play');
        if (copyPlayBtn) {
            copyPlayBtn.addEventListener('click', async () => {
                if (!this.currentPlay || !this.currentPlaybook) return;

                if (this.checkUnsavedChanges()) {
                    // Ensure current state is saved first? Or copy from editor?
                    // Safer to copy from editor data to capture unsaved tweaks
                    const data = this.editor.getData();
                    this.handleCopyPlay(data);
                }
            });
        }

        if (toggleLockBtn) {
            toggleLockBtn.addEventListener('click', () => {
                // const lockIcon = toggleLockBtn.querySelector('.lock-icon'); // Removed
                const lockText = toggleLockBtn.querySelector('.lock-text');

                if (this.editor.isLocked) {
                    // Unlock -> Edit Mode
                    this.editor.setLocked(false);
                    // if (lockIcon) lockIcon.textContent = '🔓'; // Removed
                    if (lockText) lockText.textContent = 'Save';

                    toggleLockBtn.classList.add('btn-warning');
                    toggleLockBtn.classList.remove('btn-primary'); // Was btn-icon-light

                    // Enable Layout Logic
                    document.body.classList.add('editing');
                    this.ui.showEditor();

                    // Delete Button is always visible now

                } else {
                    // Lock -> Save & ReadOnly Mode
                    if (this.isEditingDefaultFormation) {
                        this.saveDefaultFormation();
                        if (this.returnToSettings) {
                            // Back logic handles return
                            document.getElementById('back-to-book').click();
                            return;
                        }
                    } else {
                        this.saveCurrentPlay();
                    }
                    this.editor.setLocked(true);

                    // Disable Layout Logic
                    document.body.classList.remove('editing');
                    this.ui.hideSidebar();

                    // if (lockIcon) lockIcon.textContent = '🔒'; // Removed
                    if (lockText) lockText.textContent = 'Edit';

                    toggleLockBtn.classList.remove('btn-warning');
                    toggleLockBtn.classList.add('btn-primary'); // Was btn-icon-light
                    this.hasUnsavedChanges = false;

                    // Delete Button is always visible now
                }
            });
        }

        // Print Button (Move to Overview)
        const printBtn = document.getElementById('print-playbook-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }

        // Removed old 'print-play' editor button listener logic

        // Window Unload Protection
        window.onbeforeunload = (e) => {
            if (!this.editor.isLocked) { // Using lock status as proxy for "editing session"
                // Browsers usually ignore the custom message, but this triggers the dialog
                e.preventDefault();
                e.returnValue = '';
            }
        };

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
        console.log('Editing default formation');
        this.isEditingDefaultFormation = true; // State flag
        this.returnToSettings = true; // Flow flag: Return to settings modal on exit

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

        // Calculate next order index to append to end
        const currentPlays = this.currentPlaybook.plays || [];
        const maxOrder = currentPlays.reduce((max, p) => Math.max(max, p.order || 0), -1);

        // Create new play object
        const newPlay = {
            // id: Date.now().toString(), // Let DB or save handle ID
            name: 'New Play',
            formation: 'Custom',
            players: startingPlayers,
            routes: [],
            order: maxOrder + 1
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

        // Ensure Delete Button is visible
        const deletePlayBtn = document.getElementById('btn-delete-play');
        // if (deletePlayBtn) deletePlayBtn.style.display = 'inline-block'; // No longer needed in header

        // Load into editor
        this.editor.loadData(play);
        this.editor.setLocked(true); // Default to locked mode

        // Ensure not in editing layout
        document.body.classList.remove('editing');

        // Fix: Force Sidebar CLOSED until user explicitly interacts
        this.ui.hideSidebar();

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

    async handleCopyPlay(sourceData) {
        if (!this.currentPlaybook) return;

        // Calculate next order index
        const currentPlays = this.currentPlaybook.plays || [];
        const maxOrder = currentPlays.reduce((max, p) => Math.max(max, p.order || 0), -1);

        const newPlay = {
            name: (this.currentPlay.name || 'Untitled') + ' Copy',
            formation: this.currentPlay.formation || 'Custom',
            players: JSON.parse(JSON.stringify(sourceData.players)), // Deep copy
            routes: JSON.parse(JSON.stringify(sourceData.routes)),   // Deep copy
            order: maxOrder + 1
        };

        try {
            const savedPlay = await this.store.savePlay(this.currentPlaybook.id, newPlay);

            // Refresh local playbook
            this.currentPlaybook = await this.store.getPlaybook(this.currentPlaybook.id);

            // Switch to the new play
            this.openPlay(savedPlay.id);

            // Notify user
            this.ui.showSnackbar("Play copied to end of playbook");

            // Close settings modal if open
            if (this.ui.playSettingsModal) this.ui.hideModal(this.ui.playSettingsModal);

        } catch (err) {
            alert('Error copying play: ' + err.message);
        }
    }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    console.log('App initialized and assigned to window.app');
});
