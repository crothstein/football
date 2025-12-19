#!/usr/bin/env python3
"""
Migration script to convert old pixel coordinates (1000x700) to new percentage coordinates (100x70)
Run this once to fix all existing plays in the database
"""

import urllib.request
import urllib.error
import json

SUPABASE_URL = 'https://glybtomzdelkwsbsmncq.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdseWJ0b216ZGVsa3dzYnNtbmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzM2MTgsImV4cCI6MjA4MTA0OTYxOH0.YsHg4DE-tcUiK2n5q6Fu1ysIXvwo-wXnxs8EU7Dv5-c'

def fetch_plays():
    url = f"{SUPABASE_URL}/rest/v1/plays?select=*"
    req = urllib.request.Request(url)
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {SUPABASE_KEY}')
    
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read())

def update_play(play_id, data):
    url = f"{SUPABASE_URL}/rest/v1/plays?id=eq.{play_id}"
    req = urllib.request.Request(url, method='PATCH')
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {SUPABASE_KEY}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Prefer', 'return=minimal')
    
    data_bytes = json.dumps({'data': data}).encode('utf-8')
    
    with urllib.request.urlopen(req, data=data_bytes) as response:
        return response.status == 204

def migrate_coordinates():
    print('Fetching all plays...')
    plays = fetch_plays()
    print(f'Found {len(plays)} plays to migrate\n')
    
    migrated_count = 0
    skipped_count = 0
    
    for play in plays:
        if not play.get('data') or not play['data'].get('players'):
            print(f"Skipping play {play['id']} - no player data")
            skipped_count += 1
            continue
        
        data = play['data']
        needs_migration = False
        
        # Check if coordinates look like old system (> 100 suggests pixel coordinates)
        if any(p.get('x', 0) > 100 or p.get('y', 0) > 70 for p in data['players']):
            needs_migration = True
        
        if not needs_migration:
            print(f"Skipping play {play['id']} - already migrated")
            skipped_count += 1
            continue
        
        # Migrate players
        for player in data['players']:
            player['x'] = player.get('x', 0) / 10  # 1000px → 100 units
            player['y'] = player.get('y', 0) / 10  # 700px → 70 units
            
            # Migrate route points
            if 'route' in player and player['route']:
                player['route'] = [
                    {'x': pt.get('x', 0) / 10, 'y': pt.get('y', 0) / 10}
                    for pt in player['route']
                ]
        
        # Migrate icons if present
        if 'icons' in data and data['icons']:
            for icon in data['icons']:
                icon['x'] = icon.get('x', 0) / 10
                icon['y'] = icon.get('y', 0) / 10
        
        # Update in database
        try:
            if update_play(play['id'], data):
                print(f"✓ Migrated play {play['id']}: \"{play.get('name', 'Unnamed')}\"")
                migrated_count += 1
            else:
                print(f"✗ Failed to migrate play {play['id']}")
        except Exception as e:
            print(f"✗ Error migrating play {play['id']}: {e}")
    
    print(f'\n=== Migration Complete ===')
    print(f'Migrated: {migrated_count}')
    print(f'Skipped: {skipped_count}')
    print(f'Total: {len(plays)}')

if __name__ == '__main__':
    migrate_coordinates()
