## Purpose

This repository is a small static site + a game prototype. These instructions help an AI agent be productive quickly by describing the architecture, concrete edit patterns, and developer workflows.

## Quick orientation
- Root site: `jeanmichel.html` (main landing page, classic static HTML + CSS).
- Prototype game: `game/` contains `index.html`, `script.js`, `style.css` and a small HUD. The game is a browser-based WebGL prototype using three.js served from CDN (no bundler).
- Assets: `images/` holds media (PNG, MP4, MP3). Some filenames include Windows Zone.Identifier artifacts (e.g. `*.webp:Zone.Identifier`) — ignore or clean these when editing.

## How to run locally (no build)
- The project is static. Run a simple HTTP server from the repo root and open a browser:

  - In WSL / Linux/macOS:
    python3 -m http.server 8000
  - In Windows PowerShell:
    python -m http.server 8000

  Then open http://localhost:8000/jeanmichel.html or http://localhost:8000/game/index.html

## Important patterns & examples (edit with care)
- `game/index.html` uses an importmap to load `three` from CDN and loads `script.js` as a module. Edits that change module specifiers should be consistent with the importmap.
- `game/script.js` is the main runtime (Three.js scene, PointerLockControls, HUD interaction). Example: to change default FOV update the camera creation line:
  `const camera = new THREE.PerspectiveCamera(75, ...);` and also update the `uiFov` input value in `game/index.html`.
- Pointer lock and WebGL specifics:
  - Pointer lock is activated on a click (user gesture). Keep that UX in place when changing controls.
  - The script imports PointerLockControls directly from a CDN URL — don't convert to bare imports without updating `index.html` import map.
- Small, safe tasks: tweak numeric constants (DPRScale, fog density, light intensities) in `game/script.js`; these are isolated and low-risk. Large refactors of Three.js scene graph require manual testing in the browser.

## Conventions & gotchas
- No package.json or build; avoid introducing a bundler unless requested. The code relies on browser ESM + CDN.
- Media filenames may include Windows alternate-data-stream markers (strings like `:Zone.Identifier`) — treat these as artifacts from Windows transfers and ignore them, or rename assets inside WSL to remove the suffix.
- Error handling: `game/index.html` includes a small global error handler that writes to the HUD; use it to surface runtime JS errors during changes.

## Integration points / external deps
- three.js is loaded from jsdelivr in `game/index.html` and `script.js` (import URLs). There are no backend APIs or package-based dependencies.

## When you make changes
- Run the local static server and verify both `jeanmichel.html` and `game/index.html` open and interactive elements (pointer lock, HUD, settings) still work.
- For visual or Three.js changes, test in Chrome/Firefox with devtools open; WebGL errors typically appear in console and will also surface in the in-HUD error box.

## Example quick edits an AI might perform
- Adjust default player speed: change `let speed = 2.65` in `game/script.js` and verify the UI slider (`uiSpeed`) reflects the intended range.
- Fix minor CSS: prefer editing `game/style.css` for prototype HUD tweaks rather than touching global `style.css` unless changing the root page.

## Assumptions
- This is a static, client-only prototype (no CI/build). If you need to add a build step or package manager, note it here and request confirmation before changing module loading strategy.

If any of the above is unclear or you'd like me to expand examples (e.g., exact line numbers for common edits), tell me which area to elaborate and I will update this file.
