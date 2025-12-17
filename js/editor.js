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
        // this.propertiesPanel = document.getElementById('properties-panel'); // Removed
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
        fieldGroup.innerHTML = '';

        // 1. White Background
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '1000');
        rect.setAttribute('height', '700');
        rect.setAttribute('fill', '#ffffff');
        fieldGroup.appendChild(rect);

        // 2. Lines
        // Canvas is 1000x700. Center y=350.
        // User wants: "Gray lines go across entire white area". "At least two light gray lines above and below".

        // Center (LOS) - Dark Grey
        this.createLine(fieldGroup, 0, 350, 1000, 350, '#9ca3af', 4);

        // Lines Above
        this.createLine(fieldGroup, 0, 230, 1000, 230, '#e5e7eb', 2);
        this.createLine(fieldGroup, 0, 110, 1000, 110, '#e5e7eb', 2);

        // Lines Below
        this.createLine(fieldGroup, 0, 470, 1000, 470, '#e5e7eb', 2);
        this.createLine(fieldGroup, 0, 590, 1000, 590, '#e5e7eb', 2);
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
        // Moved to UI.js
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
        this.deselectPlayer(); // Ensure sidebar is closed and selection cleared
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
            // FIX: Ignore invisible hit-area when reading visual properties
            const circle = g.querySelector('circle:not(.hit-area)');
            const polygon = g.querySelector('polygon');
            const text = g.querySelector('text');
            const id = g.dataset.id;
            const routeId = g.dataset.routeId;

            // ROBUST: Read from dataset first, fall back to attributes only if needed
            let x = parseFloat(g.dataset.x);
            let y = parseFloat(g.dataset.y);
            let color = g.dataset.color;
            let label = g.dataset.label;
            let isPrimary = g.dataset.isPrimary === 'true';

            // Fallback (Legacy/First Load)
            if (isNaN(x)) x = (circle ? parseFloat(circle.getAttribute('cx')) : (text ? parseFloat(text.getAttribute('x')) : 0)) || 0;
            if (isNaN(y)) y = (circle ? parseFloat(circle.getAttribute('cy')) : (text ? parseFloat(text.getAttribute('y')) : 0)) || 0;
            if (!color) color = (circle ? circle.getAttribute('fill') : (polygon ? polygon.getAttribute('fill') : null)) || '#1f2937';
            if (label === undefined) label = text ? text.textContent : '';
            // If dataset.isPrimary is missing, check DOM structure
            if (g.dataset.isPrimary === undefined) isPrimary = g.querySelector('polygon') !== null;
            // Verify/Restore Route Parsing
            const routeGroup = document.getElementById(routeId);
            let routePoints = [];
            let routeStyles = [];
            let routeEndType = 'arrow';

            if (routeGroup) {
                routeEndType = routeGroup.dataset.endType || 'arrow';
                // Legacy polyline check
                if (routeGroup.tagName.toLowerCase() === 'polyline') {
                    // Skip legacy
                } else {
                    // It's a Group of lines or paths
                    const children = Array.from(routeGroup.children);
                    children.forEach(el => {
                        let rx, ry, style;
                        if (el.tagName === 'line') {
                            rx = parseFloat(el.getAttribute('x2'));
                            ry = parseFloat(el.getAttribute('y2'));
                            style = el.dataset.style || 'solid';
                        } else if (el.tagName === 'path') {
                            const d = el.getAttribute('d');
                            if (d) {
                                const parts = d.split(' ');
                                rx = parseFloat(parts[parts.length - 2]);
                                ry = parseFloat(parts[parts.length - 1]);
                                style = el.dataset.style || 'control';
                            }
                        }

                        if (!isNaN(rx) && !isNaN(ry)) {
                            routePoints.push({ x: rx, y: ry });
                            routeStyles.push(style);
                        }
                    });
                }
            }
            players.push({
                id: id,
                type: 'offense',
                x: x,
                y: y,
                color: color,
                label: label,
                route: routePoints,
                routeStyles: routeStyles,
                routeEndType: routeEndType,
                isPrimary: isPrimary
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

            // Suppress the subsequent 'click' event to prevent adding a route point
            this.shouldSuppressClick = true;
            // Clear flag after a short delay just in case click doesn't fire
            setTimeout(() => { this.shouldSuppressClick = false; }, 300);

            const pt = this.getPointFromEvent(e);
            // FIX: Ignore invisible hit-area circles
            const circle = playerGroup.querySelector('circle:not(.hit-area)');

            let cx, cy;
            if (circle) {
                cx = parseFloat(circle.getAttribute('cx'));
                cy = parseFloat(circle.getAttribute('cy'));
            } else {
                // Fallback for Star (Polygon) using Text centered position
                const txt = playerGroup.querySelector('text');
                cx = parseFloat(txt.getAttribute('x'));
                cy = parseFloat(txt.getAttribute('y'));
            }

            this.dragOffset = { x: pt.x - cx, y: pt.y - cy };

            // Select on mouse down
            const playerId = playerGroup.dataset.id;

            const text = playerGroup.querySelector('text');
            // circle already defined above as visual-only
            const polygon = playerGroup.querySelector('polygon');
            // FIX: Ensure we don't read transparent fill
            const color = (circle || polygon).getAttribute('fill');

            // Reconstruct Route State
            const routeId = playerGroup.dataset.routeId;
            const routeGroup = document.getElementById(routeId);
            let routePoints = [];
            let routeStyles = [];
            let routeEndType = 'arrow';

            if (routeGroup) {
                if (routeGroup.tagName.toLowerCase() === 'g') {
                    routeEndType = routeGroup.dataset.endType || 'arrow';
                    const lines = Array.from(routeGroup.querySelectorAll('line'));
                    lines.forEach(line => {
                        const x = parseFloat(line.getAttribute('x2'));
                        const y = parseFloat(line.getAttribute('y2'));
                        routePoints.push({ x, y });
                        routeStyles.push(line.dataset.style || 'solid');
                    });
                }
            }

            const player = {
                id: playerId,
                element: playerGroup,
                routeId: routeId,
                color: (circle || polygon) ? (circle || polygon).getAttribute('fill') : '#1f2937',
                label: text ? text.textContent : '',
                x: cx, // Store current x
                y: cy, // Store current y
                route: routePoints,
                routeStyles: routeStyles,
                routeEndType: routeEndType,
                isPrimary: !!polygon // Pass primary status derived from DOM
            };
            this.selectPlayer(player);

            e.stopPropagation(); // Keep this
        }
    }

    handleMouseMove(e) {
        if (this.isLocked || !this.isDragging || !this.draggedElement) return;

        const pt = this.getPointFromEvent(e);
        const newX = pt.x - this.dragOffset.x;
        const newY = pt.y - this.dragOffset.y;

        // Calculate Delta
        // FIX: Discriminate between Visual Circle and Hit Shield
        const visualCircle = this.draggedElement.querySelector('circle:not(.hit-area)');
        const hitCircle = this.draggedElement.querySelector('.hit-area');
        const polygon = this.draggedElement.querySelector('polygon'); // Star

        let oldX, oldY;

        if (visualCircle) {
            oldX = parseFloat(visualCircle.getAttribute('cx'));
            oldY = parseFloat(visualCircle.getAttribute('cy'));
        } else {
            // Star Case (Polygon + Maybe Shield)
            // Use Text or Shield for consistent center
            const text = this.draggedElement.querySelector('text');
            oldX = parseFloat(text.getAttribute('x'));
            oldY = parseFloat(text.getAttribute('y'));
        }

        const dx = newX - oldX;
        const dy = newY - oldY;

        // Update Shape
        if (visualCircle) {
            visualCircle.setAttribute('cx', newX);
            visualCircle.setAttribute('cy', newY);
        }

        // Always update Star Polygon if present
        if (polygon) {
            const points = this.calculateStarPoints(newX, newY, 5, 20, 10);
            polygon.setAttribute('points', points);
        }

        // Always update Hit Shield if present
        if (hitCircle) {
            hitCircle.setAttribute('cx', newX);
            hitCircle.setAttribute('cy', newY);
        }

        // Update Selection Ring
        const ring = this.draggedElement.querySelector('.selection-ring');
        if (ring) {
            ring.setAttribute('cx', newX);
            ring.setAttribute('cy', newY);
        }

        // Update Label
        const text = this.draggedElement.querySelector('text');
        if (text) {
            text.setAttribute('x', newX);
            text.setAttribute('y', newY); // approx center
        }

        // SYNC: Update selectedPlayer coords if we are dragging it
        if (this.selectedPlayer && this.draggedElement.dataset.id === this.selectedPlayer.id) {
            this.selectedPlayer.x = newX;
            this.selectedPlayer.y = newY;
        }

        // UPDATE DATASET
        this.draggedElement.dataset.x = newX;
        this.draggedElement.dataset.y = newY;

        // Update Route (Move ENTIRE route)
        if (this.mode !== 'formation') {
            const routeId = this.draggedElement.dataset.routeId;
            const routeGroup = document.getElementById(routeId);
            if (routeGroup) {
                // Legacy check
                if (routeGroup.tagName.toLowerCase() === 'polyline') {
                    // ... old logic, or just ignore (it will be redrawn on next render)
                } else {
                    // Update Lines
                    const lines = routeGroup.querySelectorAll('line');
                    lines.forEach(line => {
                        const x1 = parseFloat(line.getAttribute('x1'));
                        const y1 = parseFloat(line.getAttribute('y1'));
                        const x2 = parseFloat(line.getAttribute('x2'));
                        const y2 = parseFloat(line.getAttribute('y2'));

                        line.setAttribute('x1', x1 + dx);
                        line.setAttribute('y1', y1 + dy);
                        line.setAttribute('x2', x2 + dx);
                        line.setAttribute('y2', y2 + dy);
                    });

                    // Update Paths (Squiggly)
                    const paths = routeGroup.querySelectorAll('path');
                    paths.forEach(path => {
                        // We need to shift every point in d
                        const d = path.getAttribute('d');
                        if (!d) return;

                        // Better approach: Re-construct string
                        let newD = "";
                        const parts = d.split(' ');

                        let isX = true; // First number is X
                        for (let i = 0; i < parts.length; i++) {
                            const p = parts[i];
                            const val = parseFloat(p);
                            if (isNaN(val)) {
                                newD += p + " ";
                            } else {
                                if (isX) {
                                    newD += (val + dx).toFixed(2) + " ";
                                    isX = false;
                                } else {
                                    newD += (val + dy).toFixed(2) + " ";
                                    isX = true;
                                }
                            }
                        }
                        path.setAttribute('d', newD.trim());
                    });
                }
            }
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

        // Check suppression flag (from mousedown on player)
        if (this.shouldSuppressClick) {
            this.shouldSuppressClick = false;
            return;
        }

        // Ignore clicks on players (handled by mousedown)
        if (e.target.closest && e.target.closest('g.player-group')) return;

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
        const x = 500; // Center (1000/2)
        const y = 350; // Center (700/2)

        const player = {
            id, type, x, y, color: '#1f2937', label: '', route: []
        };

        this.renderPlayer(player);

        const playerObj = {
            id,
            element: this.playersLayer.querySelector(`[data-id="${id}"]`),
            routeId,
            x, // Center x
            y, // Center y
            color: '#1f2937',
            label: '',
            route: [], // Init empty route
            routeStyles: [] // Init empty styles
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
        // FIX: Use dataset property to ensure correct attribute mapping (data-route-id)
        g.dataset.routeId = routeId;
        // ROBUST: Store state in dataset
        g.dataset.x = player.x;
        g.dataset.y = player.y;
        g.dataset.color = player.color || '#1f2937';
        g.dataset.label = player.label || '';
        g.dataset.isPrimary = !!player.isPrimary;

        // Check for Primary (Star)
        // Check for Primary (Star)
        if (player.isPrimary) {
            // HIT TARGET: Transparent circle to fill gaps between star spikes
            const hitCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            hitCircle.setAttribute('class', 'hit-area'); // MARKER CLASS
            hitCircle.setAttribute('cx', player.x);
            hitCircle.setAttribute('cy', player.y);
            hitCircle.setAttribute('r', '20'); // Match star outer radius
            hitCircle.setAttribute('fill', 'transparent'); // Invisible but clickable
            hitCircle.setAttribute('stroke', 'none');
            g.appendChild(hitCircle);

            const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            const points = this.calculateStarPoints(player.x, player.y, 5, 20, 10);
            polygon.setAttribute('points', points);

            polygon.setAttribute('stroke', player.color || '#1f2937');
            polygon.setAttribute('stroke-width', '3');
            polygon.setAttribute('fill', player.color || '#1f2937');
            polygon.setAttribute('fill-opacity', '1');
            g.appendChild(polygon);
        } else {
            // Circle
            const shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            shape.setAttribute('cx', player.x);
            shape.setAttribute('cy', player.y);
            shape.setAttribute('r', 15);

            shape.setAttribute('stroke', player.color || '#1f2937');
            shape.setAttribute('stroke-width', '3');
            shape.setAttribute('fill', player.color || '#1f2937'); // Solid fill
            shape.setAttribute('fill-opacity', '1');
            g.appendChild(shape);
        }

        // Text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', player.x);
        text.setAttribute('y', player.y);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dy', '.3em');
        text.textContent = player.label || '';
        text.setAttribute('fill', '#ffffff'); // White text on filled circle
        text.style.pointerEvents = 'none';

        g.appendChild(text);

        // Append to layer
        this.playersLayer.appendChild(g);

        // Create initial route group if needed
        let routeGroup = document.getElementById(routeId);
        if (!routeGroup) {
            routeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            routeGroup.setAttribute('id', routeId);
            routeGroup.dataset.endType = 'arrow'; // Default
            this.routesLayer.appendChild(routeGroup);
        }
    }

    renderRoute(player) {
        // Redraw route from data using separate lines for segments
        const routeId = 'r_' + player.id;
        let routeGroup = document.getElementById(routeId);

        // If it was a polyline (legacy), remove it and create a group
        if (routeGroup && routeGroup.tagName.toLowerCase() === 'polyline') {
            routeGroup.remove();
            routeGroup = null;
        }

        if (!routeGroup) {
            routeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            routeGroup.setAttribute('id', routeId);
            // Copy dataset from player or init
            this.routesLayer.appendChild(routeGroup);
        }

        // Clear existing segments
        routeGroup.innerHTML = '';

        const points = player.route || []; // Array of {x, y}
        if (points.length === 0) return;

        // Origin
        let startX = player.x;
        let startY = player.y;

        const styles = player.routeStyles || [];
        const color = player.color || '#1f2937';
        // FIX: Robust hex generation (case insensitive, strip all #)
        const hex = color.replace(/#/g, '').toLowerCase();
        const endType = player.routeEndType || 'arrow';

        points.forEach((pt, index) => {
            let style = styles[index] || 'solid';
            // Removed fallback: if (style === 'squiggly') style = 'solid';

            // Handle Squiggly as Path, others as Line?
            // "Use <path> instead of <line> for squiggly segments"

            if (style === 'squiggly') {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                // Calculate d
                const d = this.createZigZagPath(startX, startY, pt.x, pt.y);
                path.setAttribute('d', d);
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke', color);
                path.setAttribute('stroke-width', '3');
                path.setAttribute('stroke-linejoin', 'round');
                path.setAttribute('stroke-linecap', 'round');
                path.dataset.style = style; // For retrieval

                // Marker on Path (only last segment)
                if (index === points.length - 1) {
                    if (endType === 'circle') {
                        path.setAttribute('marker-end', `url(#circlehead-${hex})`);
                    } else {
                        path.setAttribute('marker-end', `url(#arrowhead-${hex})`);
                    }
                }

                routeGroup.appendChild(path);

            } else {
                const segment = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                segment.setAttribute('x1', startX);
                segment.setAttribute('y1', startY);
                segment.setAttribute('x2', pt.x);
                segment.setAttribute('y2', pt.y);
                if (style === 'dashed') {
                    segment.setAttribute('stroke-dasharray', '8,8');
                }

                segment.setAttribute('stroke', color);
                segment.setAttribute('stroke-width', '3');
                segment.dataset.style = style; // For retrieval

                // Marker (only on last segment)
                if (index === points.length - 1) {
                    if (endType === 'circle') {
                        segment.setAttribute('marker-end', `url(#circlehead-${hex})`);
                    } else {
                        segment.setAttribute('marker-end', `url(#arrowhead-${hex})`);
                    }
                }
                routeGroup.appendChild(segment);
            }

            // Update start for next segment
            startX = pt.x;
            startY = pt.y;
        });

        // Store endType on the group for easy retrieval
        routeGroup.dataset.endType = endType;
    }

    updatePlayerLabel(label) {
        if (!this.selectedPlayer) return;

        // Limit length again to be safe
        const cleanLabel = (label || '').substring(0, 2).toUpperCase();
        this.selectedPlayer.label = cleanLabel;

        // Update SVG Text
        const text = this.selectedPlayer.element.querySelector('text');
        if (text) {
            text.textContent = cleanLabel;
        }

        // FIX: Update dataset so getData() reads the correct value
        if (this.selectedPlayer.element) {
            this.selectedPlayer.element.dataset.label = cleanLabel;
        }

        // Trigger UI update (to sync preview circle if needed)
        // this.app.ui.updateSidebar(this.selectedPlayer); // Might cause loop if updating input?
        // Instead, just update the preview circle directly via UI method if exists?
        // Or trust the input is already updated.
        // Update Preview Text strictly
        const preview = document.getElementById('prop-player-preview');
        if (preview) preview.textContent = cleanLabel;
    }

    selectPlayer(playerObj) {
        // Deselect previous
        this.deselectPlayer();

        this.selectedPlayer = playerObj;

        // Visual indicator: Dashed Ring
        const circle = playerObj.element.querySelector('circle');
        const polygon = playerObj.element.querySelector('polygon'); // Star

        if (circle || polygon) {
            // Check if ring exists
            let ring = playerObj.element.querySelector('.selection-ring');
            if (!ring) {
                ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                ring.setAttribute('class', 'selection-ring');
                ring.setAttribute('r', '24'); // Larger than player
                ring.setAttribute('fill', 'none');
                // Use player color
                ring.setAttribute('stroke', playerObj.color || '#3b82f6');
                ring.setAttribute('stroke-width', '2');
                ring.setAttribute('stroke-dasharray', '6,4'); // Tweak dash
                ring.style.pointerEvents = 'none';

                // Get coordinates
                if (circle) {
                    ring.setAttribute('cx', circle.getAttribute('cx'));
                    ring.setAttribute('cy', circle.getAttribute('cy'));
                } else {
                    // Star: use text center or polygon calcs? Text is simpler.
                    const text = playerObj.element.querySelector('text');
                    ring.setAttribute('cx', text.getAttribute('x'));
                    ring.setAttribute('cy', text.getAttribute('y'));
                }

                playerObj.element.appendChild(ring);
            } else {
                // Update existing ring color just in case
                ring.setAttribute('stroke', playerObj.color || '#3b82f6');
            }
        }

        // Show Sidebar via UI
        if (this.ui && this.ui.updateSidebar) {
            this.ui.updateSidebar(playerObj); // Pass full object including color
        }
    }

    deselectPlayer() {
        if (this.selectedPlayer && this.selectedPlayer.element) {
            // Remove selection ring
            const ring = this.selectedPlayer.element.querySelector('.selection-ring');
            if (ring) ring.remove();

            this.selectedPlayer = null;
        }

        // Hide Sidebar
        if (this.ui && this.ui.hideSidebar) {
            this.ui.hideSidebar();
        }
    }

    deletePlayer(id) {
        const p = this.playersLayer.querySelector(`[data-id="${id}"]`);
        if (p) p.remove();
        const r = document.getElementById('r_' + id);
        if (r) r.remove();
    }

    addRoutePoint(playerObj, pt) {
        // This was missing? Or I missed it in view.
        // Let's implement it.

        const routeId = 'r_' + playerObj.id;
        let routeGroup = document.getElementById(routeId);
        if (!routeGroup) {
            // Should verify renderPlayer created it.
            return;
        }

        // MIGRATION: If it's a polyline, replace it with a group
        if (routeGroup.tagName.toLowerCase() === 'polyline') {
            const oldPoly = routeGroup;
            routeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            routeGroup.setAttribute('id', routeId);
            routeGroup.dataset.endType = oldPoly.dataset.endType || 'arrow';

            // We can't easily preserve the old points as lines here without full parsing,
            // but addRoutePoint usually assumes extending.
            // Best effort: Remove old, start fresh group. 
            // The logic below handles "lines.length === 0" by starting at player center,
            // which effectively resets the route visual to empty + new point.
            // This is safer than leaving a broken state.
            oldPoly.remove();
            this.routesLayer.appendChild(routeGroup);

            // Also reset internal route data to be safe?
            playerObj.route = [];
            playerObj.routeStyles = [];
        }

        // Start point is:
        // If no lines, player center.
        // If lines, end of last line.
        let startX, startY;
        const lines = routeGroup.querySelectorAll('line, path'); // Queries both

        if (lines.length === 0) {
            startX = playerObj.x;
            // Fallback to DOM if object is stale/partial (safety)
            if (startX === undefined) {
                const circle = playerObj.element.querySelector('circle');
                if (circle) {
                    startX = parseFloat(circle.getAttribute('cx'));
                    startY = parseFloat(circle.getAttribute('cy'));
                } else {
                    // Star case
                    const text = playerObj.element.querySelector('text');
                    startX = parseFloat(text.getAttribute('x'));
                    startY = parseFloat(text.getAttribute('y'));
                }
                // Self-heal object
                playerObj.x = startX;
                playerObj.y = startY;
            } else {
                startY = playerObj.y;
            }
        } else {
            const last = lines[lines.length - 1];
            if (last.tagName === 'line') {
                startX = parseFloat(last.getAttribute('x2'));
                startY = parseFloat(last.getAttribute('y2'));
            } else if (last.tagName === 'path') {
                // Parse d for last point
                // Format: "... L x y"
                const d = last.getAttribute('d');
                const parts = d.split(' ');
                // If it ends with L x y
                startX = parseFloat(parts[parts.length - 2]);
                startY = parseFloat(parts[parts.length - 1]);
            }

            // Remove marker from OLD last line/path
            last.removeAttribute('marker-end');
        }

        // Ensure route arrays exist (Safety against partial objects)
        if (!playerObj.route) playerObj.route = [];
        if (!playerObj.routeStyles) playerObj.routeStyles = [];

        const hex = (playerObj.color || '#1f2937').replace('#', '');
        const endType = routeGroup.dataset.endType || 'arrow';

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', pt.x);
        line.setAttribute('y2', pt.y);
        line.setAttribute('stroke', playerObj.color || '#1f2937');
        line.setAttribute('stroke-width', '3');
        line.dataset.style = 'solid'; // Default

        if (endType === 'circle') {
            line.setAttribute('marker-end', `url(#circlehead-${hex})`);
        } else {
            line.setAttribute('marker-end', `url(#arrowhead-${hex})`);
        }

        routeGroup.appendChild(line);

        // SYNC STATE: Update the player object's route array so UI sees the new segment
        if (!playerObj.route) playerObj.route = [];
        playerObj.route.push({ x: pt.x, y: pt.y });

        if (!playerObj.routeStyles) playerObj.routeStyles = [];
        playerObj.routeStyles.push('solid'); // Default new segment style

        // Update Sidebar if active
        if (this.selectedPlayer && this.selectedPlayer.id === playerObj.id) {
            if (this.ui && this.ui.updateSidebar) this.ui.updateSidebar(this.selectedPlayer);
        }
    }

    deleteSelected() {
        if (this.selectedPlayer) {
            if (confirm('Delete this player?')) {
                this.deletePlayer(this.selectedPlayer.id);
                this.deselectPlayer();
            }
        }
    }

    undoLastRoutePoint(playerObj) {
        // If called without arg, use selected
        const p = playerObj || this.selectedPlayer;
        if (!p) return;

        const routeGroup = document.getElementById(p.routeId);
        if (!routeGroup) return;

        if (routeGroup.tagName.toLowerCase() === 'g') {
            const lines = routeGroup.querySelectorAll('line');
            if (lines.length > 0) {
                // Remove last line
                lines[lines.length - 1].remove();

                // If there are still segments, ensure the NEW last segment has the marker
                const remaining = routeGroup.querySelectorAll('line');
                if (remaining.length > 0) {
                    const last = remaining[remaining.length - 1];
                    const endType = routeGroup.dataset.endType || 'arrow';
                    const color = p.element.querySelector('circle').getAttribute('fill');
                    const hex = color.replace('#', '');

                    if (endType === 'circle') {
                        last.setAttribute('marker-end', `url(#circlehead-${hex})`);
                    } else {
                        last.setAttribute('marker-end', `url(#arrowhead-${hex})`);
                    }
                }

                // Update internal model
                if (p.route && p.route.length > 0) {
                    p.route.pop();
                }
                if (p.routeStyles && p.routeStyles.length > 0) {
                    p.routeStyles.pop();
                }

                // Update Sidebar to reflect removal
                if (this.selectedPlayer && this.selectedPlayer.id === p.id) {
                    if (this.ui && this.ui.updateSidebar) this.ui.updateSidebar(this.selectedPlayer);
                }
            }
        }
    }

    updateRouteStyle(index, style) {
        if (!this.selectedPlayer) return;

        // Update Internal Data
        if (!this.selectedPlayer.routeStyles) this.selectedPlayer.routeStyles = [];
        this.selectedPlayer.routeStyles[index] = style;

        // Force Re-render to handle element type changes (Line vs Path)
        this.renderRoute(this.selectedPlayer);
    }

    updateRouteEndType(type) {
        if (!this.selectedPlayer) return;
        const routeGroup = document.getElementById(this.selectedPlayer.routeId);

        if (routeGroup && routeGroup.tagName.toLowerCase() === 'g') {
            // FIX: Ignore invisible hit-area when reading color
            const circle = this.selectedPlayer.element.querySelector('circle:not(.hit-area)');
            const color = circle ? circle.getAttribute('fill') : (this.selectedPlayer.color || '#1f2937');

            const hex = color.replace(/#/g, '').toLowerCase();
            const lines = routeGroup.querySelectorAll('line');

            // Update marker on LAST segment only
            if (lines.length > 0) {
                const lastLine = lines[lines.length - 1];
                if (type === 'circle') {
                    lastLine.setAttribute('marker-end', `url(#circlehead-${hex})`);
                } else {
                    lastLine.setAttribute('marker-end', `url(#arrowhead-${hex})`);
                }
            }

            // Save to dataset for persistence
            routeGroup.dataset.endType = type;
            this.selectedPlayer.routeEndType = type;
        }
    }

    updateElementColor(color) {
        if (this.selectedPlayer) {
            // Update Selection Ring
            const ring = this.selectedPlayer.element.querySelector('.selection-ring');
            if (ring) {
                ring.setAttribute('stroke', color);
            }

            // Update selected player object color property
            // Update selected player object color property
            this.selectedPlayer.color = color;
            // ROBUST: Update dataset for persistence
            if (this.selectedPlayer.element) {
                this.selectedPlayer.element.dataset.color = color;
            }

            // Update Circle (if exists, ignore hit-area AND selection-ring)
            const circle = this.selectedPlayer.element.querySelector('circle:not(.hit-area):not(.selection-ring)');
            if (circle) {
                circle.setAttribute('stroke', color);
                circle.setAttribute('fill', color);
            }

            // Update Polygon/Star (if exists)
            const polygon = this.selectedPlayer.element.querySelector('polygon');
            if (polygon) {
                polygon.setAttribute('stroke', color);
                polygon.setAttribute('fill', color);
            }



            // Update Route Color
            const routeGroup = document.getElementById(this.selectedPlayer.routeId);
            if (routeGroup) {
                const hex = color.replace(/#/g, '').toLowerCase();

                // Update Lines
                const lines = routeGroup.querySelectorAll('line');
                lines.forEach((line, index) => {
                    line.setAttribute('stroke', color);
                    // Update marker on last segment (if line)
                    // Note: markers are usually on the very last element of the group
                    if (index === lines.length - 1 && routeGroup.lastElementChild === line) {
                        // This check is a bit loose if paths are mixed. 
                        // Better: check if it HAS a marker-end?
                        if (line.hasAttribute('marker-end')) {
                            const endType = routeGroup.dataset.endType || 'arrow';
                            if (endType === 'circle') {
                                line.setAttribute('marker-end', `url(#circlehead-${hex})`);
                            } else {
                                line.setAttribute('marker-end', `url(#arrowhead-${hex})`);
                            }
                        }
                    } else if (line.hasAttribute('marker-end')) {
                        // In case lines are mixed, just update any marker found
                        const endType = routeGroup.dataset.endType || 'arrow';
                        if (endType === 'circle') {
                            line.setAttribute('marker-end', `url(#circlehead-${hex})`);
                        } else {
                            line.setAttribute('marker-end', `url(#arrowhead-${hex})`);
                        }
                    }
                });

                // Update Paths (Squiggly)
                const paths = routeGroup.querySelectorAll('path');
                paths.forEach(path => {
                    path.setAttribute('stroke', color);
                    if (path.hasAttribute('marker-end')) {
                        const endType = routeGroup.dataset.endType || 'arrow';
                        if (endType === 'circle') {
                            path.setAttribute('marker-end', `url(#circlehead-${hex})`);
                        } else {
                            path.setAttribute('marker-end', `url(#arrowhead-${hex})`);
                        }
                    }
                });
            }

            // Update Sidebar Preview
            if (this.ui && this.ui.updateSidebar) {
                this.ui.updateSidebar(this.selectedPlayer);
            }
        }
    }

    updateElementLabel(label) {
        if (this.selectedPlayer) {
            this.selectedPlayer.label = label;

            // Update SVG Text
            const textEl = this.selectedPlayer.element.querySelector('text');
            if (textEl) {
                textEl.textContent = label;
            }

            // No need to call updateSidebar as the input driving this *is* in the sidebar
            // But if we had other ways to change label, we would.
        }
    }

    // --- Primary Player Support ---

    togglePrimaryPlayer() {
        if (!this.selectedPlayer) return;

        const isPrimary = !this.selectedPlayer.isPrimary;

        // If becoming primary, iterate others to un-primary them
        if (isPrimary) {
            Array.from(this.playersLayer.children).forEach(g => {
                // We don't have object ref easily, so just update DOM if rendering relies on it?
                // Or we iterate and re-render all?
                // Re-rendering everything is safest but expensive? Not really for < 22 players.
            });
        }

        // Better: Update DATA of all, then re-render all or affected.
        // We need to fetch all data to modify correctly.
        // Quick Fix: Iterate children dataset, re-render.

        const currentId = this.selectedPlayer.id;
        const snapshot = this.getData();

        // Mod snapshot
        snapshot.players.forEach(p => {
            if (p.id === currentId) {
                p.isPrimary = isPrimary;
            } else if (isPrimary) {
                // If we are setting new primary, impossible for others to be primary
                p.isPrimary = false;
            }
        });

        // Reload
        this.loadData(snapshot);

        // Re-select current
        const newObj = snapshot.players.find(p => p.id === currentId);
        // Need to find DOM element again
        const freshEl = this.playersLayer.querySelector(`[data-id="${currentId}"]`);

        if (newObj && freshEl) {
            // Reconstruct selection object
            // Ideally selectPlayer handles this if passed valid obj?
            // Or better: manual re-select logic.
            // Let's use selectPlayer logic but with correct obj.
            // We need to reconstruct full object like in mouseDown...
            // OR: Since we just loaded data, we can create object from data 'p'

            // ... actually loadData logic clears selection.
            // So we must re-select.

            // Rebuild obj from 'p' + freshEl
            const p = newObj;
            const reObj = {
                ...p,
                element: freshEl,
                routeId: 'r_' + p.id
                // p has route/styles/isPrimary etc
            };
            this.selectPlayer(reObj);
        }
    }


    getPointFromEvent(e) {
        const pt = this.svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        return pt.matrixTransform(this.svg.getScreenCTM().inverse());
    }
    calculateStarPoints(cx, cy, spikes = 5, outerRadius = 20, innerRadius = 10) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;
        let str = "";

        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            str += x.toFixed(2) + "," + y.toFixed(2) + " ";
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            str += x.toFixed(2) + "," + y.toFixed(2) + " ";
            rot += step;
        }
        return str;
    }

    setPrimaryPlayer(id) {
        // Toggle primary status for this player, ensure single primary
        const data = this.getData();
        const target = data.players.find(p => p.id === id);

        if (!target) return;

        // Logic: specific requirements "Toggle... Only one per play."
        const wasPrimary = target.isPrimary;

        // Reset all
        data.players.forEach(p => p.isPrimary = false);

        // Set target if it wasn't already (toggle)
        if (!wasPrimary) {
            target.isPrimary = true;
        }

        // CRITICAL: Preserve Coordinates from selectedPlayer if available
        // This prevents "Disappearing" bugs if DOM read (getData) failed to capture Position from Star/Polygon
        if (this.selectedPlayer && this.selectedPlayer.id === id) {
            target.x = this.selectedPlayer.x;
            target.y = this.selectedPlayer.y;
        }

        // Reload data to reflect changes
        this.loadData(data);

        // Restore Selection
        const el = this.playersLayer.querySelector(`[data-id="${id}"]`);
        if (el) {
            const rehydrated = data.players.find(p => p.id === id); // Get updated state
            const obj = {
                ...rehydrated,
                element: el,
                routeId: 'r_' + id
            };
            this.selectPlayer(obj);
        }
    }

    createZigZagPath(x1, y1, x2, y2) {
        if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return `M 0 0`; // Fail safe
        // Create a zigzag/wavy path between two points
        const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        if (dist < 5) return `M ${x1} ${y1} L ${x2} ${y2}`;

        const angle = Math.atan2(y2 - y1, x2 - x1);

        // Parameters
        const segmentLength = 15;
        const amplitude = 6;
        const steps = Math.floor(dist / segmentLength);

        let d = `M ${x1} ${y1}`;
        let cx = x1;
        let cy = y1;

        // We move along the line, adding offsets perpendicular
        const dx = (x2 - x1) / steps;
        const dy = (y2 - y1) / steps;

        for (let i = 1; i <= steps; i++) {
            // Intermediate point on line
            const progress = i / steps;
            const tx = x1 + (x2 - x1) * progress;
            const ty = y1 + (y2 - y1) * progress;

            // Zig or Zag
            // If i is odd, go 'left/up', even 'right/down' relative to line
            // Actually, wave usually goes up then down.
            // Perpendicular vector (-sin, cos)
            const offset = (i % 2 === 0) ? amplitude : -amplitude;

            const wx = tx + Math.cos(angle + Math.PI / 2) * offset;
            const wy = ty + Math.sin(angle + Math.PI / 2) * offset;

            // If last point, we must reconnect to end?
            // Actually a zig zag should probably not land offset.
            // If steps is odd, we end offset.
            // Let's force landing at x2, y2
            if (i === steps) {
                d += ` L ${x2} ${y2}`;
            } else {
                d += ` L ${wx} ${wy}`;
            }
        }

        return d;
    }
}
