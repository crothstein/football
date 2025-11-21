# Flag Football Playmaker

A web-based tool for designing and visualizing flag football plays.

## Features

- **Visual Play Editor**: Drag-and-drop interface for positioning players
- **Route Drawing**: Draw routes with directional arrows
- **Color Coding**: Assign different colors to players and their routes
- **Playbook Management**: Save and load plays
- **Export Options**: Export plays as images or JSON

## Getting Started

1. Clone this repository
2. Open `index.html` in a web browser
3. Or serve with a local server:
   ```bash
   python3 -m http.server 8080
   ```
4. Navigate to `http://localhost:8080`

## Usage

1. Click "Add Player" to add players to the field
2. Click on a player to select them
3. Use the color picker to change player colors
4. Click "Route" to start drawing routes from a player
5. Click on the field to add route segments
6. Click "Route" again to finish drawing

## Technology Stack

- Vanilla JavaScript (ES6 modules)
- SVG for graphics
- CSS3 for styling
- No external dependencies

## Project Structure

```
flag-football-playmaker/
├── index.html          # Main HTML file
├── css/
│   └── style.css      # Styles
└── js/
    ├── app.js         # Application entry point
    ├── editor.js      # SVG editor logic
    ├── ui.js          # UI controls
    └── store.js       # Data persistence
```

## License

MIT
