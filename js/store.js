import { supabase } from './supabase.js';

export class Store {
    constructor() {
        // No local state needed, or maybe minimal caching?
        // For V1, let's fetch fresh data to ensure consistency.
    }

    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    }

    async getProfile(userId) {
        if (!userId) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return null;
        }
        return data;
    }

    // --- Playbooks ---

    async getPlaybooks() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('playbooks')
            .select('*')
            .eq('owner_id', user.id)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching playbooks:', error);
            return [];
        }
        return data.map(record => this._mapPlaybook(record));
    }

    async getPlaybook(id) {
        // We need to fetch plays with it
        const { data, error } = await supabase
            .from('playbooks')
            .select(`
                *,
                plays (*)
            `)
            .eq('id', id)
            .order('order_index', { foreignTable: 'plays', ascending: true })
            .single();

        if (error) {
            console.error('Error fetching playbook:', error);
            return null;
        }

        const mapped = this._mapPlaybook(data);
        // Ensure plays is an array (it should be handled by map, but let's be safe if join fails)
        if (!mapped.plays) mapped.plays = [];
        return mapped;
    }

    async savePlaybook(playbook) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const payload = {
            owner_id: user.id,
            title: playbook.name, // Mapping 'name' to 'title' as per schema
            team_size: playbook.teamSize, // Mapping 'teamSize' to 'team_size'
            default_formation: playbook.defaultFormation, // Add explicit column for default formation
            is_public: playbook.isPublic || false, // Handle is_public flag
            updated_at: new Date().toISOString()
        };

        if (playbook.id) {
            // Update
            const { data, error } = await supabase
                .from('playbooks')
                .update(payload)
                .eq('id', playbook.id)
                .select()
                .single();

            if (error) throw error;
            return this._mapPlaybook(data);
        } else {
            // Insert
            const { data, error } = await supabase
                .from('playbooks')
                .insert(payload)
                .select()
                .single();

            if (error) throw error;
            // The local object expects 'plays' array, but DB doesn't return joined plays on insert usually
            const mapped = this._mapPlaybook(data);
            mapped.plays = [];
            return mapped;
        }
    }

    async deletePlaybook(id) {
        const { error } = await supabase
            .from('playbooks')
            .delete()
            .eq('id', id);
        if (error) console.error('Error deleting playbook:', error);
    }

    // --- Plays ---

    async savePlay(playbookId, play) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Play object has 'formation', 'players', 'routes' inside 'data' JSONB or separate columns?
        // Schema: name, data (jsonb)
        // We pack everything else into data
        const playData = {
            formation: play.formation,
            players: play.players,
            routes: play.routes,
            icons: play.icons || [] // Include icons
        };

        const payload = {
            playbook_id: playbookId,
            name: play.name,
            description: play.description || '', // Save description
            data: playData,
            updated_at: new Date().toISOString()
        };

        if (play.order !== undefined) {
            payload.order_index = play.order;
        }

        if (play.id && !play.id.startsWith('new_')) { // Check if it's a real UUID or temp
            // Update
            const { data, error } = await supabase
                .from('plays')
                .update(payload)
                .eq('id', play.id)
                .select()
                .single();

            if (error) throw error;
            return this._mapPlay(data);
        } else {
            // Insert
            const { data, error } = await supabase
                .from('plays')
                .insert(payload)
                .select()
                .single();

            if (error) throw error;
            return this._mapPlay(data);
        }
    }

    async getPublicPlay(playId) {
        // Fetch a play by ID without user auth check (relying on RLS or public policy)
        // We technically need the playbook too to know if it is public?
        // Or if the table view allows it.
        const { data, error } = await supabase
            .from('plays')
            .select('*')
            .eq('id', playId)
            .single();

        if (error) {
            console.error('Error fetching public play:', error);
            return null;
        }
        return this._mapPlay(data);
    }

    async deletePlay(playId) {
        const { error } = await supabase
            .from('plays')
            .delete()
            .eq('id', playId);
        if (error) console.error('Error deleting play:', error);
    }

    // Helper to map DB columns back to App Property names
    _mapPlaybook(dbRecord) {
        if (!dbRecord) return null;
        return {
            id: dbRecord.id,
            name: dbRecord.title,
            teamSize: dbRecord.team_size,
            defaultFormation: dbRecord.default_formation, // Map DB column
            isPublic: dbRecord.is_public, // Map public flag
            plays: dbRecord.plays ? dbRecord.plays.map(p => this._mapPlay(p)) : []
        };
    }

    _mapPlay(dbRecord) {
        if (!dbRecord) return null;
        // dbRecord.data contains players, routes, formation
        return {
            id: dbRecord.id,
            name: dbRecord.name,
            description: dbRecord.description || '', // Map description
            order: dbRecord.order_index || 0, // Map updated column
            ...dbRecord.data
        };
    }

    async savePlayOrder(playbookId, orderedPlayIds) {
        // We need to update multiple rows. Supabase doesn't have a simple "upsert multiple with different values" 
        // that is cleaner than individual updates or a custom RPC, unless we upsert the whole object.
        // For simplicity and V1: Loop and update. (Batching would be better if many plays).

        const updates = orderedPlayIds.map((id, index) => {
            return supabase
                .from('plays')
                .update({ order_index: index, updated_at: new Date().toISOString() })
                .eq('id', id);
        });

        await Promise.all(updates);
    }
}
