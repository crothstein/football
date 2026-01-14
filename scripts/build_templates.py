import os
import json
import urllib.request
import urllib.error
import re

# --- Configuration ---
SUPABASE_URL = 'https://glybtomzdelkwsbsmncq.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdseWJ0b216ZGVsa3dzYnNtbmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzM2MTgsImV4cCI6MjA4MTA0OTYxOH0.YsHg4DE-tcUiK2n5q6Fu1ysIXvwo-wXnxs8EU7Dv5-c'

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(BASE_DIR, 'play-templates')

# --- SEO Content for Format Pages ---
SEO_CONTENT = {
    '5v5': {
        'heading': 'The Essentials of 5v5 Flag Football Strategy',
        'content': '''<p>5v5 is widely considered the fastest version of flag football. Popularized by leagues like NFL Flag, this format typically eliminates contact and blocking, shifting the entire focus to speed, agility, and precise passing concepts.</p>
        
<h3>Offensive Formations</h3>
<p>Because there are no offensive linemen, every player is an eligible receiver. The most successful 5v5 plays often utilize the "Spread" or "Twins" formations to stretch the defense horizontally. Since the quarterback has a limited time to throw (usually a 7-second pass clock), quick slants, drags, and crossing routes are essential.</p>

<h3>Defensive Strategy</h3>
<p>Without blocking, defenses can be aggressive. However, missing a flag pull in 5v5 often results in a touchdown. Most teams rely on a simple Zone Defense (like a 2-3 or 3-2 zone) to keep plays in front of them, forcing the offense to make small gains rather than giving up the deep ball.</p>'''
    },
    '6v6': {
        'heading': 'How to Dominate in 6v6 Flag Football',
        'content': '''<p>The 6v6 format balances the speed of 5v5 with the complexity of larger leagues. The key differentiator in 6v6 is often the rules regarding blocking and rushing. Some leagues allow "shield blocking," while others remain non-contact.</p>

<h3>Key Offensive Concepts</h3>
<p>With an extra player on the field compared to 5v5, the Center becomes a critical position. In many 6v6 playbooks, the Center is eligible to catch a pass immediately after the snap. This creates a "check-down" safety valve for the quarterback. Successful 6v6 offenses often use "Trips" formations (three receivers on one side) to overload zone defenses.</p>

<h3>Managing the Rush</h3>
<p>In 6v6, the defensive rush is often more immediate. Quarterbacks must be mobile. Designing plays with "rollouts" or "sprint-outs" allows the QB to change the launch angle and buy time against a dedicated rusher.</p>'''
    },
    '7v7': {
        'heading': 'Mastering 7v7 Flag Football Tactics',
        'content': '''<p>7v7 is the closest format to traditional tackle football, minus the tackling. It is heavily utilized for high school development and competitive adult leagues. Because there are 14 players on the field, spacing and route running precision are paramount.</p>

<h3>Passing Concepts</h3>
<p>The field can feel crowded in 7v7. To combat this, effective playbooks rely on "High-Low" reads (like the Smash or Flood concepts) that attack a single defender at two different depths. The Quarterback needs to read the Safety's position to decide whether to throw the short "under" route or the deep "over" route.</p>

<h3>Defensive Coverages</h3>
<p>7v7 allows for complex defensive schemes. You will frequently see Man-to-Man coverage with a single high safety (Cover 1) or a traditional Cover 2 Zone. Unlike smaller formats, 7v7 defenses can disguise their coverage pre-snap, making it vital for offenses to have "audible" options at the line of scrimmage.</p>'''
    }
}

# --- Collection-Level Content (for branded/official playbooks) ---
COLLECTION_CONTENT = {
    'nfl-flag-2024-playbook-5v5': {
        'logo': '',
        'logo_local': '/images/nfl-flag-logo.png',
        'title': 'NFL Flag 2024 Official Playbook',
        'subtitle': 'The official 5-on-5 flag football playbook from NFL Flag',
        'description': '''
<div class="official-content">
    <h2>About This Playbook</h2>
    <p>This is the <strong>official NFL Flag 5-on-5 playbook</strong>—the same plays used by millions of young athletes in NFL Flag leagues around the world. Whether you're a beginner coach preparing for your first season or looking to refine your strategy, these plays are designed for all skill levels.</p>
    
    <h3>Formations Included</h3>
    <ul class="formation-list">
        <li><strong>Single Back</strong> — One receiver behind the quarterback, two on either side</li>
        <li><strong>Spread</strong> — Stretch the defense horizontally with wide receiver positioning</li>
        <li><strong>Bunch</strong> — Three receivers grouped tightly for quick releases</li>
        <li><strong>Trips</strong> — Three receivers stacked on one side to overload zones</li>
        <li><strong>Twins</strong> — Two receivers paired on each side</li>
        <li><strong>I Formation</strong> — Traditional setup with stacked backfield</li>
        <li><strong>Double Back Set</strong> — Two receivers behind the line for versatility</li>
        <li><strong>Trips Stack / Twins Stack</strong> — Stacked variations for misdirection</li>
        <li><strong>Single Set</strong> — Balanced formation for short and deep passes</li>
    </ul>
    
    <h3>Pro Tips from NFL Flag</h3>
    <ul>
        <li>Always decide which receiver moves first when paths cross to avoid collisions</li>
        <li>Practice crossing routes ahead of time to eliminate hesitation</li>
        <li>Use corner routes as safety valve options when primary receivers are covered</li>
        <li>Short yardage plays work well near the first down line</li>
    </ul>
    
    <p class="source-note">Content adapted from <a href="https://nflflag.com/coaches/flag-football-rules/5-on-5-flag-football-playbook" target="_blank" rel="noopener">NFL Flag Official Playbook</a>.</p>
</div>
''',
        'show_logo_in_cards': False
    }
}

# --- Helper Functions ---

def slugify(text):
    text = str(text).lower()
    text = re.sub(r'\s+', '-', text)
    text = re.sub(r'[^\w\-]+', '', text)
    text = re.sub(r'\-\-+', '-', text)
    return text.strip('-')

def ensure_dir(dir_path):
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)

def fetch_public_playbooks():
    url = f"{SUPABASE_URL}/rest/v1/playbooks?is_public=eq.true&select=*,plays(*)"
    req = urllib.request.Request(url)
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f"Bearer {SUPABASE_KEY}")
    
    try:
        with urllib.request.urlopen(req) as response:
            data = response.read()
            return json.loads(data)
    except urllib.error.URLError as e:
        print(f"Failed to fetch playbooks: {e}")
        return []

def generate_head(title, description, image=None, canonical=None):
    og_image = f'<meta property="og:image" content="{image}">' if image else ''
    canonical_tag = f'<link rel="canonical" href="{canonical}">' if canonical else ''
    return f"""
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title} | FlagSketch</title>
        <meta name="description" content="{description}">
        {canonical_tag}
        
        <!-- Favicon -->
        <link rel="icon" type="image/png" href="/favicon.png">
        <link rel="icon" type="image/x-icon" href="/favicon.ico">
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="website">
        <meta property="og:title" content="{title}">
        <meta property="og:description" content="{description}">
        {og_image}

        <link rel="stylesheet" href="/css/landing.css">
        <link rel="stylesheet" href="/css/templates.css">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    </head>
    """

def generate_nav():
    return """
    <header>
        <div class="header-inner">
            <div class="brand">
                <a href="/"><img src="/images/logo.png" alt="FlagSketch Logo"></a>
            </div>
            <nav class="nav-actions">
                <div class="nav-dropdown">
                    <a href="/strategy/" class="nav-link">Resources</a>
                    <div class="dropdown-menu">
                        <a href="/play-templates/">Play Templates</a>
                        <a href="/strategy/coaching-guides/">Coaching Guides</a>
                        <a href="/strategy/offense/">Offense Tips</a>
                        <a href="/strategy/defense/">Defense Tips</a>
                    </div>
                </div>
                <a href="/app.html" class="nav-link">Log In</a>
                <a href="/app.html?mode=signup" class="btn-gradient">Start Sketching Free</a>
            </nav>
        </div>
    </header>
    """

def generate_footer():
    return """
    <footer>
        <div class="footer-inner">
            <div class="footer-logo">
                <img src="/images/logo.png" alt="FlagSketch Logo">
            </div>
            <div class="footer-links">
                <a href="/play-templates/">Templates</a>
                <a href="mailto:support@flagsketch.com">Support</a>
                <a href="#">Privacy</a>
            </div>
            <div class="copyright">
                © 2026 FlagSketch. All rights reserved.
            </div>
        </div>
    </footer>
    """

def generate_svg(play, w=400, h=300):
    if not play.get('data'):
        return ''
    
    play_data = play['data']
    players = play_data.get('players', [])
    
    # Define Markers (Arrowheads) - Matching App Geometry (10x10, ref 5,5)
    # Using hex-based IDs to match App logic
    defs = """
    <defs>
        <marker id="arrowhead-6366f1" markerWidth="6" markerHeight="6" refX="5" refY="5" orient="auto" markerUnits="strokeWidth" viewBox="0 0 10 10">
            <polygon points="0 0, 10 5, 0 10" fill="#6366f1" />
        </marker>
        <marker id="arrowhead-ef4444" markerWidth="6" markerHeight="6" refX="5" refY="5" orient="auto" markerUnits="strokeWidth" viewBox="0 0 10 10">
            <polygon points="0 0, 10 5, 0 10" fill="#ef4444" />
        </marker>
        <marker id="arrowhead-22c55e" markerWidth="6" markerHeight="6" refX="5" refY="5" orient="auto" markerUnits="strokeWidth" viewBox="0 0 10 10">
            <polygon points="0 0, 10 5, 0 10" fill="#22c55e" />
        </marker>
        <marker id="arrowhead-eab308" markerWidth="6" markerHeight="6" refX="5" refY="5" orient="auto" markerUnits="strokeWidth" viewBox="0 0 10 10">
            <polygon points="0 0, 10 5, 0 10" fill="#eab308" />
        </marker>
        <marker id="arrowhead-ec4899" markerWidth="6" markerHeight="6" refX="5" refY="5" orient="auto" markerUnits="strokeWidth" viewBox="0 0 10 10">
            <polygon points="0 0, 10 5, 0 10" fill="#ec4899" />
        </marker>
        <marker id="arrowhead-06b6d4" markerWidth="6" markerHeight="6" refX="5" refY="5" orient="auto" markerUnits="strokeWidth" viewBox="0 0 10 10">
            <polygon points="0 0, 10 5, 0 10" fill="#06b6d4" />
        </marker>
        <marker id="arrowhead-1f2937" markerWidth="6" markerHeight="6" refX="5" refY="5" orient="auto" markerUnits="strokeWidth" viewBox="0 0 10 10">
            <polygon points="0 0, 10 5, 0 10" fill="#1f2937" />
        </marker>
        <marker id="arrowhead-333333" markerWidth="6" markerHeight="6" refX="5" refY="5" orient="auto" markerUnits="strokeWidth" viewBox="0 0 10 10">
            <polygon points="0 0, 10 5, 0 10" fill="#333333" />
        </marker>
        <marker id="arrowhead-ffffff" markerWidth="6" markerHeight="6" refX="5" refY="5" orient="auto" markerUnits="strokeWidth" viewBox="0 0 10 10">
            <polygon points="0 0, 10 5, 0 10" fill="#ffffff" />
        </marker>
    </defs>
    """

    svg_content = f'<rect width="{w}" height="{h}" fill="#f9fafb" />'
    svg_content += defs
    
    # Draw Lines (Field)
    lines = [0.25 * h, 0.5 * h, 0.75 * h]
    for i, y in enumerate(lines):
        stroke = '#9ca3af' if i == 1 else '#e5e7eb'
        width = 4 if i == 1 else 2
        # Use full width
        svg_content += f'<line x1="0" y1="{y}" x2="{w}" y2="{y}" stroke="{stroke}" stroke-width="{width}" />'

    # MIGRATION: Convert pixel coordinates (1000×700) to percentage (100×70)
    # Check if coordinates need migration
    needs_migration = False
    for p in players:
        if p.get('x', 0) > 100 or p.get('y', 0) > 70:
            needs_migration = True
            break
    
    if needs_migration:
        # Migrate player coordinates
        for p in players:
            p['x'] = p['x'] / 10
            p['y'] = p['y'] / 10
            if p.get('route'):
                p['route'] = [{'x': pt['x'] / 10, 'y': pt['y'] / 10} for pt in p['route']]
        
        # Migrate icon coordinates
        icons = play_data.get('icons', []) # Re-fetch icons after potential modification
        for icon in icons:
            icon['x'] = icon['x'] / 10
            icon['y'] = icon['y'] / 10
    
    # Now work with percentage coordinates (100×70)
    scale_x = w / 100  # New percentage-based scaling
    scale_y = h / 70

    # Routes
    for p in players:
        route = p.get('route', [])
        if route:
            points_str = f"{p['x'] * scale_x},{p['y'] * scale_y}"
            for pt in route:
                points_str += f" {pt['x'] * scale_x},{pt['y'] * scale_y}"
            
            color = p.get('color', '#1f2937')
            # Handle hex without hash
            color_hex = color.replace('#', '')
            
            # Map fallback colors if legacy data or unknown
            # Simple check: if we have a definition for it, use it. Else default to 1f2937 (black)
            # Since we defined specific IDs, we must ensure the color matches specifically.
            # But users might have slightly different hexes if we ever added a color picker?
            # For now, let's assume standard palette or strict mapping.
            
            # Known palette hexes
            known_hexes = [
                "6366f1", "ef4444", "22c55e", "eab308", "ec4899", "06b6d4", "1f2937", "333333", "ffffff"
            ]
            
            marker_id = f"arrowhead-{color_hex}"
            if color_hex not in known_hexes:
                # Fallback mapping or generate new marker?
                # Generating new marker dynamically inside loop without dupe check is messy for string concat.
                # Let's map to closest or default black.
                marker_id = "arrowhead-1f2937" 

            # Scale stroke width for visibility (use original viewport scale for sizes)
            # Since coordinates are now 0-100, but sizes should still be relative to viewport
            stroke_width = max(1.5, 3 * (w / 1000))  # Use original scale for stroke width

            svg_content += f'<polyline points="{points_str}" fill="none" stroke="{color}" stroke-width="{stroke_width}" marker-end="url(#{marker_id})" />'

    # Players
    for p in players:
        cx = p['x'] * scale_x
        cy = p['y'] * scale_y
        r = 15 * (w / 1000)  # Use original viewport scale for radius, not percentage scale
        color = p.get('color', '#3b82f6')
        
        svg_content += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{color}" stroke="white" stroke-width="2" />'
        
        if p.get('label'):
            ly = cy + (5 * (w / 1000))  # Use original scale
            fs = 12 * (w / 1000)  # Use original scale
            svg_content += f'<text x="{cx}" y="{ly}" text-anchor="middle" fill="white" font-family="sans-serif" font-size="{fs}px" font-weight="bold">{p["label"]}</text>'
    
    # Icons (footballs/fake footballs)
    icons = play_data.get('icons', [])
    for icon in icons:
        icon_x = icon['x'] * scale_x
        icon_y = icon['y'] * scale_y
        icon_type = icon.get('type', 'football')
        image_src = '/images/football.png' if icon_type == 'football' else '/images/fake_football.png'
        
        # Match the 60px size from editor (use original scale)
        icon_size = 60 * (w / 1000)  # Use original viewport scale
        half_size = icon_size / 2
        
        svg_content += f'<image href="{image_src}" x="{icon_x - half_size}" y="{icon_y - half_size}" width="{icon_size}" height="{icon_size}" />'

    return f'<svg viewBox="0 0 {w} {h}" width="100%" height="auto">{svg_content}</svg>'

# --- Page Generators ---

def generate_main_hub(formats):
    format_cards = ""
    for fmt in formats:
        format_cards += f"""
        <a href="/play-templates/{fmt}/" class="format-card">
            <h2>{fmt}</h2>
            <p>Standard Rules</p>
            <span class="btn-text">Browse Plays &rarr;</span>
        </a>
        """

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    {generate_head(
        "Free Flag Football Play Templates", 
        "Browse our library of free editable flag football plays for 5v5, 6v6, 7v7 and more."
    )}
    <body>
        {generate_nav()}
        
        <div class="breadcrumbs">
            <a href="/">Home</a> &gt; 
            <a href="/strategy/">Strategy</a> &gt; 
            <span>Play Templates</span>
        </div>
        
        <section class="hero-small">
            <h1>Winning Plays for Every League.</h1>
            <p>Select your format to start browsing free templates.</p>
        </section>

        <section class="template-format-grid">
            {format_cards}
        </section>

        {generate_footer()}
    </body>
    </html>
    """
    
    ensure_dir(OUTPUT_DIR)
    with open(os.path.join(OUTPUT_DIR, 'index.html'), 'w') as f:
        f.write(html)
    print('Generated Main Hub')

def generate_format_page(fmt, playbooks):
    cards = ""
    for pb in playbooks:
        slug = slugify(pb['title'])
        count = len(pb.get('plays', []))
        desc = pb.get('description') or 'A collection of plays designed for success.'
        
        # Check if this playbook has a logo (official playbook)
        collection_data = COLLECTION_CONTENT.get(slug, {})
        logo_url = collection_data.get('logo_local', '')
        
        logo_badge = ""
        card_class = "playbook-card"
        if logo_url:
            logo_badge = f'<img src="{logo_url}" alt="Official" class="card-logo-badge">'
            card_class = "playbook-card official-card"
        
        cards += f"""
        <a href="/play-templates/{fmt}/{slug}/" class="{card_class}">
            {logo_badge}
            <div class="pb-card-header">
                <h3>{pb['title']}</h3>
                <span class="badge">{count} Plays</span>
            </div>
            <p>{desc}</p>
        </a>
        """
    
    # Get SEO content for this format
    seo_data = SEO_CONTENT.get(fmt, {})
    seo_section = ""
    if seo_data:
        seo_section = f"""
        <section class="seo-content">
            <div class="seo-content-inner">
                <h2>{seo_data['heading']}</h2>
                {seo_data['content']}
            </div>
        </section>
        """
    
    canonical_url = f"https://flagsketch.com/play-templates/{fmt}/"

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    {generate_head(
        f"Free {fmt} Flag Football Templates",
        f"Top rated {fmt} flag football plays and strategies. Customize these templates for your team.",
        None,
        canonical_url
    )}
    <body>
        {generate_nav()}
        
        <div class="breadcrumbs">
            <a href="/">Home</a> &gt; <a href="/strategy/">Strategy</a> &gt; <a href="/play-templates/">Play Templates</a> &gt; <span>{fmt} Plays</span>
        </div>

        <section class="hero-small">
            <h1>{fmt} Playbooks</h1>
            <p>Verified strategies for {fmt} leagues.</p>
        </section>

        <section class="playbook-grid container">
            {cards}
        </section>

        {seo_section}

        {generate_footer()}
    </body>
    </html>
    """
    
    dir_path = os.path.join(OUTPUT_DIR, fmt)
    ensure_dir(dir_path)
    with open(os.path.join(dir_path, 'index.html'), 'w') as f:
        f.write(html)
    print(f'Generated Format Page: {fmt}')

def generate_collection_page(fmt, playbook):
    pb_slug = slugify(playbook['title'])
    plays = playbook.get('plays', [])
    plays.sort(key=lambda x: x.get('order_index', 0))
    
    # Check for collection-specific content
    collection_data = COLLECTION_CONTENT.get(pb_slug, {})
    
    # Determine if this is an official/branded playbook
    is_official = bool(collection_data)
    custom_title = collection_data.get('title', playbook['title'])
    custom_subtitle = collection_data.get('subtitle', 'Click any play to view details and customize.')
    custom_description = collection_data.get('description', '')
    show_logo = collection_data.get('show_logo_in_cards', False)
    logo_url = collection_data.get('logo_local', '')

    play_cards = ""
    for play in plays:
        play_slug = slugify(play['name'])
        play_cards += f"""
        <a href="/play-templates/{fmt}/{pb_slug}/{play_slug}/" class="play-card-static">
            <div class="play-info">
                <h3>{play['name']}</h3>
            </div>
            <div class="play-preview">
                {generate_svg(play)}
            </div>
        </a>
        """
    
    # Build header section (with optional logo)
    header_logo = ""
    if is_official and logo_url:
        header_logo = f'<img src="{logo_url}" alt="{custom_title} Logo" class="collection-logo">'
    
    header_class = "collection-header official" if is_official else "collection-header"

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    {generate_head(
        f"{playbook['title']} - {fmt} Templates",
        f"Free {fmt} plays from the {playbook['title']} collection."
    )}
    <body>
        {generate_nav()}
        
        <div class="breadcrumbs">
            <a href="/">Home</a> &gt; 
            <a href="/strategy/">Strategy</a> &gt; 
            <a href="/play-templates/">Play Templates</a> &gt; 
            <a href="/play-templates/{fmt}/">{fmt} Plays</a> &gt; 
            <span>{playbook['title']}</span>
        </div>

        <section class="{header_class} container">
            {header_logo}
            <h1>{custom_title}</h1>
            <p>{custom_subtitle}</p>
        </section>

        <section class="plays-masonry container">
            {play_cards}
        </section>
        
        {f'<section class="collection-content container">{custom_description}</section>' if custom_description else ''}

        {generate_footer()}
    </body>
    </html>
    """
    
    dir_path = os.path.join(OUTPUT_DIR, fmt, pb_slug)
    ensure_dir(dir_path)
    with open(os.path.join(dir_path, 'index.html'), 'w') as f:
        f.write(html)
    print(f"Generated Collection Page: {playbook['title']}")

def generate_detail_page(fmt, playbook, play):
    pb_slug = slugify(playbook['title'])
    play_slug = slugify(play['name'])
    
    schema = {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": f"{play['name']} - {fmt} Play Template",
        "learningResourceType": "Template",
        "genre": "Flag Football Strategy",
        "description": f"An editable {fmt} flag football template: {play['name']}. Customize this play in FlagSketch.",
        "isBasedOn": f"https://flagsketch.com/app.html?template_id={play['id']}",
        "author": {
            "@type": "Organization",
            "name": "FlagSketch"
        }
    }
    
    breadcrumb_schema = {
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
                "name": "Strategy",
                "item": "https://flagsketch.com/strategy/"
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": "Play Templates",
                "item": "https://flagsketch.com/play-templates/"
            },
            {
                "@type": "ListItem",
                "position": 4,
                "name": f"{fmt} Plays",
                "item": f"https://flagsketch.com/play-templates/{fmt}/"
            },
            {
                "@type": "ListItem",
                "position": 5,
                "name": playbook['title'],
                "item": f"https://flagsketch.com/play-templates/{fmt}/{pb_slug}/"
            },
            {
                "@type": "ListItem",
                "position": 6,
                "name": play['name']
            }
        ]
    }

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    {generate_head(
        f"{play['name']} - {fmt} Play Template",
        f"{play['name']} is a {fmt} flag football play. Edit and print this template for free."
    )}
    <body>
        {generate_nav()}
        
        <div class="breadcrumbs">
            <a href="/">Home</a> &gt; 
            <a href="/strategy/">Strategy</a> &gt; 
            <a href="/play-templates/">Play Templates</a> &gt; 
            <a href="/play-templates/{fmt}/">{fmt} Plays</a> &gt; 
            <a href="/play-templates/{fmt}/{pb_slug}/">{playbook['title']}</a> &gt; 
            <span>{play['name']}</span>
        </div>

        <div class="detail-layout container">
            <div class="detail-visual">
                <div class="large-preview-box">
                    {generate_svg(play, 800, 600)}
                </div>
            </div>
            <div class="detail-sidebar">
                <h1>{play['name']}</h1>
                <p class="description">
                    This is a standard <strong>{fmt}</strong> play from the <strong>{playbook['title']}</strong> collection. 
                    {play.get('description') or ''}
                </p>
                
                <div class="cta-box">
                    <a href="/app.html?template_id={play['id']}" class="btn-gradient btn-block">Customize Template</a>
                    <p class="small-text">Opens in the FlagSketch Editor</p>
                    
                    <button class="btn-outline-block" onclick="window.print()">Print Play</button>
                </div>
            </div>
        </div>

        <script type="application/ld+json">
            {json.dumps(schema, indent=2)}
        </script>
        <script type="application/ld+json">
            {json.dumps(breadcrumb_schema, indent=2)}
        </script>

        {generate_footer()}
    </body>
    </html>
    """
    
    dir_path = os.path.join(OUTPUT_DIR, fmt, pb_slug, play_slug)
    ensure_dir(dir_path)
    with open(os.path.join(dir_path, 'index.html'), 'w') as f:
        f.write(html)

def main():
    print("Starting Build (Python)...")
    playbooks = fetch_public_playbooks()
    print(f"Found {len(playbooks)} public playbooks.")

    by_format = {}
    for pb in playbooks:
        fmt = pb.get('team_size') or '5v5'
        if 'v' not in fmt:
            fmt = f"{fmt}v{fmt}"
        
        if fmt not in by_format:
            by_format[fmt] = []
        by_format[fmt].append(pb)
    
    formats = sorted(by_format.keys())
    
    # 1. Main Hub
    generate_main_hub(formats)
    
    for fmt in formats:
        collections = by_format[fmt]
        
        # 2. Format Page
        generate_format_page(fmt, collections)
        
        for pb in collections:
            # 3. Collection Page
            generate_collection_page(fmt, pb)
            
            # 4. Detail Pages
            if pb.get('plays'):
                for play in pb['plays']:
                    generate_detail_page(fmt, pb, play)
    
    print("Build Complete!")

if __name__ == "__main__":
    main()
