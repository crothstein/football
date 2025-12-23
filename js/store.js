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

        console.log('getPlaybooks: fetching for user', user.id);

        // Fetch owned playbooks
        const { data: ownedData, error: ownedError } = await supabase
            .from('playbooks')
            .select('*')
            .eq('owner_id', user.id)
            .order('updated_at', { ascending: false });

        if (ownedError) {
            console.error('Error fetching owned playbooks:', ownedError);
            return [];
        }

        console.log('getPlaybooks: owned playbooks count:', ownedData.length);

        // Fetch shared playbooks - use playbook_id directly
        const { data: sharedData, error: sharedError } = await supabase
            .from('playbook_shares')
            .select('playbook_id, permission')
            .eq('shared_with_user_id', user.id);

        console.log('getPlaybooks: shared data response:', sharedData, 'error:', sharedError);

        if (sharedError) {
            console.error('Error fetching shared playbooks:', sharedError);
        }

        // Combine owned playbooks (they're ready to go)
        const allPlaybooks = [
            ...ownedData.map(record => ({ ...this._mapPlaybook(record), isOwner: true }))
        ];

        // Fetch full playbook data for shared ones
        if (sharedData && sharedData.length > 0) {
            console.log('getPlaybooks: fetching full data for', sharedData.length, 'shared playbooks');
            const sharedPlaybookIds = sharedData.map(s => s.playbook_id);
            console.log('getPlaybooks: shared playbook IDs:', sharedPlaybookIds);

            const { data: sharedPlaybooks, error: sharedPlaybooksError } = await supabase
                .from('playbooks')
                .select('*')
                .in('id', sharedPlaybookIds);

            console.log('getPlaybooks: fetched shared playbooks:', sharedPlaybooks, 'error:', sharedPlaybooksError);

            if (!sharedPlaybooksError && sharedPlaybooks) {
                sharedPlaybooks.forEach(playbook => {
                    const shareInfo = sharedData.find(s => s.playbook_id === playbook.id);
                    allPlaybooks.push({
                        ...this._mapPlaybook(playbook),
                        isOwner: false,
                        sharedPermission: shareInfo?.permission || 'view'
                    });
                });
            }
        } else {
            console.log('getPlaybooks: no shared playbooks found in playbook_shares');
        }

        console.log('getPlaybooks: total playbooks:', allPlaybooks.length);
        return allPlaybooks;
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

    async getPublicPlayWithTeamSize(playId) {
        // Fetch play with its playbook to get team_size
        const { data, error } = await supabase
            .from('plays')
            .select(`
                *,
                playbook:playbooks!playbook_id (
                    team_size
                )
            `)
            .eq('id', playId)
            .single();

        if (error) {
            console.error('Error fetching public play with team size:', error);
            return null;
        }

        const mappedPlay = this._mapPlay(data);
        // Add teamSize from the joined playbook
        if (data.playbook) {
            mappedPlay.teamSize = data.playbook.team_size;
        } else {
            // Fallback: try to infer from player count
            const playerCount = mappedPlay.players?.length || 5;
            mappedPlay.teamSize = `${playerCount}v${playerCount}`;
        }

        return mappedPlay;
    }

    async deletePlay(playId) {
        const { error } = await supabase
            .from('plays')
            .delete()
            .eq('id', playId);
        if (error) console.error('Error deleting play:', error);
    }

    // Helper to map DB columns back to App Property names
    _mapPlaybook(record) {
        if (!record) return null;
        return {
            id: record.id,
            name: record.title,
            teamSize: record.team_size,
            defaultFormation: record.default_formation, // Map DB column
            isPublic: record.is_public, // Map public flag
            owner_id: record.owner_id,  // Add owner_id
            plays: record.plays ? record.plays.map(p => this._mapPlay(p)) : []
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

    // --- Playbook Sharing ---

    async sharePlaybook(playbookId, email, permission) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Check if user exists
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('email', email.toLowerCase())
            .single();

        if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
        }

        if (profiles) {
            // User exists, create share directly
            const { data, error } = await supabase
                .from('playbook_shares')
                .insert({
                    playbook_id: playbookId,
                    shared_with_user_id: profiles.id,
                    permission: permission,
                    shared_by_user_id: user.id
                })
                .select()
                .single();

            if (error) throw error;
            return { type: 'share', data };
        } else {
            // User doesn't exist, create invitation
            const { data, error } = await supabase
                .from('playbook_invitations')
                .insert({
                    playbook_id: playbookId,
                    email: email.toLowerCase(),
                    permission: permission,
                    invited_by_user_id: user.id
                })
                .select()
                .single();

            if (error) throw error;
            return { type: 'invitation', data };
        }
    }

    async updateShare(shareId, permission) {
        const { data, error } = await supabase
            .from('playbook_shares')
            .update({
                permission: permission,
                updated_at: new Date().toISOString()
            })
            .eq('id', shareId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async removeShare(shareId) {
        const { error } = await supabase
            .from('playbook_shares')
            .delete()
            .eq('id', shareId);

        if (error) throw error;
    }

    async removeInvitation(invitationId) {
        const { error } = await supabase
            .from('playbook_invitations')
            .delete()
            .eq('id', invitationId);

        if (error) throw error;
    }

    async getPlaybookShares(playbookId) {
        // Get active shares
        const { data: shares, error: sharesError } = await supabase
            .from('playbook_shares')
            .select(`
                *,
                shared_with:profiles!shared_with_user_id(*)
            `)
            .eq('playbook_id', playbookId);

        if (sharesError) {
            console.error('Error fetching shares:', sharesError);
            return { shares: [], invitations: [] };
        }

        // Get pending invitations
        const { data: invitations, error: invitationsError } = await supabase
            .from('playbook_invitations')
            .select('*')
            .eq('playbook_id', playbookId)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString());

        if (invitationsError) {
            console.error('Error fetching invitations:', invitationsError);
        }

        return {
            shares: shares || [],
            invitations: invitations || []
        };
    }

    async checkPlaybookPermission(playbookId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 'none';

        // Check if owner
        const { data: playbook } = await supabase
            .from('playbooks')
            .select('owner_id')
            .eq('id', playbookId)
            .single();

        if (playbook && playbook.owner_id === user.id) {
            return 'owner';
        }

        // Check if shared
        const { data: share } = await supabase
            .from('playbook_shares')
            .select('permission')
            .eq('playbook_id', playbookId)
            .eq('shared_with_user_id', user.id)
            .single();

        if (share) {
            return share.permission; // 'view' or 'edit'
        }

        return 'none';
    }

    async copyPlaybook(playbookId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Fetch the original playbook with all plays
        const original = await this.getPlaybook(playbookId);
        if (!original) throw new Error('Playbook not found');

        // Create new playbook
        const newPlaybook = {
            name: `${original.name} (Copy)`,
            teamSize: original.teamSize,
            defaultFormation: original.defaultFormation,
            isPublic: false // Copies are always private
        };

        const savedPlaybook = await this.savePlaybook(newPlaybook);

        // Copy all plays
        for (let i = 0; i < original.plays.length; i++) {
            const play = original.plays[i];
            const newPlay = {
                name: play.name,
                description: play.description,
                formation: play.formation,
                players: play.players,
                routes: play.routes,
                icons: play.icons,
                order: i
            };
            await this.savePlay(savedPlaybook.id, newPlay);
        }

        return savedPlaybook;
    }
}
