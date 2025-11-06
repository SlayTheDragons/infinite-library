# The Infinite Library

A browser-based archive explorer written in TypeScript that lets players wander through prime myths, inspect factions, and adjust OpenRouter credentials for future narrative generation.

## Features
- 🔍 Filter the living archive by myth title, prose fragments, author, or faction.
- 🧭 Inspect canon status, credibility, and references for each recovered manuscript.
- 🔐 Configure the OpenRouter model slug and API key locally via the settings panel (stored in `localStorage`).
- 🪶 Responsive, lore-rich interface styled to evoke a shimmering cosmic repository.

## Getting Started
1. Install [TypeScript](https://www.typescriptlang.org/) globally or within this project.
   ```bash
   npm install --save-dev typescript
   ```
2. Compile the TypeScript source to JavaScript:
   ```bash
   npm run build
   ```
   The compiled output is emitted to `dist/main.js`. A transpiled copy is already provided to allow immediate exploration.
3. Open `public/index.html` in your browser to step inside the library.

## Project Structure
```
public/
  index.html      # Entry HTML document that mounts the application
  styles.css      # Visual styling for the interface
src/
  main.ts         # TypeScript source for the Infinite Library UI

# Compiled output (kept for convenience)
dist/
  main.js
```

## Notes
- Credentials entered in the settings panel are persisted in the browser only. They never leave the client.
- The simulation logic is mocked with prime agents and documents to demonstrate the browsing experience. Extend the data sets or connect a backend to evolve the mythology further.
