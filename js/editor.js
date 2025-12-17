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
            const circle = g.querySelector('circle');
            const polygon = g.querySelector('polygon');
            const text = g.querySelector('text');
            const id = g.dataset.id;
            const routeId = g.dataset.routeId;

            // Get Coords
            let x, y, color;
            if (circle) {
                x = parseFloat(circle.getAttribute('cx'));
                y = parseFloat(circle.getAttribute('cy'));
                color = circle.getAttribute('fill');
            } else {
                // Star/Polygon: Use Text pos as center equivalent
                x = parseFloat(text.getAttribute('x'));
                y = parseFloat(text.getAttribute('y'));
                color = polygon.getAttribute('fill');
            }

            // Reconstruct route data
            // Note: getRoutePoints logic needs update or verify it works with group? 
            // It relied on polyline attribute.
            const routeGroup = document.getElementById(routeId);
            let routePoints = [];
            let routeStyles = [];
            let routeEndType = 'arrow';

            if (routeGroup) {
                if (routeGroup.tagName.toLowerCase() === 'polyline') {
                    // Fallback for legacy if not yet converted (unlikely with loadData)
                    // ... (Skip complex fallback, assume render converted it)
                } else {
                    // It's a Group of lines
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

            players.push({
                id: id,
                type: 'offense',
                x: parseFloat(circle.getAttribute('cx')),
                y: parseFloat(circle.getAttribute('cy')),
                color: circle.getAttribute('fill'),
                label: text ? text.textContent : '',
                route: routePoints,
                routeStyles: routeStyles, // Save array
                routeEndType: routeEndType,
                isPrimary: g.querySelector('polygon') !== null // Check if star
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
            const circle = playerGroup.querySelector('circle');
            const cx = parseFloat(circle.getAttribute('cx'));
            const cy = parseFloat(circle.getAttribute('cy'));

            this.dragOffset = { x: pt.x - cx, y: pt.y - cy };

            // Select on mouse down
            const playerId = playerGroup.dataset.id;

            const text = playerGroup.querySelector('text');
            // circle already defined above
            const polygon = playerGroup.querySelector('polygon');
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
                color: circle.getAttribute('fill'),
                label: text ? text.textContent : '',
                x: cx, // Store current x
                y: cy, // Store current y
                route: routePoints,
                routeStyles: routeStyles,
                routeEndType: routeEndType
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
        // Calculate Delta
        const circle = this.draggedElement.querySelector('circle');
        const polygon = this.draggedElement.querySelector('polygon'); // Star
        let oldX, oldY;

        if (circle) {
            oldX = parseFloat(circle.getAttribute('cx'));
            oldY = parseFloat(circle.getAttribute('cy'));
        } else if (polygon) {
            // Re-calc from Star? Bounding box or stored logic?
            // Better: we stored current X/Y in this.selectedPlayer / this.draggedElement logic 
            // But here we read from DOM.
            // Center of star is rough.
            // We can infer translation from text position?
            const text = this.draggedElement.querySelector('text');
            oldX = parseFloat(text.getAttribute('x'));
            oldY = parseFloat(text.getAttribute('y'));
        }

        const dx = newX - oldX;
        const dy = newY - oldY;

        // Update Shape
        if (circle) {
            circle.setAttribute('cx', newX);
            circle.setAttribute('cy', newY);
        } else if (polygon) {
            // Re-calc points for star at new location
            // Assume we have access to helper? Or logic
            // Ideally we move Group with transform translate? NO we are moving attributes.
            // Need to call calculateStarPoints again
            const points = this.calculateStarPoints(newX, newY, 5, 20, 10);
            polygon.setAttribute('points', points);
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

        // Update Route (Move ENTIRE route)
        if (this.mode !== 'formation') {
            const routeId = this.draggedElement.dataset.routeId;
            const routeGroup = document.getElementById(routeId);
            if (routeGroup) {
                // Legacy check
                if (routeGroup.tagName.toLowerCase() === 'polyline') {
                    // ... old logic, or just ignore (it will be redrawn on next render)
                } else {
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
        g.setAttribute('data-routeId', routeId);

        // Circle
        const shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        shape.setAttribute('cx', player.x);
        shape.setAttribute('cy', player.y);
        shape.setAttribute('r', 15);

        shape.setAttribute('stroke', player.color || '#1f2937');
        shape.setAttribute('stroke-width', '3');
        shape.setAttribute('fill', player.color || '#1f2937'); // Solid fill
        shape.setAttribute('fill-opacity', '1');

        // Text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', player.x);
        text.setAttribute('y', player.y);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dy', '.3em');
        text.textContent = player.label || '';
        text.setAttribute('fill', '#ffffff'); // White text on filled circle
        text.style.pointerEvents = 'none';

        g.appendChild(shape);
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
        const hex = color.replace('#', '');
        const endType = player.routeEndType || 'arrow';

        points.forEach((pt, index) => {
            let style = styles[index] || 'solid';
            // Force fallback if style was squiggly
            if (style === 'squiggly') style = 'solid';

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
        if (circle) {
            // Add a dedicated selection ring (or modify stroke)
            // Strategy: Add a new circle element "selection-ring" to the group?
            // Or just modify the stroke as requested. "Dashed circle around them"

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

                // Get cx/cy from primary circle
                ring.setAttribute('cx', circle.getAttribute('cx'));
                ring.setAttribute('cy', circle.getAttribute('cy'));

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
        const lines = routeGroup.querySelectorAll('line');

        if (lines.length === 0) {
            startX = playerObj.x;
            // Fallback to DOM if object is stale/partial (safety)
            if (startX === undefined) {
                const circle = playerObj.element.querySelector('circle');
                startX = parseFloat(circle.getAttribute('cx'));
                startY = parseFloat(circle.getAttribute('cy'));
                // Self-heal object
                playerObj.x = startX;
                playerObj.y = startY;
            } else {
                startY = playerObj.y;
            }
        } else {
            const last = lines[lines.length - 1];
            startX = parseFloat(last.getAttribute('x2'));
            startY = parseFloat(last.getAttribute('y2'));

            // Remove marker from OLD last line
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
        const routeGroup = document.getElementById(this.selectedPlayer.routeId);

        if (routeGroup && routeGroup.tagName.toLowerCase() === 'g') {
            const lines = routeGroup.querySelectorAll('line');
            const line = lines[index];
            if (line) {
                if (style === 'dashed') {
                    line.setAttribute('stroke-dasharray', '8,8');
                } else {
                    line.setAttribute('stroke-dasharray', '');
                }
                line.dataset.style = style;

                // Update internal data model if we want immediate sync, 
                // but usually we rely on getData() at save time.
                // However, selectedPlayer.routeStyles needs update for UI consistency if we re-click
                if (!this.selectedPlayer.routeStyles) this.selectedPlayer.routeStyles = [];
                this.selectedPlayer.routeStyles[index] = style;
            }
        }
    }

    updateRouteEndType(type) {
        if (!this.selectedPlayer) return;
        const routeGroup = document.getElementById(this.selectedPlayer.routeId);

        if (routeGroup && routeGroup.tagName.toLowerCase() === 'g') {
            const color = this.selectedPlayer.element.querySelector('circle').getAttribute('fill');
            const hex = color.replace('#', '');
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
            const circle = this.selectedPlayer.element.querySelector('circle');
            circle.setAttribute('stroke', color);
            circle.setAttribute('fill', color);

            // Update Selection Ring
            const ring = this.selectedPlayer.element.querySelector('.selection-ring');
            if (ring) {
                ring.setAttribute('stroke', color);
            }

            // Update selected player object color property
            this.selectedPlayer.color = color;

            // Update Circle OR Star
            const shape = this.selectedPlayer.element.querySelector('circle') || this.selectedPlayer.element.querySelector('polygon');
            if (shape) {
                shape.setAttribute('stroke', color);
                shape.setAttribute('fill', color);
            }

            // Update Route Color
            const routeGroup = document.getElementById(this.selectedPlayer.routeId);
            if (routeGroup) {
                // If it's a legacy polyline, convert or just update (renderRoute handles structure)
                // But simplified:
                if (routeGroup.tagName.toLowerCase() === 'g') {
                    const hex = color.replace('#', '');
                    const lines = routeGroup.querySelectorAll('line');
                    lines.forEach((line, index) => {
                        line.setAttribute('stroke', color);
                        // Update marker on last segment
                        if (index === lines.length - 1) {
                            const endType = routeGroup.dataset.endType || 'arrow';
                            if (endType === 'circle') {
                                line.setAttribute('marker-end', `url(#circlehead-${hex})`);
                            } else {
                                line.setAttribute('marker-end', `url(#arrowhead-${hex})`);
                            }
                        }
                    });
                }
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

    calculateStarPoints(cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;

        let points = [];
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            points.push(`${x},${y}`);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            points.push(`${x},${y}`);
            rot += step;
        }
        return points.join(' ');
    }

    createZigZagPath(x1, y1, x2, y2) {
        // Parametric wiggle
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);

        // Number of zigs
        const wavelength = 20;
        const amplitude = 10;
        const steps = Math.ceil(dist / wavelength);

        let d = `M ${x1} ${y1}`;

        for (let i = 1; i <= steps; i++) {
            const t = i / steps;

            // Current point on straight line
            const cx = x1 + dx * t;
            const cy = y1 + dy * t;

            // Offset perpendicular
            // If straight line is vector V, perpendicular is (-Vy, Vx)

            // Zig vs Zag
            const sign = (i % 2 === 0) ? 1 : -1;

            // Perpendicular unit vector
            const px = -Math.sin(angle);
            const py = Math.cos(angle);

            // Wiggle point
            // For last point, we must land exactly on x2,y2. 
            // So wiggle should only apply to intermediates. 
            // Actually 'path' handles it.

            if (i === steps) {
                d += ` L ${x2} ${y2}`;
            } else {
                const wx = cx + px * amplitude * sign;
                const wy = cy + py * amplitude * sign;
                d += ` L ${wx} ${wy}`;
            }
        }
        return d;
    }

    // Legacy methods removed (addRoutePoint, updateRouteStart)


    getPointFromEvent(e) {
        const pt = this.svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        return pt.matrixTransform(this.svg.getScreenCTM().inverse());
    }
}
