#!/usr/bin/env python3
"""
Migration script for formations - convert from pixel to percentage coordinates
"""

import urllib.request
import urllib.error
import json

SUPABASE_URL = 'https://glybtomzdelkwsbsmncq.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdseWJ0b216ZGVsa3dzYnNtbmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzM2MTgsImV4cCI6MjA4MTA0OTYxOH0.YsHg4DE-tcUiK2n5q6Fu1ysIXvwo-wXnxs8EU7Dv5-c'

def fetch_formations():
    url = f"{SUPABASE_URL}/rest/v1/formations?select=*"
    req = urllib.request.Request(url)
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {SUPABASE_KEY}')
    
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read())

def update_formation(formation_id, data):
    url = f"{SUPABASE_URL}/rest/v1/formations?id=eq.{formation_id}"
    req = urllib.request.Request(url, method='PATCH')
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {SUPABASE_KEY}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Prefer', 'return=minimal')
    
    data_bytes = json.dumps({'default_formation': data}).encode('utf-8')
    
    with urllib.request.urlopen(req, data=data_bytes) as response:
        return response.status == 204

def migrate_formations():
    print('Fetching all formations...')
    formations = fetch_formations()
    print(f'Found {len(formations)} formations to migrate\n')
    
    migrated_count = 0
    skipped_count = 0
    
    for formation in formations:
        if not formation.get('default_formation') or not formation['default_formation'].get('players'):
            print(f"Skipping formation {formation['id']} - no player data")
            skipped_count += 1
            continue
        
        data = formation['default_formation']
        needs_migration = False
        
        # Check if coordinates look like old system
        if any(p.get('x', 0) > 100 or p.get('y', 0) > 70 for p in data['players']):
            needs_migration = True
        
        if not needs_migration:
            print(f"Skipping formation {formation['id']} - already migrated")
            skipped_count += 1
            continue
        
        # Migrate players
        for player in data['players']:
            player['x'] = player.get('x', 0) / 10
            player['y'] = player.get('y', 0) / 10
        
        # Update in database
        try:
            if update_formation(formation['id'], data):
                print(f"✓ Migrated formation {formation['id']}: \"{formation.get('name', 'Unnamed')}\"")
                migrated_count += 1
            else:
                print(f"✗ Failed to migrate formation {formation['id']}")
        except Exception as e:
            print(f"✗ Error migrating formation {formation['id']}: {e}")
    
    print(f'\n=== Migration Complete ===')
    print(f'Migrated: {migrated_count}')
    print(f'Skipped: {skipped_count}')
    print(f'Total: {len(formations)}')

if __name__ == '__main__':
    migrate_formations()
