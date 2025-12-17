export const BASE_FORMATIONS = {
    '5v5': [
        {
            name: 'Standard',
            players: [
                { id: '1', type: 'offense', x: 500, y: 350, color: '#eab308', label: 'C' }, // Center (Yellow) -> Middle of field (500)
                { id: '2', type: 'offense', x: 200, y: 350, color: '#6366f1', label: 'WR' }, // WR Left (Blue) -> On Line
                { id: '3', type: 'offense', x: 800, y: 350, color: '#22c55e', label: 'WR' }, // WR Right (Green) -> On Line
                { id: '4', type: 'offense', x: 500, y: 400, color: '#1f2937', label: 'QB' }, // QB (Black) -> Behind Center
                { id: '5', type: 'offense', x: 500, y: 500, color: '#ef4444', label: 'RB' }, // RB (Red) -> Deep
            ]
        }
    ],
    '6v6': [
        {
            name: 'Standard',
            players: [
                { id: '1', type: 'offense', x: 500, y: 350, color: '#eab308', label: 'C' }, // Center (Yellow)
                { id: '2', type: 'offense', x: 500, y: 400, color: '#1f2937', label: 'QB' }, // QB (Black)
                { id: '3', type: 'offense', x: 500, y: 480, color: '#ef4444', label: 'RB' }, // RB (Red)
                { id: '4', type: 'offense', x: 200, y: 350, color: '#6366f1', label: 'WR' }, // WR Left (Blue)
                { id: '5', type: 'offense', x: 350, y: 350, color: '#ec4899', label: 'WR' }, // Slot Left (Pink)
                { id: '6', type: 'offense', x: 800, y: 350, color: '#f97316', label: 'WR' }, // WR Right (Orange)
            ]
        }
    ],
    '7v7': [
        {
            name: 'Standard',
            players: [
                { id: '1', type: 'offense', x: 500, y: 350, color: '#eab308', label: 'C' }, // Center (Yellow)
                { id: '2', type: 'offense', x: 500, y: 400, color: '#1f2937', label: 'QB' }, // QB (Black)
                { id: '3', type: 'offense', x: 500, y: 480, color: '#ef4444', label: 'RB' }, // RB (Red)
                { id: '4', type: 'offense', x: 150, y: 350, color: '#3b82f6', label: 'WR' }, // WR Left Wide (Blue)
                { id: '5', type: 'offense', x: 850, y: 350, color: '#22c55e', label: 'WR' }, // WR Right Wide (Green)
                { id: '6', type: 'offense', x: 300, y: 350, color: '#ec4899', label: 'WR' }, // Slot Left (Pink)
                { id: '7', type: 'offense', x: 700, y: 350, color: '#f97316', label: 'WR' }, // Slot Right (Orange)
            ]
        }
    ]
};

export function getFormations(teamSize) {
    return BASE_FORMATIONS[teamSize] || [];
}
