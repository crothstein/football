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

            // Check for template_id in URL FIRST (before auth check)
            const urlParams = new URLSearchParams(window.location.search);
            const templateId = urlParams.get('template_id');

            // Check Auth
            const session = await this.auth.getSession();
            if (!session) {
                console.log('No session, switching to auth view');

                // If there's a template_id, store it for after login/signup
                if (templateId) {
                    console.log('Storing pending template:', templateId);
                    localStorage.setItem('pending_template_id', templateId);
                    // Show signup form with context
                    this.switchView('auth');
                    this.toggleAuthForms('signup');
                    this.ui.showSnackbar('Sign up to customize this play!');
                } else {
                    this.switchView('auth');
                    // Check specific auth mode from URL (e.g. ?mode=signup)
                    if (urlParams.get('mode') === 'signup') {
                        this.toggleAuthForms('signup');
                    }
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

        // Check for pending template from localStorage (stored before auth)
        let templateId = localStorage.getItem('pending_template_id');
        if (templateId) {
            localStorage.removeItem('pending_template_id'); // Clear it
            console.log('Processing pending template from localStorage:', templateId);
        } else {
            // Check for template_id in URL as fallback
            const urlParams = new URLSearchParams(window.location.search);
            templateId = urlParams.get('template_id');
        }

        if (templateId) {
            console.log('Loading template:', templateId);
            await this.handleTemplateFlow(templateId);
            this.initEventListeners();
            return;
        }

        // Normal flow: check playbooks and route
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

    async handleTemplateFlow(templateId) {
        try {
            // 1. Fetch template play with team size
            const templatePlay = await this.store.getPublicPlayWithTeamSize(templateId);

            if (!templatePlay) {
                console.error('Template not found:', templateId);
                this.ui.showSnackbar('Template not found');
                // Fall back to normal flow
                const playbooks = await this.store.getPlaybooks();
                if (playbooks.length > 0) {
                    await this.openPlaybook(playbooks[0].id);
                } else {
                    this.switchView('create');
                }
                return;
            }

            const teamSize = templatePlay.teamSize || '5v5';
            console.log('Template team size:', teamSize);

            // 2. Get user's playbooks
            let playbooks = await this.store.getPlaybooks();

            // 3. Find matching playbook by team size (already sorted by updated_at desc)
            let targetPlaybook = playbooks.find(pb => pb.teamSize === teamSize && pb.isOwner !== false);

            // 4. Create playbook if none matches
            if (!targetPlaybook) {
                console.log('No matching playbook found, creating new one for', teamSize);
                targetPlaybook = await this.store.savePlaybook({
                    name: `${teamSize} Playbook`,
                    teamSize: teamSize
                });
                this.ui.showSnackbar(`Created "${teamSize} Playbook" for your template!`);
            }

            // 5. Save template as new play in the target playbook
            const newPlay = {
                name: templatePlay.name,
                formation: templatePlay.formation || 'Custom',
                players: templatePlay.players || [],
                routes: templatePlay.routes || [],
                icons: templatePlay.icons || []
            };

            const savedPlay = await this.store.savePlay(targetPlaybook.id, newPlay);
            console.log('Template saved as new play:', savedPlay.id);

            // 6. Open the playbook and the new play
            await this.openPlaybook(targetPlaybook.id);
            this.openPlay(savedPlay.id);

            this.ui.showSnackbar(`"${savedPlay.name}" added to your playbook!`);

            // Clean up URL to remove template_id parameter
            const url = new URL(window.location);
            url.searchParams.delete('template_id');
            window.history.replaceState({}, '', url);

        } catch (err) {
            console.error('Error in handleTemplateFlow:', err);
            this.ui.showSnackbar('Error loading template: ' + err.message);
            // Fall back to normal flow
            const playbooks = await this.store.getPlaybooks();
            if (playbooks.length > 0) {
                await this.openPlaybook(playbooks[0].id);
            } else {
                this.switchView('create');
            }
        }
    }

    async checkUnsavedChanges() {
        if (!this.editor.isLocked) {
            return await this.ui.showConfirmDialog(
                'Unsaved Changes',
                'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.',
                'Leave',
                'btn-danger-block'
            );
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
                    // Store email for resend functionality
                    this.pendingConfirmationEmail = email;
                    // Show confirmation pending view
                    document.getElementById('confirm-email-display').textContent = email;
                    this.toggleAuthForms('confirm');
                } catch (error) {
                    // Supabase often returns "Database error saving new user" even when
                    // the user was created (due to trigger issues). Show confirmation
                    // page anyway since the user usually exists.
                    if (error.message && error.message.includes('Database error saving new user')) {
                        console.warn('Signup returned database error, but user may have been created:', error.message);
                        this.pendingConfirmationEmail = email;
                        document.getElementById('confirm-email-display').textContent = email;
                        this.toggleAuthForms('confirm');
                    } else {
                        alert('Signup failed: ' + error.message);
                    }
                }
            });
        }

        // Resend confirmation email
        const btnResend = document.getElementById('btn-resend-confirmation');
        if (btnResend) {
            btnResend.addEventListener('click', async () => {
                if (!this.pendingConfirmationEmail) return;

                btnResend.disabled = true;
                btnResend.textContent = 'Sending...';

                try {
                    await this.auth.resendConfirmation(this.pendingConfirmationEmail);
                    btnResend.textContent = 'Email Sent!';
                    btnResend.classList.add('btn-resend-success');

                    // Reset button after 3 seconds
                    setTimeout(() => {
                        btnResend.textContent = 'Resend Confirmation Email';
                        btnResend.classList.remove('btn-resend-success');
                        btnResend.disabled = false;
                    }, 3000);
                } catch (error) {
                    btnResend.textContent = 'Resend Confirmation Email';
                    btnResend.disabled = false;
                    alert('Failed to resend email: ' + error.message);
                }
            });
        }

        // Back to login from confirmation view
        const linkConfirmToLogin = document.getElementById('link-confirm-to-login');
        if (linkConfirmToLogin) {
            linkConfirmToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAuthForms('login');
            });
        }

        this.bindEvents();
    }

    // Toggle between Login, Signup, and Confirmation forms
    toggleAuthForms(mode) {
        const loginForm = document.getElementById('form-login');
        const signupForm = document.getElementById('form-signup');
        const confirmForm = document.getElementById('form-confirm-email');

        // Hide all forms first
        loginForm.classList.add('hidden');
        signupForm.classList.add('hidden');
        if (confirmForm) confirmForm.classList.add('hidden');

        // Show the requested form
        if (mode === 'signup') {
            signupForm.classList.remove('hidden');
        } else if (mode === 'confirm') {
            if (confirmForm) confirmForm.classList.remove('hidden');
        } else {
            loginForm.classList.remove('hidden');
        }
    }

    bindEvents() {
        // Prevent duplicate initialization
        if (this._eventsInitialized) {
            console.log('bindEvents: already initialized, skipping');
            return;
        }
        this._eventsInitialized = true;
        console.log('bindEvents: initializing event listeners');

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

        if (switchBtn && dropdown && !this._dropdownInitialized) {
            this._dropdownInitialized = true; // Prevent duplicate initialization

            switchBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent closing immediately
                const isHidden = dropdown.classList.contains('hidden');

                if (isHidden) {
                    // Render items FIRST, then show dropdown
                    console.log('Dropdown: rendering items before showing...');
                    await this.ui.renderPlaybookDropdownItems();
                    dropdown.classList.remove('hidden');
                    console.log('Dropdown: shown');
                } else {
                    dropdown.classList.add('hidden');
                    console.log('Dropdown: hidden');
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
            headerNewPlay.addEventListener('click', async () => {
                if (await this.checkUnsavedChanges()) this.handleNewPlay();
            });
        }

        const backBtn = document.getElementById('back-to-book');
        if (backBtn) {
            backBtn.addEventListener('click', async () => {
                if (!await this.checkUnsavedChanges()) return;

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

        // Delete Play Logic - Show custom confirm modal instead of native confirm
        if (deletePlayBtn) {
            deletePlayBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                if (!this.currentPlay) return;

                // Show custom confirmation modal
                const confirmModal = document.getElementById('modal-confirm');
                const confirmTitle = document.getElementById('confirm-title');
                const confirmMessage = document.getElementById('confirm-message');
                const confirmOk = document.getElementById('confirm-ok');
                const confirmCancel = document.getElementById('confirm-cancel');

                if (confirmModal && confirmTitle && confirmMessage) {
                    confirmTitle.textContent = 'Delete Play?';
                    confirmMessage.textContent = `Are you sure you want to delete "${this.currentPlay.name || 'this play'}"? This action cannot be undone.`;
                    confirmModal.classList.remove('hidden');

                    // One-time handler for OK button
                    const handleConfirm = async () => {
                        confirmModal.classList.add('hidden');
                        confirmOk.removeEventListener('click', handleConfirm);
                        confirmCancel.removeEventListener('click', handleCancel);

                        try {
                            await this.store.deletePlay(this.currentPlay.id);

                            // Update Local State: Remove play from currentPlaybook
                            if (this.currentPlaybook && this.currentPlaybook.plays) {
                                this.currentPlaybook.plays = this.currentPlaybook.plays.filter(p => p.id !== this.currentPlay.id);
                            }

                            // Close the play settings modal if it's open
                            const playSettingsModal = document.getElementById('modal-play-settings');
                            if (playSettingsModal && !playSettingsModal.classList.contains('hidden')) {
                                playSettingsModal.classList.add('hidden');
                            }

                            // Force navigation back without checking unsaved changes (since deleted)
                            this.hasUnsavedChanges = false;
                            this.editor.setLocked(true); // Reset state
                            document.getElementById('back-to-book').click();
                        } catch (err) {
                            alert('Error deleting play: ' + err.message);
                        }
                    };

                    // One-time handler for Cancel button
                    const handleCancel = () => {
                        confirmModal.classList.add('hidden');
                        confirmOk.removeEventListener('click', handleConfirm);
                        confirmCancel.removeEventListener('click', handleCancel);
                    };

                    confirmOk.addEventListener('click', handleConfirm);
                    confirmCancel.addEventListener('click', handleCancel);
                }
            });
        }

        const copyPlayBtn = document.getElementById('btn-copy-play');
        if (copyPlayBtn) {
            copyPlayBtn.addEventListener('click', async () => {
                if (!this.currentPlay || !this.currentPlaybook) return;

                if (await this.checkUnsavedChanges()) {
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

        // Print button handler is in ui.js - removed duplicate here

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
                    // Don't show message, just reload to show auth page
                    window.location.reload();
                } catch (err) {
                    alert('Error logging out: ' + err.message);
                }
            });
        }

        // Mobile Controls
        const playbookTitleBtn = document.getElementById('playbook-title-btn');
        const mobileSettingsBtn = document.getElementById('mobile-settings-btn');
        const mobileUserBtn = document.getElementById('mobile-user-btn');
        const mobilePrintBtn = document.getElementById('mobile-print-btn');
        const mobileNewPlayBtn = document.getElementById('mobile-new-play-btn');

        // Playbook title selector - triggers dropdown
        if (playbookTitleBtn && dropdown) {
            playbookTitleBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const isHidden = dropdown.classList.contains('hidden');

                if (isHidden) {
                    await this.ui.renderPlaybookDropdownItems();
                    dropdown.classList.remove('hidden');
                } else {
                    dropdown.classList.add('hidden');
                }
            });
        }

        // Mobile settings button
        if (mobileSettingsBtn) {
            mobileSettingsBtn.addEventListener('click', () => {
                this.ui.openPlaybookSettings();
            });
        }

        // Mobile print button
        if (mobilePrintBtn) {
            mobilePrintBtn.addEventListener('click', () => {
                this.ui.openPrintModal();
            });
        }

        // Mobile new play button
        if (mobileNewPlayBtn) {
            mobileNewPlayBtn.addEventListener('click', async () => {
                if (await this.checkUnsavedChanges()) this.handleNewPlay();
            });
        }

        // Mobile user button - shows user menu
        if (mobileUserBtn && userMenu) {
            mobileUserBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userMenu.classList.toggle('hidden');
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

            // Update mobile playbook name
            const mobilePlaybookName = document.getElementById('mobile-playbook-name');
            if (mobilePlaybookName) mobilePlaybookName.textContent = this.currentPlaybook.name;
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

        // Lock editor to prevent unsaved changes warning
        this.editor.setLocked(true);

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
        this.currentPlay.icons = data.icons; // Save icons
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
            icons: JSON.parse(JSON.stringify(sourceData.icons || [])), // Deep copy icons
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
