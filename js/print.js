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
            const margin = 0.25 * 96; // Space between containers
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
                wristbandContainer.style.border = '2px dashed #999';
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
            item.style.border = '1px dashed #ccc'; // Dashed borders for cutting
            item.style.boxSizing = 'border-box';
            item.style.padding = '4px'; // Padding to prevent cutoff
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
            item.style.padding = '8px'; // Padding to prevent cutoff
            item.style.boxSizing = 'border-box';
        }

        // Header (Play # and Name)
        const header = document.createElement('div');
        header.className = 'print-item-header';

        // Truncate long names - shorter for wristbands
        const maxLength = layoutType === 'wristband' ? 12 : 15;
        const name = play.name.length > maxLength ? play.name.substring(0, maxLength - 2) + '..' : play.name;

        // Add wristband-specific styling
        if (layoutType === 'wristband') {
            header.style.fontSize = '6px';
            header.style.padding = '1px 2px';
            header.style.height = '12px';
            header.style.minHeight = '12px';
            header.style.maxHeight = '12px';
            header.style.lineHeight = '1';
            header.style.overflow = 'hidden';
            header.style.whiteSpace = 'nowrap';
            header.style.setProperty('background', '#4b5563', 'important'); // Dark gray background
            header.style.setProperty('color', 'white', 'important'); // White text
            header.style.borderBottom = '1px solid #374151';
        }

        header.innerHTML = `
            <span>${playNumber}</span>
            <span>${name}</span>
        `;
        item.appendChild(header);

        // SVG Content
        // We reuse the UI helper but need to ensure it fits 100% of remaining height
        const svgContainer = document.createElement('div');
        svgContainer.style.flex = '1';
        svgContainer.style.overflow = 'hidden';
        svgContainer.style.position = 'relative';

        // Clone and simplified render
        // calls ui methods. 
        // Need to make sure `this.ui` has `createPlayPreviewSVG` accessible maybe? 
        // Or duplicate the logic to allow custom styling for print (e.g. B&W/Color/Thickness)
        // I'll assume color is fine.

        const svg = this.ui.createPlayPreviewSVG(play);
        // Force SVG to be responsive
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

        // Print optimization: Ensure strokes are thick enough
        // They are already stroke-width 3 in generic preview. Should be fine.

        svgContainer.appendChild(svg);
        item.appendChild(svgContainer);

        return item;
    }
}
