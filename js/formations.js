export const BASE_FORMATIONS = {
    '5v5': [
        {
            name: 'I-Formation',
            players: [
                { id: '1', type: 'offense', x: 400, y: 300, color: '#eab308', label: 'C' }, // Center
                { id: '2', type: 'offense', x: 400, y: 350, color: '#1f2937', label: 'QB' }, // QB
                { id: '3', type: 'offense', x: 400, y: 400, color: '#ef4444', label: 'RB' }, // RB
                { id: '4', type: 'offense', x: 100, y: 300, color: '#6366f1', label: 'WR' }, // WR Left
                { id: '5', type: 'offense', x: 700, y: 300, color: '#6366f1', label: 'WR' }, // WR Right
            ]
        },
        {
            name: 'Spread',
            players: [
                { id: '1', type: 'offense', x: 400, y: 300, color: '#eab308', label: 'C' },
                { id: '2', type: 'offense', x: 400, y: 350, color: '#1f2937', label: 'QB' },
                { id: '3', type: 'offense', x: 200, y: 300, color: '#6366f1', label: 'WR' },
                { id: '4', type: 'offense', x: 600, y: 300, color: '#6366f1', label: 'WR' },
                { id: '5', type: 'offense', x: 400, y: 400, color: '#ef4444', label: 'RB' },
            ]
        }
    ],
    '6v6': [
        {
            name: 'Standard',
            players: [
                { id: '1', type: 'offense', x: 400, y: 300, color: '#eab308', label: 'C' },
                { id: '2', type: 'offense', x: 400, y: 350, color: '#1f2937', label: 'QB' },
                { id: '3', type: 'offense', x: 400, y: 400, color: '#ef4444', label: 'RB' },
                { id: '4', type: 'offense', x: 100, y: 300, color: '#6366f1', label: 'WR' },
                { id: '5', type: 'offense', x: 700, y: 300, color: '#6366f1', label: 'WR' },
                { id: '6', type: 'offense', x: 250, y: 300, color: '#ec4899', label: 'WR' },
            ]
        }
    ],
    '7v7': [
        {
            name: 'Pro Set',
            players: [
                { id: '1', type: 'offense', x: 400, y: 300, color: '#eab308', label: 'C' },
                { id: '2', type: 'offense', x: 400, y: 350, color: '#1f2937', label: 'QB' },
                { id: '3', type: 'offense', x: 350, y: 400, color: '#ef4444', label: 'RB' },
                { id: '4', type: 'offense', x: 450, y: 400, color: '#ef4444', label: 'RB' },
                { id: '5', type: 'offense', x: 100, y: 300, color: '#6366f1', label: 'WR' },
                { id: '6', type: 'offense', x: 700, y: 300, color: '#6366f1', label: 'WR' },
                { id: '7', type: 'offense', x: 600, y: 315, color: '#06b6d4', label: 'TE' },
            ]
        }
    ]
};

export function getFormations(teamSize) {
    return BASE_FORMATIONS[teamSize] || [];
}
