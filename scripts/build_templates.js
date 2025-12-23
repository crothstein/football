const fs = require('fs');
const path = require('path');

// --- Configuration ---
const SUPABASE_URL = 'https://glybtomzdelkwsbsmncq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdseWJ0b216ZGVsa3dzYnNtbmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzM2MTgsImV4cCI6MjA4MTA0OTYxOH0.YsHg4DE-tcUiK2n5q6Fu1ysIXvwo-wXnxs8EU7Dv5-c';

const OUTPUT_DIR = path.join(__dirname, '../play-templates');

// --- Helper Functions ---

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

async function fetchPublicPlaybooks() {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/playbooks?is_public=eq.true&select=*,plays(*)`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch playbooks: ${response.statusText}`);
    }

    return await response.json();
}

function generateHead(title, description, image, canonical) {
    return `
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} | FlagSketch</title>
        <meta name="description" content="${description}">
        ${canonical ? `<link rel="canonical" href="${canonical}">` : ''}
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="website">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        ${image ? `<meta property="og:image" content="${image}">` : ''}

        <link rel="stylesheet" href="/css/landing.css">
        <link rel="stylesheet" href="/css/templates.css">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    </head>
    `;
}

// --- SEO Content for Format Pages ---
const SEO_CONTENT = {
    '5v5': {
        heading: 'The Essentials of 5v5 Flag Football Strategy',
        content: `<p>5v5 is widely considered the fastest version of flag football. Popularized by leagues like NFL Flag, this format typically eliminates contact and blocking, shifting the entire focus to speed, agility, and precise passing concepts.</p>
        
<h3>Offensive Formations</h3>
<p>Because there are no offensive linemen, every player is an eligible receiver. The most successful 5v5 plays often utilize the "Spread" or "Twins" formations to stretch the defense horizontally. Since the quarterback has a limited time to throw (usually a 7-second pass clock), quick slants, drags, and crossing routes are essential.</p>

<h3>Defensive Strategy</h3>
<p>Without blocking, defenses can be aggressive. However, missing a flag pull in 5v5 often results in a touchdown. Most teams rely on a simple Zone Defense (like a 2-3 or 3-2 zone) to keep plays in front of them, forcing the offense to make small gains rather than giving up the deep ball.</p>`
    },
    '6v6': {
        heading: 'How to Dominate in 6v6 Flag Football',
        content: `<p>The 6v6 format balances the speed of 5v5 with the complexity of larger leagues. The key differentiator in 6v6 is often the rules regarding blocking and rushing. Some leagues allow "shield blocking," while others remain non-contact.</p>

<h3>Key Offensive Concepts</h3>
<p>With an extra player on the field compared to 5v5, the Center becomes a critical position. In many 6v6 playbooks, the Center is eligible to catch a pass immediately after the snap. This creates a "check-down" safety valve for the quarterback. Successful 6v6 offenses often use "Trips" formations (three receivers on one side) to overload zone defenses.</p>

<h3>Managing the Rush</h3>
<p>In 6v6, the defensive rush is often more immediate. Quarterbacks must be mobile. Designing plays with "rollouts" or "sprint-outs" allows the QB to change the launch angle and buy time against a dedicated rusher.</p>`
    },
    '7v7': {
        heading: 'Mastering 7v7 Flag Football Tactics',
        content: `<p>7v7 is the closest format to traditional tackle football, minus the tackling. It is heavily utilized for high school development and competitive adult leagues. Because there are 14 players on the field, spacing and route running precision are paramount.</p>

<h3>Passing Concepts</h3>
<p>The field can feel crowded in 7v7. To combat this, effective playbooks rely on "High-Low" reads (like the Smash or Flood concepts) that attack a single defender at two different depths. The Quarterback needs to read the Safety's position to decide whether to throw the short "under" route or the deep "over" route.</p>

<h3>Defensive Coverages</h3>
<p>7v7 allows for complex defensive schemes. You will frequently see Man-to-Man coverage with a single high safety (Cover 1) or a traditional Cover 2 Zone. Unlike smaller formats, 7v7 defenses can disguise their coverage pre-snap, making it vital for offenses to have "audible" options at the line of scrimmage.</p>`
    }
};

function generateNav() {
    return `
    <header>
        <div class="header-inner">
            <div class="brand">
                <a href="/"><img src="/images/logo.png" alt="FlagSketch Logo"></a>
            </div>
            <nav class="nav-actions">
                <div class="nav-dropdown">
                    <a href="/play-templates/" class="nav-link">Flag Football Plays</a>
                    <div class="dropdown-menu">
                        <a href="/play-templates/5v5/">5v5 Flag Football Plays</a>
                        <a href="/play-templates/6v6/">6v6 Flag Football Plays</a>
                        <a href="/play-templates/7v7/">7v7 Flag Football Plays</a>
                    </div>
                </div>
                <a href="/app.html" class="nav-link">Log In</a>
                <a href="/app.html?mode=signup" class="btn-gradient">Start Sketching Free</a>
            </nav>
        </div>
    </header>
    `;
}

function generateFooter() {
    return `
    <footer>
        <div class="footer-logo">
            <img src="/images/logo.png" alt="FlagSketch Logo">
        </div>
        <div class="footer-links">
            <a href="/play-templates/">Templates</a>
            <a href="#">Support</a>
            <a href="#">Privacy</a>
        </div>
        <div class="copyright">
            © 2025 FlagSketch. All rights reserved.
        </div>
    </footer>
    `;
}

// --- Page Generators ---

function generateMainHub(formats) {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    ${generateHead(
        "Free Flag Football Play Templates",
        "Browse our library of free editable flag football plays for 5v5, 6v6, 7v7 and more."
    )}
    <body>
        ${generateNav()}
        
        <section class="hero-small">
            <h1>Winning Plays for Every League.</h1>
            <p>Select your format to start browsing free templates.</p>
        </section>

        <section class="template-format-grid">
            ${formats.map(fmt => `
                <a href="/play-templates/${fmt}/" class="format-card">
                    <h2>${fmt}</h2>
                    <p>Standard Rules</p>
                    <span class="btn-text">Browse Plays &rarr;</span>
                </a>
            `).join('')}
        </section>

        ${generateFooter()}
    </body>
    </html>
    `;

    ensureDir(OUTPUT_DIR);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html);
    console.log('Generated Main Hub');
}

function generateFormatPage(format, playbooks) {
    const seoData = SEO_CONTENT[format];
    const canonicalUrl = `https://flagsketch.com/play-templates/${format}/`;

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    ${generateHead(
        `Free ${format} Flag Football Templates`,
        `Top rated ${format} flag football plays and strategies. Customize these templates for your team.`,
        null,
        canonicalUrl
    )}
    <body>
        ${generateNav()}
        
        <div class="breadcrumbs">
            <a href="/">Home</a> &gt; <a href="/play-templates/">Flag Football Plays</a> &gt; <span>${format} Plays</span>
        </div>

        <section class="hero-small">
            <h1>${format} Playbooks</h1>
            <p>Verified strategies for ${format} leagues.</p>
        </section>

        <section class="playbook-grid container">
            ${playbooks.map(pb => `
                <a href="/play-templates/${format}/${slugify(pb.title)}/" class="playbook-card">
                    <div class="pb-card-header">
                        <h3>${pb.title}</h3>
                        <span class="badge">${pb.plays.length} Plays</span>
                    </div>
                    <p>${pb.description || 'A collection of plays designed for success.'}</p>
                </a>
            `).join('')}
        </section>

        ${seoData ? `
        <section class="seo-content">
            <div class="seo-content-inner">
                <h2>${seoData.heading}</h2>
                ${seoData.content}
            </div>
        </section>
        ` : ''}

        ${generateFooter()}
    </body>
    </html>
    `;

    const dir = path.join(OUTPUT_DIR, format);
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    console.log(`Generated Format Page: ${format}`);
}

function generateCollectionPage(format, playbook) {
    const pbSlug = slugify(playbook.title);

    // Sort plays by order_index
    const plays = (playbook.plays || []).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    ${generateHead(
        `${playbook.title} - ${format} Templates`,
        `Free ${format} plays from the ${playbook.title} collection.`
    )}
    <body>
        ${generateNav()}
        
        <div class="breadcrumbs">
            <a href="/">Home</a> &gt; 
            <a href="/play-templates/">Flag Football Plays</a> &gt; 
            <a href="/play-templates/${format}/">${format} Plays</a> &gt; 
            <span>${playbook.title}</span>
        </div>

        <section class="collection-header">
            <h1>${playbook.title}</h1>
            <p>Click any play to view details and customize.</p>
        </section>

        <section class="plays-masonry container">
            ${plays.map(play => `
                <a href="/play-templates/${format}/${pbSlug}/${slugify(play.name)}" class="play-card-static">
                    <div class="play-info">
                        <h3>${play.name}</h3>
                    </div>
                    <div class="play-preview">
                        ${generateSVG(play)}
                    </div>
                </a>
            `).join('')}
        </section>

        ${generateFooter()}
    </body>
    </html>
    `;

    const dir = path.join(OUTPUT_DIR, format, pbSlug);
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, 'index.html'), html);
    console.log(`Generated Collection Page: ${playbook.title}`);
}

function generateDetailPage(format, playbook, play) {
    const pbSlug = slugify(playbook.title);
    const playSlug = slugify(play.name);

    // JSON-LD Schema for CreativeWork
    const schema = {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": `${play.name} - ${format} Play Template`,
        "learningResourceType": "Template",
        "genre": "Flag Football Strategy",
        "description": `An editable ${format} flag football template: ${play.name}. Customize this play in FlagSketch.`,
        "isBasedOn": `https://flagsketch.com/app.html?template_id=${play.id}`,
        "author": {
            "@type": "Organization",
            "name": "FlagSketch"
        }
    };

    // JSON-LD Schema for Breadcrumbs
    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://flagsketch.com/"
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Flag Football Plays",
                "item": "https://flagsketch.com/play-templates/"
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": `${format} Plays`,
                "item": `https://flagsketch.com/play-templates/${format}/`
            },
            {
                "@type": "ListItem",
                "position": 4,
                "name": playbook.title,
                "item": `https://flagsketch.com/play-templates/${format}/${pbSlug}/`
            },
            {
                "@type": "ListItem",
                "position": 5,
                "name": play.name
            }
        ]
    };

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    ${generateHead(
        `${play.name} - ${format} Play Template`,
        `${play.name} is a ${format} flag football play. Edit and print this template for free.`
    )}
    <body>
        ${generateNav()}
        
        <div class="breadcrumbs">
            <a href="/">Home</a> &gt; 
            <a href="/play-templates/">Flag Football Plays</a> &gt; 
            <a href="/play-templates/${format}/">${format} Plays</a> &gt; 
            <a href="/play-templates/${format}/${pbSlug}/">${playbook.title}</a> &gt; 
            <span>${play.name}</span>
        </div>

        <div class="detail-layout container">
            <div class="detail-visual">
                <div class="large-preview-box">
                    ${generateSVG(play, 800, 600)}
                </div>
            </div>
            <div class="detail-sidebar">
                <h1>${play.name}</h1>
                <p class="description">
                    This is a standard <strong>${format}</strong> play from the <strong>${playbook.title}</strong> collection.
                    The design focuses on creating space and isolating defenders.
                </p>
                
                <div class="cta-box">
                    <a href="/app.html?template_id=${play.id}" class="btn-gradient btn-block">Customize Template</a>
                    <p class="small-text">Opens in the FlagSketch Editor</p>
                    
                    <button class="btn-outline-block" onclick="window.print()">Print Play</button>
                </div>
            </div>
        </div>

        <script type="application/ld+json">
            ${JSON.stringify(schema, null, 2)}
        </script>
        <script type="application/ld+json">
            ${JSON.stringify(breadcrumbSchema, null, 2)}
        </script>

        ${generateFooter()}
    </body>
    </html>
    `;

    const dir = path.join(OUTPUT_DIR, format, pbSlug); // Files live in collection dir
    // But wait, user wants /play-templates/5v5/collection/play-name
    // So the file should be play-name (no extension if configuring server, but simpler: play-name.html OR play-name/index.html)
    // For clean URLs with simple hosting, play-name/index.html is safest.

    // BUT the spec says: /play-templates/5v5/nfl-flag-official/center-streak
    // We should create a directory `center-streak` and put `index.html` inside.
    const playDir = path.join(dir, playSlug);
    ensureDir(playDir);
    fs.writeFileSync(path.join(playDir, 'index.html'), html);
    // console.log(`Generated Detail Page: ${play.name}`);
}

// Minimal SVG generator for server-side (string concatenation)
function generateSVG(play, w = 400, h = 300) {
    if (!play.data) return '';

    const players = play.data.players || [];
    const routes = play.data.routes || []; // If distinct, otherwise routes might be in players

    let svgContent = `<rect width="${w}" height="${h}" fill="#f9fafb" />`;

    // Draw Lines
    const lineY = [0.25 * h, 0.5 * h, 0.75 * h];
    lineY.forEach((y, i) => {
        const stroke = i === 1 ? '#9ca3af' : '#e5e7eb';
        const width = i === 1 ? 4 : 2;
        svgContent += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${stroke}" stroke-width="${width}" />`;
    });

    // We assume coordinates are based on 800x600. Scale if needed.
    const scaleX = w / 800;
    const scaleY = h / 600;

    // Routes (from players usually)
    players.forEach(p => {
        if (p.route && p.route.length) {
            let points = `${p.x * scaleX},${p.y * scaleY}`;
            p.route.forEach(pt => {
                points += ` ${pt.x * scaleX},${pt.y * scaleY}`;
            });
            svgContent += `<polyline points="${points}" fill="none" stroke="${p.color || '#333'}" stroke-width="3" />`;
        }
    });

    // Players
    players.forEach(p => {
        svgContent += `<circle cx="${p.x * scaleX}" cy="${p.y * scaleY}" r="${15 * scaleX}" fill="${p.color || '#3b82f6'}" stroke="white" stroke-width="2" />`;
        if (p.label) {
            svgContent += `<text x="${p.x * scaleX}" y="${(p.y * scaleY) + (5 * scaleX)}" text-anchor="middle" fill="white" font-family="sans-serif" font-size="${12 * scaleX}px" font-weight="bold">${p.label}</text>`;
        }
    });

    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="auto">${svgContent}</svg>`;
}

// --- Main Execution ---

async function build() {
    console.log('Starting Build...');

    try {
        const playbooks = await fetchPublicPlaybooks();
        console.log(`Found ${playbooks.length} public playbooks.`);

        // Group by Team Size (Format)
        // Normalize "5" -> "5v5"
        const byFormat = {};

        playbooks.forEach(pb => {
            let fmt = pb.team_size || '5v5';
            if (!fmt.includes('v')) fmt = `${fmt}v${fmt}`; // 5 -> 5v5

            if (!byFormat[fmt]) byFormat[fmt] = [];
            byFormat[fmt].push(pb);
        });

        const formats = Object.keys(byFormat).sort();

        // 1. Generate Main Hub
        generateMainHub(formats);

        for (const fmt of formats) {
            const collections = byFormat[fmt];

            // 2. Generate Format Page
            generateFormatPage(fmt, collections);

            for (const pb of collections) {
                // 3. Generate Collection Page
                generateCollectionPage(fmt, pb);

                // 4. Generate Detail Pages
                if (pb.plays) {
                    for (const play of pb.plays) {
                        generateDetailPage(fmt, pb, play);
                    }
                }
            }
        }

        console.log('Build Complete! Files written to /play-templates');

    } catch (err) {
        console.error('Build Failed:', err);
    }
}

build();
