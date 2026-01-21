import { UI } from './ui.js';

export class PrintModule {
    constructor(store, ui) {
        this.store = store;
        this.ui = ui;

        // Element caching
        this.printContainer = document.getElementById('print-container');
    }

    generatePrintLayout(playbook, options) {
        // Clear previous output
        this.printContainer.innerHTML = '';

        if (!playbook || !playbook.plays || playbook.plays.length === 0) {
            alert("No plays to print!");
            return;
        }

        const plays = playbook.plays;
        const layoutType = options.type; // 'wristband' or 'playbook'
        const playsPerPage = parseInt(options.playsPerPage || 8);
        const copies = parseInt(options.copies || 1);
        const gridSize = options.gridSize || 'small'; // small (3x2.25) or large (4.25x3.5) for wristbands

        console.log(`Generating Print Layout: ${layoutType}, ${playsPerPage} ppp, ${copies} copies`);

        // Create pages
        // We will create pages and fill them with plays
        // Total items to print
        let itemsToPrint = [];

        // If Playbook mode, we just print the plays 1..N
        // If Wristband mode, we can repeat plays if we implemented that filter, but for now 
        // the requirements say "Plays overview section - this will say how many plays... in future filter".
        // The requirements also say "Number of copies". This usually means copies of the whole set or copies of each?
        // "Number of copies" was under "Wristbands". 
        // Let's assume copies means copies of the generated set of wristbands (e.g. for multiple players).
        // But typically coaches want 1 sheet with 8 wristbands, maybe 5 copies of that sheet.
        // Or 1 wristband repeated?
        // "I attached an example if they select 8 plays and the playbook has 25 plays. It creates 4 of these little wristband sections."
        // This implies pagination. 
        // Let's generate the items once, then allow the user to print multiple "Copies" via the system dialog?
        // OR does "Copies" mean replicate the generated content X times in the DOM?
        // Usually "Copies" in a print dialog handles volume.
        // However, if the user wants 5 wristbands for 5 players, printing 5 copies of the document works.
        // Let's stick to generating 1 set of plays.

        // wait, "Number of copies" in the Modal implies we handle it or pass it to CSS? 
        // Browsers handle "Cols/Rows"? No.
        // Let's assume standard "Print 1 copy of the full playbook" logic for now.
        // If the user inputs 2 copies, maybe we duplicate the pages? 
        // Let's assume the user uses the browser print dialog for "Copies" unless we specifically need to montage.
        // Requirement: "Copies" was listed as an input. I'll ignore it for DOM generation and assume browser handles it, 
        // UNLESS the user wants multiple wristbands of the SAME play on one page? 
        // The example: "25 plays... creates 4 of these little wristband sections" (probably pages or strips).
        // Let's stick to: Print all plays in the playbook, paginated.

        let currentPlayIndex = 0;

        if (layoutType === 'wristband') {
            // Wristband mode: Create multiple fixed-size grid containers that fit on pages
            const containerWidth = (options.width || 3) * 96;    // Convert inches to pixels
            const containerHeight = (options.height || 2.25) * 96;

            // Calculate how many containers fit on a page (8.5" x 11" = 816px x 1056px)
            // Leave margins: 0.5in all around = 48px on each side
            const pageWidth = 8.5 * 96;
            const pageHeight = 11 * 96;
            const margin = 0.08 * 96; // Space between containers - reduced for less wasted space
            const usableWidth = pageWidth - (2 * margin);
            const usableHeight = pageHeight - (2 * margin);

            const containersPerRow = Math.max(1, Math.floor((usableWidth + margin) / (containerWidth + margin)));
            const containersPerCol = Math.max(1, Math.floor((usableHeight + margin) / (containerHeight + margin)));
            const containersPerPage = containersPerRow * containersPerCol;

            let currentPage = null;
            let containersOnPage = 0;

            while (currentPlayIndex < plays.length) {
                // Create new page if needed
                if (!currentPage || containersOnPage >= containersPerPage) {
                    currentPage = document.createElement('div');
                    currentPage.className = 'print-page';
                    this.printContainer.appendChild(currentPage);
                    containersOnPage = 0;
                }

                // Create wristband container
                const wristbandContainer = document.createElement('div');
                wristbandContainer.className = 'wristband-container';
                wristbandContainer.style.width = `${containerWidth}px`;
                wristbandContainer.style.height = `${containerHeight}px`;
                wristbandContainer.style.display = 'grid';
                wristbandContainer.style.border = '1px dashed #999';
                wristbandContainer.style.margin = `${margin}px`;
                wristbandContainer.style.boxSizing = 'border-box';

                // Calculate grid layout based on playsPerPage
                let cols, rows;
                if (playsPerPage === 8) {
                    cols = 4;
                    rows = 2;
                } else if (playsPerPage === 6) {
                    cols = 3;
                    rows = 2;
                } else if (playsPerPage === 4) {
                    cols = 2;
                    rows = 2;
                } else {
                    cols = Math.ceil(Math.sqrt(playsPerPage));
                    rows = Math.ceil(playsPerPage / cols);
                }

                wristbandContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
                wristbandContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

                // Fill the wristband container with plays
                for (let i = 0; i < playsPerPage && currentPlayIndex < plays.length; i++) {
                    const play = plays[currentPlayIndex];
                    const item = this.createPrintItem(play, layoutType, options, playsPerPage, currentPlayIndex + 1);
                    wristbandContainer.appendChild(item);
                    currentPlayIndex++;
                }

                currentPage.appendChild(wristbandContainer);
                containersOnPage++;
            }
        } else {
            // Playbook mode: Standard grid fills the page
            while (currentPlayIndex < plays.length) {
                const page = document.createElement('div');
                page.className = 'print-page';

                for (let i = 0; i < playsPerPage; i++) {
                    if (currentPlayIndex >= plays.length) break;

                    const play = plays[currentPlayIndex];
                    const item = this.createPrintItem(play, layoutType, options, playsPerPage, currentPlayIndex + 1);
                    page.appendChild(item);
                    currentPlayIndex++;
                }

                this.printContainer.appendChild(page);
            }
        }

        // Trigger Printing
        // Allow DOM to settle for scaling
        setTimeout(() => {
            window.print();
        }, 500);
    }

    createPrintItem(play, layoutType, options, playsPerPage, playNumber) {
        const item = document.createElement('div');
        item.className = `print-item ${layoutType}`;

        if (layoutType === 'wristband') {
            // Wristband cells: Fill the grid cell
            item.style.width = '100%';
            item.style.height = '100%';
            item.style.border = '1px solid #d1d5db'; // Solid light gray for inner divisions
            item.style.boxSizing = 'border-box';
            item.style.padding = '0'; // No padding to maximize play field
            item.style.fontSize = '8px'; // Smaller font for wristbands
        } else {
            // Playbook Mode: Grid based on counts
            const cols = (playsPerPage === 24) ? 4 : (playsPerPage === 12) ? 3 : 2;
            const rows = Math.ceil(playsPerPage / cols);

            const wPercent = 100 / cols;
            const hPercent = 100 / rows;

            item.style.width = `${wPercent}%`;
            item.style.height = `${hPercent}%`;
            item.style.border = '1px solid #ddd';
            item.style.padding = '2px'; // Minimal padding for playbook mode
            item.style.boxSizing = 'border-box';
        }

        // Header (Play # and Name)
        const header = document.createElement('div');
        header.className = 'print-item-header';

        // Use full name - CSS will handle truncation with text-overflow: ellipsis
        const name = play.name;

        // Header styling - split colors: dark gray for number, light gray for name
        header.style.display = 'flex';
        header.style.alignItems = 'stretch';
        header.style.gap = '0';
        header.style.overflow = 'hidden';
        header.style.setProperty('background', '#e5e7eb', 'important'); // Light gray background for title area
        header.style.borderBottom = '1px solid #d1d5db';

        // Add wristband-specific sizing - allow 2 lines of text
        if (layoutType === 'wristband') {
            header.style.fontSize = '6px';
            header.style.height = '20px'; // Taller to fit 2 lines
            header.style.minHeight = '20px';
            header.style.maxHeight = '20px';
            header.style.lineHeight = '1.3';
        } else {
            // Playbook mode - slightly larger
            header.style.fontSize = '10pt';
            header.style.height = 'auto';
            header.style.padding = '2px 0';
        }

        // Create number span with dark gray background box
        const numberSpan = document.createElement('span');
        numberSpan.textContent = playNumber; // No period after number
        numberSpan.style.flexShrink = '0';
        numberSpan.style.display = 'flex';
        numberSpan.style.alignItems = 'center';
        numberSpan.style.justifyContent = 'center';
        numberSpan.style.setProperty('background', '#4b5563', 'important'); // Dark gray box
        numberSpan.style.setProperty('color', 'white', 'important');
        numberSpan.style.fontWeight = 'bold';
        numberSpan.style.setProperty('-webkit-print-color-adjust', 'exact', 'important');
        numberSpan.style.setProperty('print-color-adjust', 'exact', 'important');

        if (layoutType === 'wristband') {
            numberSpan.style.padding = '0 4px';
            numberSpan.style.minWidth = '14px';
        } else {
            numberSpan.style.padding = '2px 8px';
            numberSpan.style.minWidth = '24px';
        }

        // Create title span with light gray background (inherited from header)
        const titleSpan = document.createElement('span');
        titleSpan.textContent = name;
        titleSpan.style.flex = '1';
        titleSpan.style.overflow = 'hidden';
        titleSpan.style.setProperty('color', '#1f2937', 'important'); // Dark text on light gray
        titleSpan.style.fontWeight = '600';

        if (layoutType === 'wristband') {
            // Allow 2 lines of text wrapping, cut off after that
            titleSpan.style.display = '-webkit-box';
            titleSpan.style.webkitLineClamp = '2';
            titleSpan.style.webkitBoxOrient = 'vertical';
            titleSpan.style.whiteSpace = 'normal'; // Allow wrapping
            titleSpan.style.textOverflow = 'ellipsis';
            titleSpan.style.paddingLeft = '4px';
            titleSpan.style.paddingRight = '2px';
            titleSpan.style.paddingTop = '2px';
            titleSpan.style.paddingBottom = '2px';
        } else {
            titleSpan.style.paddingLeft = '8px';
            titleSpan.style.paddingRight = '4px';
        }

        header.appendChild(numberSpan);
        header.appendChild(titleSpan);
        item.appendChild(header);

        // SVG Content
        // We reuse the UI helper but need to ensure it fits 100% of remaining height
        const svgContainer = document.createElement('div');
        svgContainer.style.flex = '1';
        svgContainer.style.overflow = 'hidden';
        svgContainer.style.position = 'relative';

        const svg = this.ui.createPlayPreviewSVG(play);
        // Force SVG to be responsive
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');

        // For wristbands, use fixed viewBox so field lines are consistent across all plays
        // Keep stroke scaling for better visibility when printed small
        if (layoutType === 'wristband') {
            // Use standard fixed viewBox - all plays show same field area
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

            // Scale up strokes and player icons for better visibility when printed small
            // strokeScale=2.5 for thicker lines, shapeScale=1.5 for circle/star sizing
            this.scaleStrokesForPrint(svg, 2.5, 1.5);
        } else {
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        }

        svgContainer.appendChild(svg);
        item.appendChild(svgContainer);

        return item;
    }

    /**
     * Calculate the bounding box of all content in a play
     * @param {Object} play - The play object with players and routes
     * @returns {Object} - {minX, minY, maxX, maxY}
     */
    calculatePlayBounds(play) {
        let minX = 100, minY = 70, maxX = 0, maxY = 0;

        const players = play.players || [];

        players.forEach(p => {
            // Player position
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);

            // Route points
            if (p.route && p.route.length > 0) {
                p.route.forEach(pt => {
                    minX = Math.min(minX, pt.x);
                    maxX = Math.max(maxX, pt.x);
                    minY = Math.min(minY, pt.y);
                    maxY = Math.max(maxY, pt.y);
                });
            }
        });

        // Include icons if any
        if (play.icons) {
            play.icons.forEach(icon => {
                minX = Math.min(minX, icon.x);
                maxX = Math.max(maxX, icon.x);
                minY = Math.min(minY, icon.y);
                maxY = Math.max(maxY, icon.y);
            });
        }

        // Ensure minimum size and reasonable bounds
        // Add some buffer for player circles/markers (about 2-3 units)
        const markerBuffer = 3;
        minX = Math.max(0, minX - markerBuffer);
        minY = Math.max(0, minY - markerBuffer);
        maxX = Math.min(100, maxX + markerBuffer);
        maxY = Math.min(70, maxY + markerBuffer);

        // Ensure minimum dimensions
        if (maxX - minX < 20) {
            const centerX = (minX + maxX) / 2;
            minX = centerX - 10;
            maxX = centerX + 10;
        }
        if (maxY - minY < 15) {
            const centerY = (minY + maxY) / 2;
            minY = centerY - 7.5;
            maxY = centerY + 7.5;
        }

        return { minX, minY, maxX, maxY };
    }

    /**
     * Scale up stroke widths and circle sizes for better print visibility
     * @param {SVGElement} svg - The SVG element to modify
     * @param {number} strokeScale - Scale factor for stroke widths (lines)
     * @param {number} shapeScale - Scale factor for shapes (circles, stars)
     */
    scaleStrokesForPrint(svg, strokeScale = 2.0, shapeScale = 1.3) {
        // Scale stroke-width on all elements with strokes (thicker lines)
        const elementsWithStroke = svg.querySelectorAll('line, path, polyline');
        elementsWithStroke.forEach(el => {
            const currentStroke = el.getAttribute('stroke-width');
            if (currentStroke) {
                const newStroke = parseFloat(currentStroke) * strokeScale;
                el.setAttribute('stroke-width', newStroke.toString());
            }

            // Scale stroke-dasharray to maintain proper dash proportions
            const dashArray = el.getAttribute('stroke-dasharray');
            if (dashArray) {
                const scaledDashArray = dashArray
                    .split(/[\s,]+/)
                    .map(val => (parseFloat(val) * strokeScale).toString())
                    .join(' ');
                el.setAttribute('stroke-dasharray', scaledDashArray);
            }

            // Force linecap to 'butt' to prevent rounded ends showing past arrowheads
            el.setAttribute('stroke-linecap', 'butt');
        });

        // Scale circle radii (player icons) - more modest scaling
        const circles = svg.querySelectorAll('circle');
        circles.forEach(circle => {
            const currentR = circle.getAttribute('r');
            if (currentR) {
                const newR = parseFloat(currentR) * shapeScale;
                circle.setAttribute('r', newR.toString());
            }
            // Also scale circle stroke-width
            const currentStroke = circle.getAttribute('stroke-width');
            if (currentStroke) {
                circle.setAttribute('stroke-width', (parseFloat(currentStroke) * strokeScale).toString());
            }
        });

        // Scale ellipses (if used for player icons)
        const ellipses = svg.querySelectorAll('ellipse');
        ellipses.forEach(ellipse => {
            const rx = ellipse.getAttribute('rx');
            const ry = ellipse.getAttribute('ry');
            if (rx) {
                ellipse.setAttribute('rx', (parseFloat(rx) * shapeScale).toString());
            }
            if (ry) {
                ellipse.setAttribute('ry', (parseFloat(ry) * shapeScale).toString());
            }
        });

        // Scale markers (arrowheads) modestly - 1.5x to match thicker strokes
        const markers = svg.querySelectorAll('marker');
        markers.forEach(marker => {
            const markerWidth = marker.getAttribute('markerWidth');
            const markerHeight = marker.getAttribute('markerHeight');
            const refX = marker.getAttribute('refX');
            const viewBox = marker.getAttribute('viewBox');

            // Set overflow to visible to prevent clipping
            marker.setAttribute('overflow', 'visible');

            if (markerWidth) {
                marker.setAttribute('markerWidth', (parseFloat(markerWidth) * 1.5).toString());
            }
            if (markerHeight) {
                marker.setAttribute('markerHeight', (parseFloat(markerHeight) * 1.5).toString());
            }

            // Scale the viewBox to match the scaled marker dimensions
            // This prevents the arrow content from being clipped
            if (viewBox) {
                const parts = viewBox.split(/[\s,]+/).map(parseFloat);
                if (parts.length === 4) {
                    // Scale the viewBox dimensions
                    const scaledViewBox = `${parts[0]} ${parts[1]} ${parts[2] * 1.5} ${parts[3] * 1.5}`;
                    marker.setAttribute('viewBox', scaledViewBox);
                }
            }

            // Scale the polygon/path inside the marker to match the scaled viewBox
            const polygon = marker.querySelector('polygon');
            if (polygon) {
                const points = polygon.getAttribute('points');
                if (points) {
                    const scaledPoints = points.split(/[\s,]+/)
                        .map((val, i) => (parseFloat(val) * 1.5).toString())
                        .join(' ');
                    polygon.setAttribute('points', scaledPoints);
                }
            }

            // Also scale refX/refY to match the scaled viewBox
            if (refX) {
                marker.setAttribute('refX', (parseFloat(refX) * 1.5).toString());
            }
            const refY = marker.getAttribute('refY');
            if (refY) {
                marker.setAttribute('refY', (parseFloat(refY) * 1.5).toString());
            }
        });

        // Scale image elements (football icons) - use same scale as shapes
        const images = svg.querySelectorAll('image');
        images.forEach(img => {
            const width = img.getAttribute('width');
            const height = img.getAttribute('height');
            const x = img.getAttribute('x');
            const y = img.getAttribute('y');

            if (width && height) {
                const newWidth = parseFloat(width) * shapeScale;
                const newHeight = parseFloat(height) * shapeScale;
                img.setAttribute('width', newWidth.toString());
                img.setAttribute('height', newHeight.toString());

                // Adjust position to keep centered
                if (x && y) {
                    const deltaW = (newWidth - parseFloat(width)) / 2;
                    const deltaH = (newHeight - parseFloat(height)) / 2;
                    img.setAttribute('x', (parseFloat(x) - deltaW).toString());
                    img.setAttribute('y', (parseFloat(y) - deltaH).toString());
                }
            }
        });

        // Scale polygons (primary player stars) by scaling their points around center
        const polygons = svg.querySelectorAll('polygon');
        polygons.forEach(polygon => {
            const pointsAttr = polygon.getAttribute('points');
            if (pointsAttr) {
                // Parse points
                const points = pointsAttr.trim().split(/[\s,]+/).map(parseFloat);
                if (points.length >= 4 && points.length % 2 === 0) {
                    // Calculate center
                    let cx = 0, cy = 0;
                    for (let i = 0; i < points.length; i += 2) {
                        cx += points[i];
                        cy += points[i + 1];
                    }
                    cx /= (points.length / 2);
                    cy /= (points.length / 2);

                    // Scale points around center using shapeScale
                    const scaledPoints = [];
                    for (let i = 0; i < points.length; i += 2) {
                        const sx = cx + (points[i] - cx) * shapeScale;
                        const sy = cy + (points[i + 1] - cy) * shapeScale;
                        scaledPoints.push(`${sx},${sy}`);
                    }
                    polygon.setAttribute('points', scaledPoints.join(' '));
                }
            }
        });
    }
}
