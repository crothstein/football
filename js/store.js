export class Store {
    constructor() {
        this.STORAGE_KEY = 'playmaker_plays';
    }

    getPlays() {
        const plays = localStorage.getItem(this.STORAGE_KEY);
        return plays ? JSON.parse(plays) : [];
    }

    savePlay(play) {
        const plays = this.getPlays();
        const existingIndex = plays.findIndex(p => p.id === play.id);

        if (!play.id) {
            play.id = Date.now().toString(); // Simple ID generation
        }

        if (existingIndex >= 0) {
            plays[existingIndex] = play;
        } else {
            plays.push(play);
        }

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(plays));
        return play;
    }

    deletePlay(id) {
        const plays = this.getPlays().filter(p => p.id !== id);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(plays));
    }

    getPlay(id) {
        return this.getPlays().find(p => p.id === id);
    }
}
