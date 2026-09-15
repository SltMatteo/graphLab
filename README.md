# Graph Lab

An interactive browser playground for generating, visualizing, and inspecting graphs. Graph Lab began as a small companion for a graph theory class and grew into a focused tool for building intuition about graph structure.

## What you can do

- Generate uniform `G(n, m)`, Erdős–Rényi, random-tree, preferential-attachment, small-world, path, cycle, star, and complete graphs.
- Reproduce stochastic graph topology exactly with a numeric seed.
- Switch between circular, scatter, and grid layouts without changing topology; each Generate click creates a fresh scatter arrangement.
- Select or search for a vertex and highlight its neighborhood.
- Inspect density, average degree, connected components, and degree range.
- Copy an edge list or download a portable Graphology JSON file.
- Use the responsive interface on desktop, tablet, or mobile.

## Run locally

You need Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To verify the project before a release:

```bash
npm run check
```

## How it works

The app represents graphs with [Graphology](https://graphology.github.io/) and renders them with [Sigma.js](https://www.sigmajs.org/). Stochastic topology uses a seeded linear congruential generator, so a configuration can always be reproduced. Scatter coordinates use a separate arrangement seed, allowing the same topology to be explored from fresh positions. Fixed-edge random graphs use a partial Fisher–Yates shuffle, which stays predictable even for dense graphs and avoids the rejection-loop slowdown common in naive generators. Random trees use Prüfer sequences; the growth and small-world models implement preferential attachment and Watts–Strogatz-style rewiring directly.

Graph analysis is implemented locally with straightforward traversals. Connected components use breadth-first search; the remaining metrics are derived from the degree sequence and graph order/size.

## Project structure

```text
src/
├── components/GraphViewer.tsx  # Sigma renderer and camera interactions
├── lib/analyzeGraph.ts         # Graph metrics
├── lib/createRandomGraph.ts    # Generators, layouts, seeded sampling
├── App.tsx                     # Workbench UI and export actions
└── styles/global.css           # Responsive visual system
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run test` | Run generator and analysis tests |
| `npm run build` | Type-check and create a production build |
| `npm run check` | Run the full test and build verification |

## Built with

React, TypeScript, Vite, Graphology, and Sigma.js.

## License

[MIT](LICENSE)
