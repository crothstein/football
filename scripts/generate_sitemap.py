#!/usr/bin/env python3
"""
Sitemap Generator for FlagSketch
Generates sitemap.xml by scanning all HTML files in the project
"""

import os
from datetime import datetime

BASE_URL = "https://flagsketch.com"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Priority mappings based on URL depth/importance
PRIORITY_MAP = {
    '/': '1.0',
    '/app.html': '0.9',
    '/strategy/': '0.9',
    '/play-templates/': '0.9',
    '/strategy/coaching-guides/': '0.8',
    '/strategy/offense/': '0.8',
    '/strategy/defense/': '0.8',
}

# Files/paths to exclude from sitemap
EXCLUDED_PATHS = [
    '/node_modules/',
    '/.git/',
    '/scripts/',
    '/supabase/',
]

def get_priority(url_path):
    """Get priority for a URL based on its path"""
    # Check exact matches first
    if url_path in PRIORITY_MAP:
        return PRIORITY_MAP[url_path]
    
    # Strategy articles get higher priority
    if '/strategy/' in url_path and url_path.count('/') >= 3:
        return '0.7'
    
    # Play template format pages
    if url_path.startswith('/play-templates/') and url_path.count('/') == 2:
        return '0.8'
    
    # Playbook collection pages
    if url_path.startswith('/play-templates/') and url_path.count('/') == 3:
        return '0.7'
    
    # Individual play pages (lowest priority but still important)
    if url_path.startswith('/play-templates/'):
        return '0.5'
    
    return '0.5'

def get_changefreq(url_path):
    """Get change frequency for a URL"""
    if url_path == '/':
        return 'weekly'
    if '/strategy/' in url_path:
        return 'monthly'
    if '/play-templates/' in url_path:
        return 'monthly'
    return 'monthly'

def generate_sitemap():
    """Generate sitemap.xml from all HTML files"""
    urls = []
    today = datetime.now().strftime('%Y-%m-%d')
    
    # Walk through all files
    for root, dirs, files in os.walk(BASE_DIR):
        # Skip excluded directories
        if any(excluded in root for excluded in EXCLUDED_PATHS):
            continue
        
        for file in files:
            if file.endswith('.html'):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, BASE_DIR)
                
                # Convert file path to URL
                if file == 'index.html':
                    # Directory index - use directory path
                    url_path = '/' + os.path.dirname(rel_path) + '/'
                    if url_path == '/./' or url_path == '/./':
                        url_path = '/'
                else:
                    # Regular HTML file
                    url_path = '/' + rel_path
                
                # Clean up path
                url_path = url_path.replace('//', '/')
                
                # Skip excluded paths
                if any(excluded in url_path for excluded in EXCLUDED_PATHS):
                    continue
                
                urls.append({
                    'loc': BASE_URL + url_path,
                    'lastmod': today,
                    'changefreq': get_changefreq(url_path),
                    'priority': get_priority(url_path)
                })
    
    # Sort URLs by priority (descending) then alphabetically
    urls.sort(key=lambda x: (-float(x['priority']), x['loc']))
    
    # Generate XML
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    for url in urls:
        xml_content += '  <url>\n'
        xml_content += f'    <loc>{url["loc"]}</loc>\n'
        xml_content += f'    <lastmod>{url["lastmod"]}</lastmod>\n'
        xml_content += f'    <changefreq>{url["changefreq"]}</changefreq>\n'
        xml_content += f'    <priority>{url["priority"]}</priority>\n'
        xml_content += '  </url>\n'
    
    xml_content += '</urlset>\n'
    
    # Write sitemap.xml
    sitemap_path = os.path.join(BASE_DIR, 'sitemap.xml')
    with open(sitemap_path, 'w') as f:
        f.write(xml_content)
    
    print(f"Generated sitemap.xml with {len(urls)} URLs")
    return len(urls)

if __name__ == "__main__":
    generate_sitemap()
