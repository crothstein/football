export const BASE_FORMATIONS = {
    '5v5': [
        {
            name: 'Standard',
            players: [
                { id: '1', type: 'offense', x: 50, y: 35, color: '#eab308', label: 'C' }, // Center (Yellow)
                { id: '2', type: 'offense', x: 20, y: 35, color: '#6366f1', label: 'WR' }, // WR Left (Blue)
                { id: '3', type: 'offense', x: 80, y: 35, color: '#22c55e', label: 'WR' }, // WR Right (Green)
                { id: '4', type: 'offense', x: 50, y: 40, color: '#1f2937', label: 'QB' }, // QB (Black)
                { id: '5', type: 'offense', x: 50, y: 50, color: '#ef4444', label: 'RB' }, // RB (Red)
            ]
        }
    ],
    '6v6': [
        {
            name: 'Standard',
            players: [
                { id: '1', type: 'offense', x: 50, y: 35, color: '#eab308', label: 'C' }, // Center (Yellow)
                { id: '2', type: 'offense', x: 50, y: 40, color: '#1f2937', label: 'QB' }, // QB (Black)
                { id: '3', type: 'offense', x: 50, y: 48, color: '#ef4444', label: 'RB' }, // RB (Red)
                { id: '4', type: 'offense', x: 20, y: 35, color: '#6366f1', label: 'WR' }, // WR Left (Blue)
                { id: '5', type: 'offense', x: 35, y: 35, color: '#ec4899', label: 'WR' }, // Slot Left (Pink)
                { id: '6', type: 'offense', x: 80, y: 35, color: '#f97316', label: 'WR' }, // WR Right (Orange)
            ]
        }
    ],
    '7v7': [
        {
            name: 'Standard',
            players: [
                { id: '1', type: 'offense', x: 50, y: 35, color: '#eab308', label: 'C' }, // Center (Yellow)
                { id: '2', type: 'offense', x: 50, y: 40, color: '#1f2937', label: 'QB' }, // QB (Black)
                { id: '3', type: 'offense', x: 50, y: 48, color: '#ef4444', label: 'RB' }, // RB (Red)
                { id: '4', type: 'offense', x: 15, y: 35, color: '#3b82f6', label: 'WR' }, // WR Left Wide (Blue)
                { id: '5', type: 'offense', x: 85, y: 35, color: '#22c55e', label: 'WR' }, // WR Right Wide (Green)
                { id: '6', type: 'offense', x: 30, y: 35, color: '#ec4899', label: 'WR' }, // Slot Left (Pink)
                { id: '7', type: 'offense', x: 70, y: 35, color: '#f97316', label: 'WR' }, // Slot Right (Orange)
            ]
        }
    ]
};

export function getFormations(teamSize) {
    return BASE_FORMATIONS[teamSize] || [];
}
