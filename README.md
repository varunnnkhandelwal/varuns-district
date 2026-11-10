# Varun's District

A playable version of my portfolio: a small 3D night-time town where every building is a project.

**Play it:** https://varuns-district.vercel.app

## Controls

- **Move:** W A S D or the arrow keys (on a phone: the on-screen stick)
- **Talk / confirm:** E
- **Enter a building:** walk up into its door
- **Journal:** J
- **Sit on a bench:** E next to one. Sitting is the only way time of day moves forward.

## Run it locally

No build step. Start the bundled server and open the address it prints:

```bash
node serve.js
```

## What's where

| File | What it does |
|---|---|
| `index.html` | The page and UI markup |
| `src/main.js` | Game logic: movement, interaction, journal, audio |
| `src/render3d.js` | The 3D renderer (Three.js, loaded from a CDN) |
| `src/props3d.js` | 3D buildings details, furniture, construction site |
| `src/world.js` | Town layout and all portfolio content |
| `src/interiors.js` | Room layouts |
| `src/sprites.js` | Pixel-art characters, drawn in code |
| `src/invaders.js` | The game on the studio console |
| `src/touch.js` | Touch controls |
| `music/playlist.js` | List your own background music here |
| `framer/GamePortal.tsx` | Framer component that links to the game |
| `sprites.html` | Sprite Lab: view and export every character sheet |
