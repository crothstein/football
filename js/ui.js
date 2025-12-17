import { getFormations } from './formations.js';
import { PrintModule } from './print.js';

export class UI {
    constructor(store, app) {
        this.store = store;
        this.app = app; // Reference to main app for callbacks

        // Element caching
        this.playbookListEl = document.getElementById('existing-playbooks-list');
        this.playsGridEl = document.getElementById('plays-grid');
        this.baseFormationSelect = document.getElementById('base-formation-select');
        this.teamSizeSelector = document.getElementById('team-size-selector');
        this.selectedTeamSizeInput = document.getElementById('selected-team-size');
        this.currentPlaybookNameEl = document.getElementById('current-playbook-name');

        // Playbook Settings Modal
        this.settingsModal = document.getElementById('view-playbook-settings');
        this.settingsPlaybookNameInput = document.getElementById('settings-playbook-name');
        this.settingsFormationPreview = document.getElementById('settings-formation-preview');
        this.settingsDefaultFormationTitle = document.getElementById('settings-default-formation-title');

        // Play Settings Modal (Play Name & Description)
        this.playSettingsModal = document.getElementById('modal-play-settings');
        this.playSettingsNameInput = document.getElementById('setting-play-name');
        this.playSettingsDescInput = document.getElementById('setting-play-desc');
        this.editorPlayNameInput = document.getElementById('play-name');

        // Print Module
        this.printModule = new PrintModule(store, this);
        this.printModal = document.getElementById('view-print-settings');
        this.printTabs = document.querySelectorAll('.print-tab');
        this.printOptionsSections = document.querySelectorAll('.print-options-section');
        this.printPlayCountDisplay = document.getElementById('print-play-count-display');

        // Header elements
        this.headerPlaybookName = document.getElementById('header-playbook-name');
        const btnPlayDetails = document.getElementById('btn-play-details');
        if (btnPlayDetails) {
            btnPlayDetails.addEventListener('click', () => {
                console.log('Open Play Settings Clicked', this.app.currentPlay);
                if (!this.app.currentPlay) return;
                // Populate modal
                this.playSettingsNameInput.value = this.app.currentPlay.name || '';
                this.playSettingsDescInput.value = this.app.currentPlay.description || '';
                this.showModal(this.playSettingsModal);
            });
        }
        this.headerNewPlayBtn = document.getElementById('header-new-play-btn');

        // User Profile Elements
        this.userAvatarEl = document.getElementById('user-avatar');
        this.userNameEl = document.getElementById('display-user-name');
        this.userEmailEl = document.getElementById('display-user-email');

        // Sidebar Elements
        this.sidebar = document.getElementById('editor-sidebar-right');
        this.sidebarCloseBtn = document.getElementById('close-property-sidebar');
        this.propPlayerPreview = document.getElementById('prop-player-preview'); // Circle
        this.propPlayerLabelInput = document.getElementById('prop-player-label'); // Input

        this.initEventListeners();
    }

    initEventListeners() {
        // Sidebar Close
        if (this.sidebarCloseBtn) {
            this.sidebarCloseBtn.addEventListener('click', () => {
                this.hideSidebar();
                // Also tell editor to deselect
                if (this.app.editor) this.app.editor.deselectPlayer();
            });
        }

        // Sidebar Actions
        const undoBtn = document.getElementById('undo-change');
        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                if (this.app.editor) this.app.editor.undoLastRoutePoint();
            });
        }

        const deleteBtn = document.getElementById('delete-element');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (this.app.editor) this.app.editor.deleteSelected();
            });
        }

        // Color Grid
        this.colorBtns = document.querySelectorAll('.color-btn-lg');
        this.colorBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const color = e.target.dataset.color;
                if (this.app.editor) this.app.editor.updateElementColor(color);

                // Update local UI state
                this.colorBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Player Label Input
        if (this.propPlayerLabelInput) {
            this.propPlayerLabelInput.addEventListener('input', (e) => {
                const val = e.target.value.substring(0, 2).toUpperCase();
                if (e.target.value !== val) e.target.value = val; // Enforce limit in UI
                if (this.app.editor) this.app.editor.updatePlayerLabel(val);
            });
        }

        // Make Primary Button
        const makePrimaryBtn = document.getElementById('make-primary-btn');
        if (makePrimaryBtn) {
            makePrimaryBtn.addEventListener('click', () => {
                if (this.app.editor && this.app.editor.selectedPlayer) {
                    this.app.editor.setPrimaryPlayer(this.app.editor.selectedPlayer.id);
                }
            });
        }

        // Close Sidebar Button
        const closeSidebarBtn = document.getElementById('close-sidebar');
        if (closeSidebarBtn) {
            closeSidebarBtn.addEventListener('click', () => this.hideSidebar());
        }

        // Route Style Listeners removed (handled dynamically in updateSidebar)

        // Route End (Arrow/Circle)
        const endBtns = document.querySelectorAll('.segment-btn[data-end]');
        endBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                endBtns.forEach(b => b.classList.remove('active'));
                const target = e.target.closest('.segment-btn');
                target.classList.add('active');

                const type = target.dataset.end;
                if (this.app.editor) this.app.editor.updateRouteEndType(type);
            });
        });

        // Route Cuts (Hard/Rounded)
        const cutBtns = document.querySelectorAll('.segment-btn[data-cut]');
        cutBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.closest('.segment-btn');
                if (!target) return;

                // Visual update
                cutBtns.forEach(b => b.classList.remove('active'));
                target.classList.add('active');

                const type = target.dataset.cut;
                if (this.app.editor) this.app.editor.updateRouteCutType(type);
            });
        });

        // ... Existing Listeners ...
        // Team Size Change (Delegation)
        if (this.teamSizeSelector) {
            this.teamSizeSelector.addEventListener('click', (e) => {
                const btn = e.target.closest('.size-btn');
                if (!btn) return;

                console.log('Team size button clicked:', btn.dataset.value); // Debug log
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

        // Playbook Settings
        const settingsBtn = document.getElementById('playbook-settings-btn');
        if (settingsBtn) {
            settingsBtn.onclick = () => this.openPlaybookSettings();
        }

        const closeSettingsBtn = document.getElementById('close-settings-modal');
        if (closeSettingsBtn) {
            closeSettingsBtn.onclick = () => this.closePlaybookSettings();
        }

        const closeSettingsBtnFooter = document.getElementById('close-settings-btn');
        if (closeSettingsBtnFooter) closeSettingsBtnFooter.onclick = () => this.closePlaybookSettings();

        const saveSettingsBtn = document.getElementById('save-settings-btn');
        if (saveSettingsBtn) saveSettingsBtn.onclick = () => this.savePlaybookSettings();

        // Removed duplicate/old saveSettingsBtn check

        const cancelSettingsBtn = document.getElementById('cancel-settings');
        if (cancelSettingsBtn) {
            cancelSettingsBtn.onclick = () => this.closePlaybookSettings();
        }

        const deletePlaybookBtn = document.getElementById('btn-delete-playbook');
        if (deletePlaybookBtn) {
            deletePlaybookBtn.onclick = () => this.deletePlaybookHandler();
        }

        // Play Settings Events
        const btnSavePlaySettings = document.getElementById('save-play-settings');
        if (btnSavePlaySettings) {
            btnSavePlaySettings.onclick = () => this.savePlaySettings();
        }

        const btnClosePlaySettings = document.getElementById('close-play-settings');
        if (btnClosePlaySettings) {
            btnClosePlaySettings.onclick = () => this.hideModal(this.playSettingsModal);
        }

        // Print Modal Events
        const printBtn = document.getElementById('print-playbook-btn');
        if (printBtn) {
            printBtn.onclick = () => this.openPrintModal();
        }

        const closePrintBtn = document.getElementById('close-print-modal');
        if (closePrintBtn) closePrintBtn.onclick = () => this.hideModal(this.printModal);

        const cancelPrintBtn = document.getElementById('cancel-print-btn');
        if (cancelPrintBtn) cancelPrintBtn.onclick = () => this.hideModal(this.printModal);

        const confirmPrintBtn = document.getElementById('confirm-print-btn');
        if (confirmPrintBtn) confirmPrintBtn.onclick = () => this.handlePrintConfirm();

        // Print Tabs
        this.printTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const target = e.target.dataset.tab;

                // Active Tab - use dark colors for light modal background
                this.printTabs.forEach(t => {
                    t.classList.remove('active');
                    t.style.borderBottomColor = 'transparent';
                    t.style.color = 'var(--text-muted)'; // Gray text for inactive
                });
                e.target.classList.add('active');
                e.target.style.borderBottomColor = '#3b82f6';
                e.target.style.color = 'var(--text-main)'; // Dark text for active

                // Show Section
                this.printOptionsSections.forEach(sec => sec.classList.add('hidden'));
                document.getElementById(`print-options-${target}`).classList.remove('hidden');
            });
        });


        // Print Option Buttons (Segmented Controls inside print modal)
        const printSegBtns = document.querySelectorAll('.print-options-section .segment-btn');
        printSegBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const parent = btn.closest('.segmented-control') ||
                    btn.closest('.grid-size-selector') ||
                    btn.closest('.wristband-width-selector') ||
                    btn.closest('.wristband-height-selector');
                if (parent) {
                    parent.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                }
            });
        });
    }

    async renderCreatePlaybookView() {
        // Render existing playbooks list (hidden but preserved or used for "Cancel")
        const playbooks = await this.store.getPlaybooks();
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

    async renderPlaybookDropdownItems() {
        const listEl = document.getElementById('dropdown-playbook-list');
        if (!listEl) return;

        const playbooks = await this.store.getPlaybooks();
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
            this.playsGridEl.innerHTML = '<div class="text-center text-muted" style="grid-column: 1/-1;">No plays yet. Click "New Play" to create one.</div>';
        } else {
            plays.forEach((play, index) => {
                const card = document.createElement('div');
                card.className = 'play-card';
                card.draggable = true; // Enable drag
                card.dataset.id = play.id;

                card.innerHTML = `
                <div class="play-card-preview"></div>
                <div class="play-card-info">
                    <div class="play-name">
                        <span class="play-number">${index + 1}.</span> 
                        ${play.name || 'Untitled Play'}
                    </div>
                    <!-- Removed formation/custom text as requested -->
                </div>
            `;

                // Inject SVG
                const previewContainer = card.querySelector('.play-card-preview');
                const svgToCheck = this.createPlayPreviewSVG(play);
                previewContainer.appendChild(svgToCheck);

                // Click to Open
                card.onclick = (e) => {
                    // Prevent open if dragging was the main action (simple check)
                    this.app.openPlay(play.id);
                };

                // ---- Drag and Drop Events ----
                card.addEventListener('dragstart', (e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    // Store ID to identify dragged item
                    e.dataTransfer.setData('text/plain', play.id);
                    card.classList.add('dragging');
                });

                card.addEventListener('dragend', (e) => {
                    card.classList.remove('dragging');
                    // Clean up any drag-over styles
                    this.playsGridEl.querySelectorAll('.play-card').forEach(c => c.classList.remove('drag-over'));
                });

                // Add drop target events to the card itself if sorting *between* items
                card.addEventListener('dragenter', (e) => {
                    e.preventDefault();
                    if (card !== document.querySelector('.dragging')) {
                        card.classList.add('drag-over');
                    }
                });

                card.addEventListener('dragleave', (e) => {
                    card.classList.remove('drag-over');
                });

                card.addEventListener('dragover', (e) => {
                    e.preventDefault(); // Necessary to allow dropping
                    e.dataTransfer.dropEffect = 'move';
                });

                card.addEventListener('drop', async (e) => {
                    e.preventDefault();
                    card.classList.remove('drag-over');

                    const draggedId = e.dataTransfer.getData('text/plain');
                    const targetId = play.id;

                    if (draggedId === targetId) return;

                    // Reorder logic:
                    // We need to move the dragged item to be *before* the target item in the list
                    // Find indices in the current stored plays array
                    const currentPlays = this.app.currentPlaybook.plays;
                    const draggedIndex = currentPlays.findIndex(p => p.id === draggedId);
                    const targetIndex = currentPlays.findIndex(p => p.id === targetId);

                    if (draggedIndex < 0 || targetIndex < 0) return;

                    // Remove dragged item
                    const [draggedItem] = currentPlays.splice(draggedIndex, 1);
                    // Insert at new position
                    currentPlays.splice(targetIndex, 0, draggedItem);

                    // Re-render UI immediately to show new order
                    this.renderPlaybookOverview(this.app.currentPlaybook);

                    // Save new order to DB
                    const orderedIds = currentPlays.map(p => p.id);
                    try {
                        await this.store.savePlayOrder(this.app.currentPlaybook.id, orderedIds);
                    } catch (err) {
                        console.error('Failed to save order:', err);
                        // Optional: Revert UI or alert user
                    }
                });

                this.playsGridEl.appendChild(card);
            });
        }
    }

    refreshPlayList(playbook) {
        // Re-render only the play list part
        this.renderPlaybookOverview(playbook);
    }

    renderUserProfile(user) {
        const avatarEl = document.getElementById('user-avatar');
        const nameEl = document.getElementById('display-user-name');
        const emailEl = document.getElementById('display-user-email');

        if (!user) return;

        const email = user.email || 'coach@team.com';
        // Supabase user metadata might contain full_name if we asked for it, otherwise fallback
        const name = user.user_metadata?.full_name || 'Coach';

        // Initials
        const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        if (avatarEl) avatarEl.textContent = initials;
        if (nameEl) nameEl.textContent = name;
        if (emailEl) emailEl.textContent = email;
    }

    // --- Playbook Settings Modal Methods ---

    async openPlaybookSettings() {
        if (!this.app.currentPlaybook) return;

        const playbook = this.app.currentPlaybook;
        this.settingsPlaybookNameInput.value = playbook.name;

        // Check for Admin Rights
        const user = await this.store.getCurrentUser();
        const adminContainer = document.getElementById('admin-options-container');
        const publicCheckbox = document.getElementById('settings-is-public');

        if (user && user.email === 'chris.rothstein@gmail.com') {
            adminContainer.style.display = 'block';
            publicCheckbox.checked = playbook.isPublic || false;
        } else {
            adminContainer.style.display = 'none';
        }

        // Show modal
        this.settingsModal.classList.remove('hidden');

        // Render formation preview
        // Assuming we rely on the logic that "default formation" is just the first one of the team size
        // or if we have a saved default property. The task says "Default Formation: [Name]"
        // For now, let's assume standard default is index 0 of the size.
        // If we store default formation index, use it. usage: playbook.defaultFormationIndex (mock property)

        // Check if teamSize is "5" or "5v5" and format accordingly
        const rawSize = playbook.teamSize || '5';
        const teamSizeKey = rawSize.includes('v') ? rawSize : `${rawSize}v${rawSize}`;
        const formations = getFormations(teamSizeKey);
        // Default to first one if not specified
        const formationIndex = playbook.defaultFormationIndex || 0;

        let formation;
        if (playbook.defaultFormation && playbook.defaultFormation.length > 0) {
            // Use saved custom formation
            formation = {
                name: 'Custom Default',
                players: playbook.defaultFormation
            };
        } else {
            // Fallback to static template
            formation = formations[formationIndex] || formations[0];
        }

        if (formation) {
            this.settingsDefaultFormationTitle.textContent = `Default Formation`;
            this.renderSettingsFormationPreview(formation);
            // Click to edit
            const previewEl = this.settingsFormationPreview.querySelector('.preview-field-green');
            if (previewEl) {
                previewEl.onclick = () => {
                    // Redirect to "Edit Formation" -> likely creating a new play with this formation
                    // or the formation editor if that's a distinct view.
                    // Task says: "If clicked that it would go to the formation editor that already exists."
                    // So we simulate clicking "nav-edit-formation" or call usage:
                    this.closePlaybookSettings();
                    this.app.handleEditDefaultFormation(); // Need to ensure this exists or simulate button click
                };
            }
        }
    }

    closePlaybookSettings() {
        this.settingsModal.classList.add('hidden');
    }

    async savePlaybookSettings() {
        if (!this.app.currentPlaybook) return;

        const newName = this.settingsPlaybookNameInput.value.trim();
        if (!newName) {
            alert('Please enter a playbook name');
            return;
        }

        const playbook = this.app.currentPlaybook;
        playbook.name = newName;

        // Save Admin Options
        const user = await this.store.getCurrentUser();
        if (user && user.email === 'chris.rothstein@gmail.com') {
            const publicCheckbox = document.getElementById('settings-is-public');
            playbook.isPublic = publicCheckbox.checked;
        }

        try {
            // Optimistic update
            this.currentPlaybookNameEl.textContent = newName;
            this.headerPlaybookName.textContent = newName;

            await this.store.savePlaybook(playbook);
            this.closePlaybookSettings();
            // Refresh dropdown list
            this.renderPlaybookDropdownItems();
        } catch (err) {
            console.error(err);
            alert('Failed to save settings');
        }
    }

    async deletePlaybookHandler() {
        if (!this.app.currentPlaybook) return;

        if (confirm(`Are you sure you want to delete "${this.app.currentPlaybook.name}"? This action cannot be undone.`)) {
            try {
                const id = this.app.currentPlaybook.id;
                await this.store.deletePlaybook(id);

                // Switch to another playbook or clear state
                // Ideally app.js handles this "post-delete" flow
                this.closePlaybookSettings();
                location.reload(); // Simplest way to reset state for now
            } catch (err) {
                console.error(err);
                alert('Failed to delete playbook');
            }
        }
    }

    // --- Rendering Helpers ---

    drawFieldOnSVG(svg) {
        const svgNS = "http://www.w3.org/2000/svg";

        // Background
        const rect = document.createElementNS(svgNS, "rect");
        rect.setAttribute("width", "1000");
        rect.setAttribute("height", "700");
        rect.setAttribute("fill", "#ffffff");
        svg.appendChild(rect);

        // Lines helper
        const createLine = (y, color, width) => {
            const line = document.createElementNS(svgNS, "line");
            line.setAttribute("x1", "0");
            line.setAttribute("y1", y);
            line.setAttribute("x2", "1000");
            line.setAttribute("y2", y);
            line.setAttribute("stroke", color);
            line.setAttribute("stroke-width", width);
            svg.appendChild(line);
        };

        // Center (LOS) - Dark Grey
        createLine(350, '#9ca3af', 4);

        // Lines Above
        createLine(230, '#e5e7eb', 2);
        createLine(110, '#e5e7eb', 2);

        // Lines Below
        createLine(470, '#e5e7eb', 2);
        createLine(590, '#e5e7eb', 2);
    }

    createPlayPreviewSVG(play) {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        // Use a moderate crop to reduce whitespace but not cut off content
        // Keep some margins: 50px on sides, 25px top/bottom
        svg.setAttribute("viewBox", "50 25 900 650");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

        // Create unique ID suffix for this SVG to avoid conflicts
        const uniqueId = `svg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Add marker definitions for print compatibility
        const defs = document.createElementNS(svgNS, "defs");

        // Define all marker colors we might need
        const colors = ['6366f1', 'ef4444', '22c55e', 'eab308', 'ec4899', '06b6d4', '1f2937',
            'f97316', '3b82f6', 'a855f7', '64748b', '000000'];

        colors.forEach(color => {
            // Arrow marker
            const arrowMarker = document.createElementNS(svgNS, "marker");
            arrowMarker.setAttribute("id", `arrowhead-${color}-${uniqueId}`);
            arrowMarker.setAttribute("markerWidth", "10");
            arrowMarker.setAttribute("markerHeight", "10");
            arrowMarker.setAttribute("refX", "5");
            arrowMarker.setAttribute("refY", "5");
            arrowMarker.setAttribute("orient", "auto");
            arrowMarker.setAttribute("markerUnits", "strokeWidth");

            const arrowPolygon = document.createElementNS(svgNS, "polygon");
            arrowPolygon.setAttribute("points", "0 0, 10 5, 0 10");
            arrowPolygon.setAttribute("fill", `#${color}`);
            arrowMarker.appendChild(arrowPolygon);
            defs.appendChild(arrowMarker);

            // Circle marker
            const circleMarker = document.createElementNS(svgNS, "marker");
            circleMarker.setAttribute("id", `circlehead-${color}-${uniqueId}`);
            circleMarker.setAttribute("markerWidth", "10");
            circleMarker.setAttribute("markerHeight", "10");
            circleMarker.setAttribute("refX", "5");
            circleMarker.setAttribute("refY", "5");
            circleMarker.setAttribute("orient", "auto");
            circleMarker.setAttribute("markerUnits", "strokeWidth");

            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", "5");
            circle.setAttribute("cy", "5");
            circle.setAttribute("r", "4");
            circle.setAttribute("fill", "#ffffff");
            circle.setAttribute("stroke", `#${color}`);
            circle.setAttribute("stroke-width", "2");
            circleMarker.appendChild(circle);
            defs.appendChild(circleMarker);
        });

        svg.appendChild(defs);

        this.drawFieldOnSVG(svg);

        // Render Routes
        if (play.routes) { // routes array or reconstructed logic needed?
            // Existing structure: play.routes is likely just array of point-arrays or linked to players?
            // In App.saveCurrentPlay, we store players (with routes embedded? or separate?)
            // Editor.getData returns { players, routes: [] } but players have `route` property (array of points).

            // Let's iterate players to find routes
            const players = play.players || [];
            players.forEach(p => {
                if (p.route && p.route.length > 0) {
                    const polyline = document.createElementNS(svgNS, "polyline");
                    // Construct points string
                    let pointsStr = `${p.x},${p.y}`; // Start at player
                    p.route.forEach(pt => pointsStr += ` ${pt.x},${pt.y}`);

                    polyline.setAttribute("points", pointsStr);
                    polyline.setAttribute("fill", "none");
                    polyline.setAttribute("stroke", p.color || '#1f2937');
                    polyline.setAttribute("stroke-width", "3"); // Match build script for consistent arrow size

                    // Markers: Use unique IDs for this SVG
                    const colorHex = (p.color || '#1f2937').replace('#', '');
                    const endType = p.routeEndType || 'arrow';

                    if (endType === 'circle') {
                        polyline.setAttribute("marker-end", `url(#circlehead-${colorHex}-${uniqueId})`);
                    } else {
                        polyline.setAttribute("marker-end", `url(#arrowhead-${colorHex}-${uniqueId})`);
                    }

                    svg.appendChild(polyline);
                }
            });
        }

        // Render Players
        if (play.players) {
            play.players.forEach(p => {
                const circle = document.createElementNS(svgNS, "circle");
                circle.setAttribute("cx", p.x);
                circle.setAttribute("cy", p.y);
                circle.setAttribute("r", "20");
                circle.setAttribute("fill", p.color || '#3b82f6');
                circle.setAttribute("stroke", "white");
                circle.setAttribute("stroke-width", "2");
                svg.appendChild(circle);

                // Simplified Label (maybe too small for card preview? Keep standard size 14)
                const text = document.createElementNS(svgNS, "text");
                text.setAttribute("x", p.x);
                text.setAttribute("y", p.y);
                text.setAttribute("dy", "0.35em");
                text.setAttribute("text-anchor", "middle");
                text.setAttribute("fill", "white");
                text.setAttribute("font-size", "14px");
                text.setAttribute("font-family", "Inter, sans-serif");
                text.setAttribute("font-weight", "600");
                text.textContent = p.label || '';
                svg.appendChild(text);
            });
        }

        return svg;
    }

    renderSettingsFormationPreview(formation) {
        const container = this.settingsFormationPreview.querySelector('.preview-field-green');
        if (!container) return;

        // Use SVG for precise aspect ratio scaling
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 1000 700");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet"); // Scale down to fit, maintain ratio
        svg.style.cursor = 'pointer';

        // Draw Field
        this.drawFieldOnSVG(svg);

        // Draw Players
        formation.players.forEach(p => {
            // Circle
            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", p.x);
            circle.setAttribute("cy", p.y);
            circle.setAttribute("r", "20");

            circle.setAttribute("fill", p.color || '#3b82f6'); // Use p.color directly or default
            circle.setAttribute("stroke", "white");
            circle.setAttribute("stroke-width", "2");

            // Text Label
            const text = document.createElementNS(svgNS, "text");
            text.setAttribute("x", p.x);
            text.setAttribute("y", p.y);
            text.setAttribute("dy", "0.35em");
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("fill", "white");
            text.setAttribute("font-size", "14px");
            text.setAttribute("font-family", "Inter, sans-serif");
            text.setAttribute("font-weight", "600");
            text.textContent = p.label || '';

            svg.appendChild(circle);
            svg.appendChild(text);
        });

        // Re-inject edit overlay
        container.innerHTML = '';
        container.appendChild(svg);

        const overlay = document.createElement('div');
        overlay.className = 'edit-overlay';
        overlay.innerHTML = `
            <span class="edit-icon">✎</span>
            <span>Edit Formation</span>
        `;
        container.appendChild(overlay);
    }
    showSnackbar(message, duration = 3000) {
        const snackbar = document.getElementById('snackbar');
        if (!snackbar) return;

        snackbar.textContent = message;
        snackbar.classList.remove('hidden');
        snackbar.classList.add('show');

        setTimeout(() => {
            snackbar.classList.remove('show');
            snackbar.classList.add('hidden');
        }, duration);
    }
    updateUserProfile(user, profile) {
        if (!user) return;

        // Use profile name if available, fallback to metadata, then default
        const name = profile?.full_name || user.user_metadata?.full_name || 'Coach';
        const email = user.email || '';

        // Update Text
        if (this.userNameEl) this.userNameEl.textContent = name;
        if (this.userEmailEl) this.userEmailEl.textContent = email;

        // Update Avatar
        if (this.userAvatarEl) {
            // If image URL exists
            // const avatarUrl = user.user_metadata?.avatar_url;
            // if (avatarUrl) { ... } else { ... }

            // Using Initials
            const initials = name
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase() || 'HC';

            this.userAvatarEl.textContent = initials;
        }
    }

    updateSidebar(player) {
        if (!this.sidebar) return;

        // OPEN SIDEBAR (Fixes "doesn't even open" issue)
        this.sidebar.classList.remove('hidden');

        this._restoreSidebarSections();

        // Show Content, Hide Empty (Missing logic restored)
        const emptyState = document.getElementById('sidebar-empty-state');
        const content = document.getElementById('sidebar-content');
        if (emptyState) emptyState.classList.add('hidden');
        if (content) content.classList.remove('hidden');

        // RE-QUERY ELEMENTS to ensure we have fresh references (fixes "blank sidebar" issue)
        const header = this.sidebar.querySelector('.sidebar-header h2');
        const preview = document.getElementById('prop-player-preview');
        const labelInput = document.getElementById('prop-player-label');
        const makePrimaryBtn = document.getElementById('make-primary-btn'); // FIX: ID was 'btn-make-primary' in js but 'make-primary-btn' in html
        const colorBtns = document.querySelectorAll('.color-btn-lg');
        const cutBtns = document.querySelectorAll('[data-cut]');
        const endBtns = document.querySelectorAll('[data-end]');
        const routeContainer = document.getElementById('route-segments-container');

        // Update Header
        if (header) header.textContent = 'EDIT PLAYER';

        // Update Preview Circle
        if (preview) {
            preview.textContent = player.label || '';
            const pColor = player.color || '#3b82f6';
            preview.style.backgroundColor = pColor; // Always filled
            preview.style.display = 'flex';
            preview.style.justifyContent = 'center';
            preview.style.alignItems = 'center';
            preview.style.color = '#fff';

            // Always apply a standard white border, regardless of primary status
            preview.style.border = '2px solid white';
        }

        // Update Label Input
        if (labelInput) {
            labelInput.value = player.label || '';
        }

        // Update Primary Button State
        if (makePrimaryBtn) {
            if (player.isPrimary) {
                makePrimaryBtn.classList.add('active');
                // FIX: Do NOT change InnerHTML to text, keep icon only.
                // If we want to indicate state, maybe change color (handled by CSS .active)
            } else {
                makePrimaryBtn.classList.remove('active');
            }
        }

        // Update Active Color Logic
        if (colorBtns) {
            colorBtns.forEach(btn => {
                const pColor = (player.color || '').toLowerCase();
                const bColor = (btn.dataset.color || '').toLowerCase();
                if (bColor === pColor) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        // Update Route Cuts
        if (cutBtns) {
            cutBtns.forEach(btn => {
                if (btn.dataset.cut === (player.routeCutType || 'hard')) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        // Update Route End
        if (endBtns) {
            const currentEnd = player.routeEndType || 'arrow';
            endBtns.forEach(btn => {
                // Remove active from all first (safer)
                btn.classList.remove('active');
                if (btn.dataset.end === currentEnd) {
                    btn.classList.add('active');
                }
            });
        }

        // Update Route Segments List
        if (routeContainer) {
            routeContainer.innerHTML = '';
            const numSegments = (player.route || []).length;
            const styles = player.routeStyles || [];

            if (numSegments > 0) {
                for (let i = 0; i < numSegments; i++) {
                    const style = styles[i] || 'solid';
                    const row = document.createElement('div');
                    row.style.marginBottom = '0.5rem';

                    const header = document.createElement('div');
                    header.textContent = `Segment ${i + 1}`;
                    header.style.fontSize = '0.8rem';
                    header.style.marginBottom = '0.2rem';
                    header.style.color = '#64748b';
                    row.appendChild(header);

                    const control = document.createElement('div');
                    control.className = 'segmented-control small';

                    // Simple logic to create buttons
                    const createBtn = (sVal, label, klass) => {
                        const btn = document.createElement('button');
                        btn.className = `segment-btn ${style === sVal ? 'active' : ''}`;
                        if (klass) {
                            btn.innerHTML = `<div class="${klass}"></div>`;
                        } else if (sVal === 'squiggly') {
                            // FIX: Restore SVG for Squiggly
                            btn.innerHTML = `
                            <svg width="24" height="12" viewBox="0 0 24 12" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M2 6c2.5-5 5-5 7.5 0s5 5 7.5 0 5-5 7.5 0" />
                            </svg>
                         `;
                        } else {
                            btn.textContent = label;
                        }
                        btn.onclick = () => {
                            this.app.editor.updateRouteStyle(i, sVal);
                            // Optimistic update
                            Array.from(control.children).forEach(c => c.classList.remove('active'));
                            btn.classList.add('active');
                        };
                        return btn;
                    };

                    control.appendChild(createBtn('solid', 'Solid', 'line-solid'));
                    control.appendChild(createBtn('dashed', 'Dashed', 'line-dashed'));
                    control.appendChild(createBtn('squiggly', 'Z', null));

                    row.appendChild(control);
                    routeContainer.appendChild(row);
                }
            } else {
                routeContainer.innerHTML = '<span style="color:#9ca3af; font-size:0.85rem; font-style:italic;">No route segments yet. Click field to add.</span>';
            }
        }
    }

    hideSidebar() {
        // When hiding sidebar (deselecting), we revert to empty state
        // but keep the sidebar itself visible if in edit mode (handled by CSS)

        if (this.sidebar) {
            this.sidebar.classList.add('hidden');
        }

        const emptyState = document.getElementById('sidebar-empty-state');
        const content = document.getElementById('sidebar-content');
        if (emptyState) emptyState.classList.remove('hidden');
        if (content) content.classList.add('hidden');
    }

    showEditor() {
        // Called when entering editor
        if (this.sidebar) {
            this.sidebar.classList.remove('hidden');
        }

        // Reset to empty state
        const emptyState = document.getElementById('sidebar-empty-state');
        const content = document.getElementById('sidebar-content');
        if (emptyState) emptyState.classList.remove('hidden');
        if (content) content.classList.add('hidden');

        // Ensure menu is visible if in editor
        this.showFloatingMenu();
    }

    savePlaySettings() {
        if (!this.app.currentPlay) return;

        const name = this.playSettingsNameInput.value.trim() || 'Untitled Play';
        const desc = this.playSettingsDescInput.value.trim();

        this.app.currentPlay.name = name;
        this.app.currentPlay.description = desc;

        // Update editor header input to match
        if (this.editorPlayNameInput) {
            this.editorPlayNameInput.value = name;
        }

        this.app.saveCurrentPlay();
        this.hideModal(this.playSettingsModal);
        this.showSnackbar("Play details saved");
    }

    showModal(modal) {
        if (modal) {
            modal.classList.remove('hidden');
            // Auto focus first input if available
            const input = modal.querySelector('input, textarea');
            if (input) input.focus();
        }
    }

    hideModal(modal) {
        if (modal) modal.classList.add('hidden');
    }

    showFloatingMenu() {
        let menu = document.getElementById('floating-icon-menu');
        if (!menu) {
            // Create it if missing
            const canvasWrapper = document.querySelector('.canvas-wrapper');
            if (canvasWrapper) {
                menu = document.createElement('div');
                menu.id = 'floating-icon-menu';
                menu.style.position = 'absolute';
                menu.style.bottom = '-60px'; // Outside canvas (below)
                menu.style.left = '50%';
                menu.style.transform = 'translateX(-50%)';
                menu.style.display = 'flex';
                menu.style.gap = '16px'; // More spacing
                menu.style.padding = '8px 16px';
                menu.style.background = 'white';
                menu.style.borderRadius = '20px';
                menu.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
                menu.style.zIndex = '100';

                // Helper to create buttons
                const createBtn = (type, img) => {
                    const btn = document.createElement('button');
                    // Display size in menu can be slightly larger for clickability
                    btn.innerHTML = `<img src="${img}" style="width:40px;height:40px; pointer-events:none;">`;
                    btn.title = `Add ${type === 'football' ? 'Football' : 'Fake Football'}`;
                    btn.className = 'btn-icon-light';
                    btn.style.border = 'none';
                    btn.style.background = 'transparent';
                    btn.style.cursor = 'grab';

                    // Drag from menu logic
                    btn.onmousedown = (e) => {
                        e.preventDefault(); // Prevent text selection/native drag
                        if (this.app.editor) this.app.editor.startDragNewIcon(type, e);
                    };

                    // Keep click just in case (optional, but requested drag-only mostly)
                    // If we only want drag, we skip click. 
                    // But maybe user just clicks? Let's support click = place in center too?
                    // "Rather than having it so you click it... could we make it so you can click and drag"
                    // implies REPLACING click-to-center with drag.
                    // But click-to-center is a good fallback. 
                    // However, simultaneous onclick and onmousedown can be tricky.
                    // Let's rely on mousedown -> editor handles "drag or click".

                    return btn;
                };

                menu.appendChild(createBtn('football', 'images/football.png'));
                menu.appendChild(createBtn('fake', 'images/fake_football.png'));

                canvasWrapper.appendChild(menu);
                // Ensure canvas-wrapper has relative positioning
                canvasWrapper.style.position = 'relative';
            }
        }
        if (menu) menu.classList.remove('hidden');
    }

    updateSidebarForIcon(type) {
        if (!this.sidebar) return;
        this.sidebar.classList.remove('hidden');

        const emptyState = document.getElementById('sidebar-empty-state');
        const content = document.getElementById('sidebar-content');
        if (emptyState) emptyState.classList.add('hidden');
        if (content) content.classList.remove('hidden');

        // Hide Player-Specific Sections
        // We need to identify sections. Best way is to iterate and hide all, then show what we need?
        // Or specific targeting.

        // Let's assume structure:
        // Header (Edit Player -> Edit Icon)
        // Player Profile (.player-profile-section) -> HIDE
        // Actions (.sidebar-section) -> SHOW
        // Colors/Routes (.sidebar-section) -> HIDE

        // Titles
        const headerTitle = this.sidebar.querySelector('.sidebar-header h3');
        if (headerTitle) headerTitle.textContent = type === 'football' ? 'Football' : 'Fake Football';

        // Player Profile
        const profile = this.sidebar.querySelector('.player-profile-section');
        if (profile) profile.style.display = 'none';

        // Hide other sections (Color, Route End, Route Cuts, Route Styles)
        // They are all .sidebar-section. The Actions one is also .sidebar-section but distinct?
        // Let's filter by content? Or add IDs in HTML?
        // HTML has: Actions (with Undo/Delete), Colors, Route End, Route Cuts, Route Styles.
        // It's brittle to guess order.

        const sections = this.sidebar.querySelectorAll('.sidebar-section');
        sections.forEach(sec => {
            // Check if it contains Delete button, if so Keep it.
            if (sec.querySelector('#delete-element')) {
                sec.style.display = 'block';
                // Hide Undo button inside if not needed? 
                // User only asked for "The only option should be to delete".
                const undo = sec.querySelector('#undo-change');
                if (undo) undo.style.display = 'none';
            } else {
                sec.style.display = 'none';
            }
        });
    }

    // Helper to restore sidebar state when switching back to player
    _restoreSidebarSections() {
        const headerTitle = this.sidebar.querySelector('.sidebar-header h3');
        if (headerTitle) headerTitle.textContent = 'Edit Player';

        const profile = this.sidebar.querySelector('.player-profile-section');
        // FIX: restoring to 'flex' because that was the original display, assuming it was hidden with 'none'.
        // Also ensure preview elements inside are visible/reset if needed.
        if (profile) profile.style.display = 'flex';

        // Restore Preview Circle Styles explicitly
        if (this.propPlayerPreview) {
            this.propPlayerPreview.style.border = ''; // Reset to default (stylesheet) or '2px solid white' if inline
            // If stylesheet handles it, empty string works. If inline was used, we need to know what it was.
            // Looking at CSS, .color-btn (if used) has border. 
            // But propPlayerPreview is likely custom.
            // Let's assume resetting to empty string removes the 'none' we might have added,
            // allowing CSS to take over.
            this.propPlayerPreview.style.display = '';
        }

        const sections = this.sidebar.querySelectorAll('.sidebar-section');
        sections.forEach(sec => {
            sec.style.display = 'block';
            const undo = sec.querySelector('#undo-change');
            if (undo) undo.style.display = 'inline-flex'; // or block/flex
        });
    }


    // --- Print Modal Methods ---

    openPrintModal() {
        if (!this.app.currentPlaybook) return;

        // Update Summary
        const plays = this.app.currentPlaybook.plays || [];
        if (this.printPlayCountDisplay) {
            this.printPlayCountDisplay.textContent = plays.length;
        }

        // Show Modal
        if (this.printModal) {
            this.printModal.classList.remove('hidden');
        }
    }


    handlePrintConfirm() {
        // Collect Options
        const activeTab = document.querySelector('.print-tab.active').dataset.tab;

        let options = {
            type: activeTab
        };

        if (activeTab === 'wristband') {
            const section = document.getElementById('print-options-wristband');
            // Plays count
            const playsBtn = section.querySelector('.segmented-control button.active');
            options.playsPerPage = playsBtn ? playsBtn.dataset.plays : 8;

            // Width and Height (separate selectors)
            const widthBtn = section.querySelector('.wristband-width-selector button.active');
            const heightBtn = section.querySelector('.wristband-height-selector button.active');
            options.width = widthBtn ? parseFloat(widthBtn.dataset.width) : 3;
            options.height = heightBtn ? parseFloat(heightBtn.dataset.height) : 2.25;

            // Copies
            const copiesInput = document.getElementById('print-wb-copies');
            options.copies = copiesInput ? copiesInput.value : 1;

        } else {
            const section = document.getElementById('print-options-playbook');
            // Plays count
            const playsBtn = section.querySelector('.segmented-control button.active');
            options.playsPerPage = playsBtn ? playsBtn.dataset.plays : 12;
            options.copies = 1;
        }

        // Close Modal
        this.hideModal(this.printModal);

        // Execute Print
        if (this.printModule) {
            this.printModule.generatePrintLayout(this.app.currentPlaybook, options);
        }
    }
}
