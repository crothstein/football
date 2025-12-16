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

def generate_head(title, description, image=None):
    og_image = f'<meta property="og:image" content="{image}">' if image else ''
    return f"""
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title} | FlagSketch</title>
        <meta name="description" content="{description}">
        
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
                <a href="/play-templates/" class="nav-link">Flag Football Plays</a>
                <a href="/app.html" class="nav-link">Log In</a>
                <a href="/app.html?mode=signup" class="btn-gradient">Start Sketching Free</a>
            </nav>
        </div>
    </header>
    """

def generate_footer():
    return """
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

    scale_x = w / 800
    scale_y = h / 600

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

            # Scale stroke width so arrows remain visually consistent relative to canvas size
            # Base width 3 on 800px canvas = 0.375% factor
            # For 400px canvas, we want 1.5 width.
            stroke_width = max(1.5, 3 * scale_x)

            svg_content += f'<polyline points="{points_str}" fill="none" stroke="{color}" stroke-width="{stroke_width}" marker-end="url(#{marker_id})" />'

    # Players
    for p in players:
        cx = p['x'] * scale_x
        cy = p['y'] * scale_y
        r = 15 * scale_x
        color = p.get('color', '#3b82f6')
        
        svg_content += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{color}" stroke="white" stroke-width="2" />'
        
        if p.get('label'):
            ly = cy + (5 * scale_x)
            fs = 12 * scale_x
            svg_content += f'<text x="{cx}" y="{ly}" text-anchor="middle" fill="white" font-family="sans-serif" font-size="{fs}px" font-weight="bold">{p["label"]}</text>'

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
        cards += f"""
        <a href="/play-templates/{fmt}/{slug}/" class="playbook-card">
            <div class="pb-card-header">
                <h3>{pb['title']}</h3>
                <span class="badge">{count} Plays</span>
            </div>
            <p>{desc}</p>
        </a>
        """

    html = f"""
    <!DOCTYPE html>
    <html lang="en">
    {generate_head(
        f"Free {fmt} Flag Football Templates",
        f"Top rated {fmt} flag football plays and strategies. Customize these templates for your team."
    )}
    <body>
        {generate_nav()}
        
        <div class="breadcrumbs">
            <a href="/play-templates/">Templates</a> &gt; <span>{fmt}</span>
        </div>

        <section class="hero-small">
            <h1>{fmt} Playbooks</h1>
            <p>Verified strategies for {fmt} leagues.</p>
        </section>

        <section class="playbook-grid container">
            {cards}
        </section>

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

    play_cards = ""
    for play in plays:
        play_slug = slugify(play['name'])
        play_cards += f"""
        <a href="/play-templates/{fmt}/{pb_slug}/{play_slug}/" class="play-card-static">
            <div class="play-preview">
                {generate_svg(play)}
            </div>
            <div class="play-info">
                <h3>{play['name']}</h3>
            </div>
        </a>
        """

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
            <a href="/play-templates/">Templates</a> &gt; 
            <a href="/play-templates/{fmt}/">{fmt}</a> &gt; 
            <span>{playbook['title']}</span>
        </div>

        <section class="collection-header container">
            <h1>{playbook['title']}</h1>
            <p>Click any play to view details and customize.</p>
        </section>

        <section class="plays-masonry container">
            {play_cards}
        </section>

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
            <a href="/play-templates/">Templates</a> &gt; 
            <a href="/play-templates/{fmt}/">{fmt}</a> &gt; 
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
