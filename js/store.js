export class Store {
    constructor() {
        this.STORAGE_KEY = 'playmaker_playbooks';
        this.LEGACY_KEY = 'playmaker_plays';
        this.migrateLegacyPlays();
    }

    migrateLegacyPlays() {
        const legacyPlaysJson = localStorage.getItem(this.LEGACY_KEY);
        if (legacyPlaysJson) {
            const legacyPlays = JSON.parse(legacyPlaysJson);
            if (legacyPlays.length > 0) {
                // Check if we already migrated them (to avoid duplicating if key wasn't cleared)
                // Actually, let's just create a legacy playbook if one doesn't exist
                const playbooks = this.getPlaybooks();
                let legacyBook = playbooks.find(pb => pb.name === 'Legacy Plays');

                if (!legacyBook) {
                    legacyBook = {
                        id: 'legacy_book_' + Date.now(),
                        name: 'Legacy Plays',
                        teamSize: '5v5', // Default assumption
                        plays: []
                    };
                    playbooks.push(legacyBook);
                }

                // Merge plays that don't satisfy strict dup checks if needed, 
                // but for now simple push is safer to avoid data loss
                legacyBook.plays = [...legacyBook.plays, ...legacyPlays];

                this.savePlaybooks(playbooks);

                // Clear legacy key to finish migration
                localStorage.removeItem(this.LEGACY_KEY);
                console.log('Migrated legacy plays to Playbook structure.');
            }
        }
    }

    getPlaybooks() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    savePlaybooks(playbooks) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(playbooks));
    }

    savePlaybook(playbook) {
        const playbooks = this.getPlaybooks();
        const index = playbooks.findIndex(pb => pb.id === playbook.id);

        if (!playbook.id) {
            playbook.id = Date.now().toString();
            playbook.plays = [];
        }

        if (index >= 0) {
            playbooks[index] = playbook;
        } else {
            playbooks.push(playbook);
        }

        this.savePlaybooks(playbooks);
        return playbook;
    }

    getPlaybook(id) {
        return this.getPlaybooks().find(pb => pb.id === id);
    }

    deletePlaybook(id) {
        const playbooks = this.getPlaybooks().filter(pb => pb.id !== id);
        this.savePlaybooks(playbooks);
    }

    // --- Play Methods ---

    savePlay(playbookId, play) {
        const playbooks = this.getPlaybooks();
        const bookIndex = playbooks.findIndex(pb => pb.id === playbookId);

        if (bookIndex === -1) {
            throw new Error(`Playbook with ID ${playbookId} not found`);
        }

        const playbook = playbooks[bookIndex];

        if (!play.id) {
            play.id = Date.now().toString();
        }

        const playIndex = playbook.plays.findIndex(p => p.id === play.id);

        if (playIndex >= 0) {
            playbook.plays[playIndex] = play;
        } else {
            playbook.plays.push(play);
        }

        playbooks[bookIndex] = playbook;
        this.savePlaybooks(playbooks);
        return play;
    }

    deletePlay(playbookId, playId) {
        const playbooks = this.getPlaybooks();
        const bookIndex = playbooks.findIndex(pb => pb.id === playbookId);

        if (bookIndex !== -1) {
            const playbook = playbooks[bookIndex];
            playbook.plays = playbook.plays.filter(p => p.id !== playId);
            playbooks[bookIndex] = playbook;
            this.savePlaybooks(playbooks);
        }
    }
}
