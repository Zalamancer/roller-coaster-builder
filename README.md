# Roller Coaster Builder

A 3D web-based roller coaster builder and simulator using Three.js, allowing users to design custom coasters with multiple track styles and experience rides in first-person.

## Run

Start a local static HTTP server:

```bash
npm install -g http-server
http-server .
```

Then open `http://localhost:8080` in your browser, or use any other static server (`python -m http.server 8000`, `npx serve`, etc.).

## Structure

- **index.html** — Main entry point with canvas and UI root
- **src/main.js** — Application initialization and mode management
- **src/buildMode.js** — Track building state and operations
- **src/rideMode.js** — First-person coaster ride simulation
- **src/trackPath.js** — Track piece catalog and path assembly
- **src/trackRenderer.js** — Three.js rendering of track geometry
- **src/scene.js** — Three.js scene, camera, and controls setup
- **src/assets.js** — Asset loader for 3D models and material definitions
- **src/scenery.js** — Procedural scenery placement (trees, buildings, paths)
- **src/ui.js** — UI panels and controls (style switching, undo, ride triggers)
- **src/ui.css** — Styling for HUD and UI elements
- **src/three.module.js** — Bundled Three.js library
- **src/addons/** — Three.js addon modules (controls, loaders, etc.)
- **assets/models/** — Kenney Coaster Kit 3D models (.glb files) for tracks, trains, scenery, and props

## Notes

This is a self-contained ES module project with no build step. All assets are committed. No package dependencies need to be installed — just serve the directory via HTTP. The Three.js library is bundled inline (src/three.module.js).