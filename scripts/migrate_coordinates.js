// Migration script to convert old pixel coordinates (1000x700) to new percentage coordinates (100x70)
// Run this once to fix all existing plays in the database

const SUPABASE_URL = 'https://glybtomzdelkwsbsmncq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdseWJ0b216ZGVsa3dzYnNtbmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NzM2MTgsImV4cCI6MjA4MTA0OTYxOH0.YsHg4DE-tcUiK2n5q6Fu1ysIXvwo-wXnxs8EU7Dv5-c';

async function migrateCoordinates() {
    console.log('Fetching all plays...');

    // Fetch all plays
    const response = await fetch(`${SUPABASE_URL}/rest/v1/plays?select=*`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });

    const plays = await response.json();
    console.log(`Found ${plays.length} plays to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const play of plays) {
        if (!play.data || !play.data.players) {
            console.log(`Skipping play ${play.id} - no player data`);
            skippedCount++;
            continue;
        }

        let needsMigration = false;
        const data = play.data;

        // Check if coordinates look like old system (> 100 suggests pixel coordinates)
        if (data.players.some(p => p.x > 100 || p.y > 70)) {
            needsMigration = true;
        }

        if (!needsMigration) {
            console.log(`Skipping play ${play.id} - already migrated`);
            skippedCount++;
            continue;
        }

        // Migrate players
        data.players = data.players.map(p => ({
            ...p,
            x: p.x / 10,  // 1000px → 100 units
            y: p.y / 10,  // 700px → 70 units
            route: (p.route || []).map(pt => ({
                x: pt.x / 10,
                y: pt.y / 10
            }))
        }));

        // Migrate icons if present
        if (data.icons) {
            data.icons = data.icons.map(icon => ({
                ...icon,
                x: icon.x / 10,
                y: icon.y / 10
            }));
        }

        // Update in database
        const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/plays?id=eq.${play.id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ data })
        });

        if (updateResponse.ok) {
            console.log(`✓ Migrated play ${play.id}: "${play.name}"`);
            migratedCount++;
        } else {
            console.error(`✗ Failed to migrate play ${play.id}:`, await updateResponse.text());
        }
    }

    console.log(`\n=== Migration Complete ===`);
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Total: ${plays.length}`);
}

// Run migration
migrateCoordinates().catch(console.error);
