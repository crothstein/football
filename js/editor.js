export class Editor {
    constructor(svgId) {
        this.svg = document.getElementById(svgId);
        this.playersLayer = document.getElementById('players-layer');
        this.routesLayer = document.getElementById('routes-layer');
        this.fieldLayer = document.getElementById('field-layer');

        if (!this.playersLayer || !this.routesLayer || !this.fieldLayer) {
            console.error('CRITICAL ERROR: SVG Layers not found!', {
                players: this.playersLayer,
                routes: this.routesLayer,
                field: this.fieldLayer
            });
        }

        this.selectedElement = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };

        this.isDrawing = false;
        this.currentRoute = null;
        this.activePlayerId = null; // The player we are drawing for

        this.init();
    }

    init() {
        console.log('Editor.init() called');
        this.drawField();
        this.setupEventListeners();

        // Handle window resize
        window.addEventListener('resize', () => {
            this.updateCanvasSize();
        });
    }

    drawField() {
        console.log('Drawing field...');
        // Clear existing field
        this.fieldLayer.innerHTML = '';

        // Draw Grass
        const fieldRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        fieldRect.setAttribute('width', '100%');
        fieldRect.setAttribute('height', '100%');
        fieldRect.setAttribute('fill', '#4ade80');
        this.fieldLayer.appendChild(fieldRect);
        console.log('Field rect appended');

        // Draw Yard Lines (Horizontal version)
        for (let i = 1; i < 10; i++) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', '0');
            line.setAttribute('y1', `${i * 10}%`);
            line.setAttribute('x2', '100%');
            line.setAttribute('y2', `${i * 10}%`);
            line.setAttribute('stroke', 'white');
            line.setAttribute('stroke-opacity', '0.5');
            line.setAttribute('stroke-width', '2');
            this.fieldLayer.appendChild(line);
        }
    }

    setupEventListeners() {
        // Dragging Logic
        this.svg.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.svg.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.svg.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.svg.addEventListener('mouseleave', (e) => this.onMouseUp(e));

        // Route Drawing Logic (Click based)
        this.svg.addEventListener('click', (e) => this.onCanvasClick(e));
    }

    getMousePos(evt) {
        const CTM = this.svg.getScreenCTM();
        return {
            x: (evt.clientX - CTM.e) / CTM.a,
            y: (evt.clientY - CTM.f) / CTM.d
        };
    }

    addPlayer(type) {
        console.log('Adding player:', type); // Debug log
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'draggable');
        group.setAttribute('transform', 'translate(400, 300)');
        group.dataset.type = type;
        // Add unique ID
        group.id = 'p_' + Date.now();

        if (type === 'offense') {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', '0');
            circle.setAttribute('cy', '0');
            circle.setAttribute('r', '20');
            // Explicitly set styles to ensure visibility
            circle.setAttribute('fill', 'white');
            circle.setAttribute('stroke', '#6366f1');
            circle.setAttribute('stroke-width', '4');
            circle.setAttribute('class', 'player-circle'); // Keep class for selection logic
            group.appendChild(circle);
            group.dataset.color = '#6366f1'; // Set default color
        } else if (type === 'defense') {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', 'M-15,-15 L15,15 M15,-15 L-15,15');
            path.setAttribute('stroke', '#ef4444');
            path.setAttribute('stroke-width', '4');
            path.setAttribute('class', 'player-cross');
            group.appendChild(path);
        } else if (type === 'ball') {
            const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
            ellipse.setAttribute('rx', 8);
            ellipse.setAttribute('ry', 12);
            ellipse.setAttribute('class', 'ball');
            group.appendChild(ellipse);
        }

        // Re-query to be absolutely safe
        const layer = document.getElementById('players-layer');
        if (layer) {
            layer.appendChild(group);
        } else {
            console.error('Failed to find players-layer during append');
        }

        return group;
    }

    onMouseDown(e) {
        // Don't deselect if we are in drawing mode
        if (this.isDrawing) return;

        // Clear previous selection if clicking background
        if (e.target.id === 'play-canvas' || e.target.id === 'field-layer' || e.target.tagName === 'rect') {
            this.deselectAll();
        }

        const draggableGroup = e.target.closest('.draggable');
        if (draggableGroup) {
            this.selectElement(draggableGroup);
            this.isDragging = true;

            // Dragging logic setup...
            const coord = this.getMousePos(e);
            const transform = this.selectedElement.getAttribute('transform');
            let currentX = 0, currentY = 0;
            const match = /translate\s*\(\s*([-\d.]+)(?:[,\s]+([-\d.]+))?\s*\)/.exec(transform);
            if (match) {
                currentX = parseFloat(match[1]);
                currentY = match[2] ? parseFloat(match[2]) : 0;
            }
            this.prevPlayerPos = { x: currentX, y: currentY };
            this.dragOffset.x = coord.x - currentX;
            this.dragOffset.y = coord.y - currentY;
            e.stopPropagation();
        } else if (e.target.classList.contains('route-path')) {
            // Handle Route Click -> Select Player
            const playerId = e.target.dataset.playerId;
            if (playerId) {
                const player = document.getElementById(playerId);
                if (player) {
                    this.selectElement(player);
                    e.stopPropagation();
                }
            }
        }
    }

    selectElement(el) {
        this.selectedElement = el;
        this.highlightElement(el);
        if (this.onSelectionChange) {
            this.onSelectionChange(el);
        }
    }

    startRouteFromPlayer(player) {
        // Get player position
        const transform = player.getAttribute('transform');
        const parts = /translate\(\s*([^\s,)]+)[ ,]([^\s,)]+)/.exec(transform);
        let x = 400, y = 300; // Defaults
        if (parts) {
            x = parseFloat(parts[1]);
            y = parseFloat(parts[2]);
        }

        this.activePlayerId = player.id;

        // Create new path element
        this.currentRoute = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        this.currentRoute.setAttribute('class', 'route-path');
        this.currentRoute.setAttribute('d', `M${x},${y}`);
        this.currentRoute.dataset.playerId = this.activePlayerId;

        // Match player color if possible
        const color = player.dataset.color || '#6366f1';
        this.currentRoute.style.stroke = color;
        this.currentRoute.dataset.color = color;

        // Create arrow polygon for this route
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        arrow.setAttribute('points', '0,0 10,5 0,10');
        arrow.setAttribute('fill', color);
        arrow.setAttribute('class', 'route-arrow');
        arrow.dataset.routeId = this.currentRoute.dataset.playerId + '_' + Date.now();
        this.currentRoute.dataset.arrowId = arrow.dataset.routeId;

        this.routesLayer.appendChild(this.currentRoute);
        this.routesLayer.appendChild(arrow);
        this.updateRouteArrow(this.currentRoute, arrow);
    }

    highlightElement(el) {
        // Remove highlight from others
        this.playersLayer.childNodes.forEach(node => {
            if (node.nodeType === 1) node.style.opacity = '0.6';
        });
        el.style.opacity = '1.0';
    }

    deselectAll() {
        this.selectedElement = null;
        this.playersLayer.childNodes.forEach(node => {
            if (node.nodeType === 1) node.style.opacity = '1.0';
        });
        if (this.onSelectionChange) this.onSelectionChange(null);
    }

    updateElementColor(color) {
        if (!this.selectedElement) return;

        const type = this.selectedElement.dataset.type;
        const shape = this.selectedElement.querySelector('circle, path, ellipse');

        if (shape) {
            if (type === 'offense') {
                shape.style.stroke = color;
            } else if (type === 'defense') {
                shape.style.stroke = color;
            }
            // Store color in dataset for persistence
            this.selectedElement.dataset.color = color;
        }

        // Also update any routes connected to this player
        const playerId = this.selectedElement.id;
        if (playerId) {
            const routes = this.routesLayer.querySelectorAll(`path[data-player-id="${playerId}"]`);
            routes.forEach(route => {
                route.style.stroke = color;
                const colorId = color.substring(1);
                route.setAttribute('marker-end', `url(#arrowhead-${colorId})`);
            });
        }
    }

    deleteSelected() {
        if (this.selectedElement) {
            // Remove connected routes first
            const playerId = this.selectedElement.id;
            if (playerId) {
                const routes = this.routesLayer.querySelectorAll(`path[data-player-id="${playerId}"]`);
                routes.forEach(route => route.remove());
            }
            this.selectedElement.remove();
            this.deselectAll();
        }
    }

    onMouseMove(e) {
        if (this.isDragging && this.selectedElement) {
            e.preventDefault();
            const coord = this.getMousePos(e);

            // Check for NaN
            if (isNaN(coord.x) || isNaN(coord.y)) {
                console.error('MouseMove: Coord is NaN', coord);
                return;
            }

            const x = coord.x - this.dragOffset.x;
            const y = coord.y - this.dragOffset.y;

            console.log('MouseMove: Moving to', { x, y });

            this.selectedElement.setAttribute('transform', `translate(${x}, ${y})`);

            // Calculate delta
            const dx = x - this.prevPlayerPos.x;
            const dy = y - this.prevPlayerPos.y;

            // Move entire route rigidly
            this.moveRoutesForPlayer(this.selectedElement.id, dx, dy);

            // Update prev pos
            this.prevPlayerPos = { x, y };
        }
    }

    moveRoutesForPlayer(playerId, dx, dy) {
        const routes = this.routesLayer.querySelectorAll(`path[data-player-id="${playerId}"]`);
        routes.forEach(route => {
            const d = route.getAttribute('d');
            // Regex to match command (M or L) followed by coordinates
            // Handles comma or space separators
            const newD = d.replace(/([ML])\s*(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/g, (match, cmd, px, py) => {
                return `${cmd}${parseFloat(px) + dx},${parseFloat(py) + dy}`;
            });
            route.setAttribute('d', newD);
        });
    }

    onMouseUp(e) {
        this.isDragging = false;
        this.selectedElement = null;
    }

    toggleRouteMode(forceState = null) {
        if (forceState !== null) {
            this.isDrawing = forceState;
        } else {
            this.isDrawing = !this.isDrawing;
        }
        this.svg.style.cursor = this.isDrawing ? 'crosshair' : 'default';
        return this.isDrawing;
    }

    onCanvasClick(e) {
        if (!this.isDrawing) return;

        const coord = this.getMousePos(e);

        // Case 1: Start Route (Click on a player)
        if (!this.currentRoute && e.target.closest('.draggable')) {
            const playerGroup = e.target.closest('.draggable');
            // Generate a unique ID for the player if not exists
            if (!playerGroup.id) playerGroup.id = 'p_' + Date.now();

            this.activePlayerId = playerGroup.id;

            // Create new path element
            this.currentRoute = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            this.currentRoute.setAttribute('class', 'route-path');
            this.currentRoute.setAttribute('d', `M${coord.x},${coord.y}`);
            this.currentRoute.dataset.playerId = this.activePlayerId;

            this.routesLayer.appendChild(this.currentRoute);
            return;
        }

        // Case 2: Continue Route (Click on field)
        if (this.currentRoute) {
            const d = this.currentRoute.getAttribute('d');
            this.currentRoute.setAttribute('d', `${d} L${coord.x},${coord.y}`);
            const arrowId = this.currentRoute.dataset.arrowId;
            const arrow = this.routesLayer.querySelector(`polygon[data-route-id="${arrowId}"]`);
            if (arrow) this.updateRouteArrow(this.currentRoute, arrow);
        }
    }

    updateRouteArrow(route, arrow) {
        // Calculate angle of last segment and position/rotate arrow
        const d = route.getAttribute('d');
        if (!d || !arrow) return;

        // Parse path commands to get last two points
        const commands = d.match(/[ML]\s*(-?\d+\.?\d*)\s*,?\s*(-?\d+\.?\d*)/g);
        if (!commands || commands.length < 2) return;

        // Get last two points
        const lastTwo = commands.slice(-2);
        const parsePoint = (cmd) => {
            const match = cmd.match(/(-?\d+\.?\d*)\s*,?\s*(-?\d+\.?\d*)/);
            return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
        };

        const p1 = parsePoint(lastTwo[0]);
        const p2 = parsePoint(lastTwo[1]);

        // Calculate angle in degrees
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

        // Position arrow at end point and rotate it
        arrow.setAttribute('transform', `translate(${p2.x}, ${p2.y}) rotate(${angle}) translate(-5, -5)`);
    }

    finishRoute() {
        this.isDrawing = false;
        this.currentRoute = null;
        this.activePlayerId = null;
        this.svg.style.cursor = 'default';
    }

    clear() {
        this.playersLayer.innerHTML = '';
        this.routesLayer.innerHTML = '';
    }

    exportData() {
        const players = [];
        this.playersLayer.childNodes.forEach(node => {
            if (node.nodeType === 1) {
                players.push({
                    id: node.id,
                    type: node.dataset.type,
                    transform: node.getAttribute('transform'),
                    color: node.dataset.color // Save color
                });
            }
        });

        const routes = [];
        this.routesLayer.childNodes.forEach(node => {
            if (node.nodeType === 1) {
                routes.push({
                    d: node.getAttribute('d'),
                    playerId: node.dataset.playerId,
                    stroke: node.style.stroke // Save route color
                });
            }
        });

        return { players, routes };
    }

    loadData(data) {
        this.clear();
        if (data.players) {
            data.players.forEach(p => {
                const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                group.setAttribute('class', 'draggable');
                group.setAttribute('transform', p.transform);
                group.dataset.type = p.type;
                if (p.id) group.id = p.id;
                if (p.color) group.dataset.color = p.color; // Restore color

                if (p.type === 'offense') {
                    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', '0');
                    circle.setAttribute('cy', '0');
                    circle.setAttribute('r', '20');
                    circle.setAttribute('fill', 'white');
                    circle.setAttribute('stroke', p.color || '#6366f1');
                    circle.setAttribute('stroke-width', '4');
                    circle.setAttribute('class', 'player-circle');
                    group.appendChild(circle);
                } else if (p.type === 'defense') {
                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', 'M-15,-15 L15,15 M15,-15 L-15,15');
                    path.setAttribute('stroke', p.color || '#ef4444');
                    path.setAttribute('stroke-width', '4');
                    path.setAttribute('class', 'player-cross');
                    group.appendChild(path);
                } else if (p.type === 'ball') {
                    const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
                    ellipse.setAttribute('rx', 8);
                    ellipse.setAttribute('ry', 12);
                    ellipse.setAttribute('class', 'ball');
                    group.appendChild(ellipse);
                }
                this.playersLayer.appendChild(group);
            });
        }

        if (data.routes) {
            data.routes.forEach(r => {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('class', 'route-path');
                path.setAttribute('d', r.d);
                if (r.playerId) path.dataset.playerId = r.playerId;
                if (r.stroke) path.style.stroke = r.stroke; // Restore route color
                this.routesLayer.appendChild(path);
            });
        }
    }
}
