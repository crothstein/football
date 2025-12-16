export class Editor {
    constructor(canvasId) {
        this.svg = document.getElementById(canvasId);
        this.playersLayer = document.getElementById('players-layer');
        this.routesLayer = document.getElementById('routes-layer');

        this.isLocked = true;
        this.selectedPlayer = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };

        // UI References
        this.propertiesPanel = document.getElementById('properties-panel');
        // this.lockIndicator = document.getElementById('lock-indicator'); // Removed
        this.toggleLockBtn = document.getElementById('toggle-lock-btn');
        this.editorTools = document.getElementById('editor-tools'); // The bottom toolbar
        this.saveBtn = document.getElementById('save-play');

        // Bind methods
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleCanvasClick = this.handleCanvasClick.bind(this);

        this.ui = null; // Will be injected
        this.mode = 'play'; // 'play' | 'formation'
    }

    setUI(uiInstance) {
        this.ui = uiInstance;
    }

    setMode(mode) {
        this.mode = mode;
        // If switching to formation mode, maybe clear routes? 
        // For now, we just stop new ones.
        if (mode === 'formation') {
            // Optional: visual cue?
        }
    }

    init() {
        this.svg.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mouseup', this.handleMouseUp);
        this.svg.addEventListener('click', this.handleCanvasClick);

        this.bindPanelEvents();
        // this.bindLockEvent(); // Handled by App
        this.drawField();
    }

    drawField() {
        // Field Layer is usually the first child or search for ID
        const fieldGroup = document.getElementById('field-layer');
        if (!fieldGroup) return;

        // Clear existing lines if any (keep the rect)
        // actually, let's just re-create the inner content to be safe and clean
        fieldGroup.innerHTML = '';

        // 1. White Background
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '800');
        rect.setAttribute('height', '600');
        rect.setAttribute('fill', '#ffffff');
        fieldGroup.appendChild(rect);

        // 2. Lines
        // Center (LOS) - Dark Grey
        this.createLine(fieldGroup, 0, 300, 800, 300, '#9ca3af', 4);

        // Flanking Lines - Light Grey (e.g., 10 yards out? assuming 300 is center)
        // Let's place them at y=150 and y=450 for specific "zone" feel or standard distance
        // Mock shows good spacing. 600px height. 
        this.createLine(fieldGroup, 0, 150, 800, 150, '#e5e7eb', 2);
        this.createLine(fieldGroup, 0, 450, 800, 450, '#e5e7eb', 2);

        // Maybe two more? 0 and 600 are borders.
        // Let's stick to 3 lines for clean look as requested: "middle... two lighter gray lines below and above"
    }

    createLine(parent, x1, y1, x2, y2, color, width) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', width);
        parent.appendChild(line);
    }

    bindLockEvent() {
        if (this.toggleLockBtn) {
            this.toggleLockBtn.addEventListener('click', () => {
                this.setLocked(!this.isLocked);
            });
        }
    }

    bindPanelEvents() {
        document.getElementById('finish-edit-player').addEventListener('click', () => {
            this.deselectPlayer();
        });

        document.getElementById('undo-change').addEventListener('click', () => {
            if (this.selectedPlayer) {
                this.undoLastRoutePoint(this.selectedPlayer);
            }
        });

        document.getElementById('delete-element').addEventListener('click', () => {
            if (this.selectedPlayer && confirm('Delete this player?')) {
                this.deletePlayer(this.selectedPlayer.id);
                this.deselectPlayer();
            }
        });

        document.getElementById('delete-element').addEventListener('click', () => {
            if (this.selectedPlayer && confirm('Delete this player?')) {
                this.deletePlayer(this.selectedPlayer.id);
                this.deselectPlayer();
            }
        });

        const clearBtn = document.querySelector('#clear-play');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Clear entire play?')) {
                    this.clear();
                }
            });
        }
        // Color Buttons
        this.propertiesPanel.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const color = e.target.dataset.color;
                this.updateElementColor(color);
            });
        });
    }

    setLocked(locked) {
        this.isLocked = locked;
        // UI updates handled by App class now

        if (this.lockIndicator) {
            this.lockIndicator.textContent = locked ? 'Locked' : 'Editing';
            this.lockIndicator.className = locked ? 'badge' : 'badge badge-warning';
        }

        if (locked) {
            this.deselectPlayer();
            this.svg.style.cursor = 'default';
        } else {
            this.svg.style.cursor = 'crosshair';
        }
    }

    loadData(play) {
        this.clear();
        if (play.players) {
            play.players.forEach(p => {
                this.renderPlayer(p);
                if (p.route && p.route.length > 0) {
                    this.renderRoute(p);
                }
            });
        }
    }

    getData() {
        // Collect players from DOM to ensure positions are current
        const players = [];
        Array.from(this.playersLayer.children).forEach(g => {
            const circle = g.querySelector('circle');
            const text = g.querySelector('text');
            const id = g.dataset.id;
            const routeId = g.dataset.routeId;

            // Reconstruct route data
            const routePoints = this.getRoutePoints(routeId);

            players.push({
                id: id,
                type: 'offense',
                x: parseFloat(circle.getAttribute('cx')),
                y: parseFloat(circle.getAttribute('cy')),
                color: circle.getAttribute('fill'),
                label: text ? text.textContent : '',
                route: routePoints
            });
        });

        return { players, routes: [] }; // Routes are now attached to players
    }

    getRoutePoints(routeId) {
        const polyline = document.getElementById(routeId);
        if (!polyline) return [];

        const pointsStr = polyline.getAttribute('points');
        if (!pointsStr) return [];

        return pointsStr.trim().split(' ').map(pair => {
            const [x, y] = pair.split(',');
            return { x: parseFloat(x), y: parseFloat(y) };
        });
    }

    clear() {
        this.playersLayer.innerHTML = '';
        this.routesLayer.innerHTML = '';
        this.deselectPlayer();
    }

    // --- Interaction Handlers ---

    handleMouseDown(e) {
        if (this.isLocked) return;

        const target = e.target;
        // Check if hitting a player group or circle
        const playerGroup = target.closest('g.player-group');

        if (playerGroup) {
            this.isDragging = true;
            this.draggedElement = playerGroup;

            const pt = this.getPointFromEvent(e);
            const circle = playerGroup.querySelector('circle');
            const cx = parseFloat(circle.getAttribute('cx'));
            const cy = parseFloat(circle.getAttribute('cy'));

            this.dragOffset = { x: pt.x - cx, y: pt.y - cy };

            // Select on mouse down
            const playerId = playerGroup.dataset.id;
            // Find player data object (reconstruct it or reuse)
            const player = {
                id: playerId,
                element: playerGroup,
                routeId: playerGroup.dataset.routeId
            };
            this.selectPlayer(player);

            e.stopPropagation(); // Prevent canvas click
        }
    }

    handleMouseMove(e) {
        if (this.isLocked || !this.isDragging || !this.draggedElement) return;

        const pt = this.getPointFromEvent(e);
        const newX = pt.x - this.dragOffset.x;
        const newY = pt.y - this.dragOffset.y;

        // Update Circle
        const circle = this.draggedElement.querySelector('circle');
        circle.setAttribute('cx', newX);
        circle.setAttribute('cy', newY);

        // Update Label
        const text = this.draggedElement.querySelector('text');
        if (text) {
            text.setAttribute('x', newX);
            text.setAttribute('y', newY); // approx center
        }

        // Update Route Start Point
        if (this.mode !== 'formation') {
            this.updateRouteStart(this.draggedElement.dataset.routeId, newX, newY);
        }
    }

    handleMouseUp(e) {
        this.isDragging = false;
        this.draggedElement = null;
    }

    handleCanvasClick(e) {
        if (this.isLocked) {
            console.log('Editor: Locked click, calling snackbar', this.ui);
            if (this.ui) this.ui.showSnackbar("Click edit to start making edits");
            return;
        }

        if (this.isDragging) return;

        // Check valid field targets
        const isField = e.target.id === this.svg.id || e.target.id === 'field-layer' || e.target.tagName === 'rect';

        if (isField) {
            if (this.selectedPlayer) {
                // If player is selected, clicking field adds a route point
                if (this.mode === 'formation') return;

                const pt = this.getPointFromEvent(e);
                this.addRoutePoint(this.selectedPlayer, pt);
            } else {
                // If no player selected, clicking field ensures deselect (clean state)
                this.deselectPlayer();
            }
        }
    }

    // --- Player Management ---

    addPlayer(type) {
        if (this.isLocked) return;

        const id = 'p_' + Date.now();
        const routeId = 'r_' + id;
        const x = 400; // Center
        const y = 300;

        const player = {
            id, type, x, y, color: '#1f2937', label: '', route: []
        };

        this.renderPlayer(player);

        const playerObj = {
            id,
            element: this.playersLayer.querySelector(`[data-id="${id}"]`),
            routeId
        };
        this.selectPlayer(playerObj);
    }

    renderPlayer(player) {
        // Create Group
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'player-group');
        g.setAttribute('data-id', player.id);

        // Ensure route ID exists
        const routeId = player.routeId || ('r_' + player.id);
        g.setAttribute('data-routeId', routeId);

        // Circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', player.x);
        circle.setAttribute('cy', player.y);
        circle.setAttribute('r', 15);
        circle.setAttribute('stroke', player.color || '#1f2937');
        circle.setAttribute('stroke-width', '3');
        circle.setAttribute('fill', player.color || '#1f2937'); // Solid fill
        circle.setAttribute('fill-opacity', '1');

        // Text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', player.x);
        text.setAttribute('y', player.y);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dy', '.3em');
        text.textContent = player.label || '';
        text.setAttribute('fill', '#ffffff'); // White text on filled circle
        text.style.pointerEvents = 'none';

        g.appendChild(circle);
        g.appendChild(text);

        // Append to layer
        this.playersLayer.appendChild(g);

        // Create initial route element if needed
        let polyline = document.getElementById(routeId);
        if (!polyline) {
            polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            polyline.setAttribute('id', routeId);
            polyline.setAttribute('stroke', player.color || '#1f2937');
            polyline.setAttribute('stroke-width', '2');
            polyline.setAttribute('fill', 'none');

            // Add marker
            const colorHex = (player.color || '#1f2937').replace('#', '');
            // Try to find matching marker, fallback if logic complex
            polyline.setAttribute('marker-end', `url(#arrowhead-${colorHex})`);

            this.routesLayer.appendChild(polyline);
        }
    }

    renderRoute(player) {
        // Redraw route from data
        const routeId = 'r_' + player.id;
        // Check if polyline exists (created in renderPlayer usually)
        let polyline = document.getElementById(routeId);

        let points = [`${player.x},${player.y}`];
        if (player.route) {
            player.route.forEach(p => points.push(`${p.x},${p.y}`));
        }
        polyline.setAttribute('points', points.join(' '));
    }

    selectPlayer(playerObj) {
        // Deselect previous
        this.deselectPlayer();

        this.selectedPlayer = playerObj;

        // Visual indicator
        const circle = playerObj.element.querySelector('circle');
        if (circle) {
            // Use white stroke with shadow-like effect or just contrast
            // Simple: thick white border, but that might blend with field? 
            // Let's use Cyal/Teal contrast or keep black but solid
            circle.setAttribute('stroke', '#ffffff');
            circle.setAttribute('stroke-width', '4');
            // Adding a filter or second ring would be better but keeping it simple for now:
            // Let's make it look "selected" by being slightly larger stroke and white
        }

        // Show panel
        if (this.propertiesPanel) {
            this.propertiesPanel.classList.remove('hidden');
        }
        const title = document.getElementById('prop-title');
        if (title) title.textContent = 'Edit Player';
    }

    deselectPlayer() {
        if (this.selectedPlayer && this.selectedPlayer.element) {
            const circle = this.selectedPlayer.element.querySelector('circle');
            // Restore style
            const fill = circle.getAttribute('fill');
            if (circle) {
                circle.setAttribute('stroke', fill); // Stroke matches fill again
                circle.setAttribute('stroke-width', '3'); // Back to normal width
                circle.setAttribute('stroke-dasharray', ''); // Ensure no dash
            }
            this.selectedPlayer = null;
        }
        if (this.propertiesPanel) {
            this.propertiesPanel.classList.add('hidden');
        }
    }

    deletePlayer(id) {
        const p = this.playersLayer.querySelector(`[data-id="${id}"]`);
        if (p) p.remove();
        const r = document.getElementById('r_' + id);
        if (r) r.remove();
    }

    updateElementColor(color) {
        if (this.selectedPlayer) {
            const circle = this.selectedPlayer.element.querySelector('circle');
            circle.setAttribute('stroke', color);
            circle.setAttribute('fill', color);

            // Update Route Color
            const route = document.getElementById(this.selectedPlayer.routeId);
            if (route) {
                route.setAttribute('stroke', color);
                const hex = color.replace('#', '');
                route.setAttribute('marker-end', `url(#arrowhead-${hex})`);
            }
        }
    }

    // --- Route Logic ---

    addRoutePoint(playerObj, point) {
        const polyline = document.getElementById(playerObj.routeId);
        if (!polyline) return;

        let points = polyline.getAttribute('points') || '';

        // If empty, start at player pos
        if (!points) {
            const circle = playerObj.element.querySelector('circle');
            const cx = circle.getAttribute('cx');
            const cy = circle.getAttribute('cy');
            points = `${cx},${cy}`;
        }

        points += ` ${point.x},${point.y}`;
        polyline.setAttribute('points', points);
    }

    updateRouteStart(routeId, x, y) {
        const polyline = document.getElementById(routeId);
        if (!polyline) return;

        let points = polyline.getAttribute('points');
        if (!points) return; // No route yet

        const coords = points.trim().split(' '); // Trim to avoid empty strings
        if (coords.length > 0) {
            coords[0] = `${x},${y}`;
            polyline.setAttribute('points', coords.join(' '));
        }
    }

    undoLastRoutePoint(playerObj) {
        const polyline = document.getElementById(playerObj.routeId);
        let points = polyline.getAttribute('points');
        if (!points) return;

        const coords = points.trim().split(' ');
        if (coords.length > 1) {
            // Keep at least the start point?
            // If we only have start point + 1 point, reducing to start point essentially "clears" the visible route segment
            coords.pop();
            polyline.setAttribute('points', coords.join(' '));
        }
    }

    getPointFromEvent(e) {
        const pt = this.svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        return pt.matrixTransform(this.svg.getScreenCTM().inverse());
    }
}
