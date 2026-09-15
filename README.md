# Graph Lab

An interactive browser playground for generating, visualizing, and inspecting graphs. Graph Lab began as a small companion for a graph theory class and grew into a focused tool for building intuition about graph structure.

## What you can do

- Generate uniform `G(n, m)`, Erdős–Rényi, random-tree, random-regular, preferential-attachment, small-world, path, cycle, star, and complete graphs.
- Reproduce stochastic graph topology exactly with a numeric seed.
- Switch between circular, scatter, and grid layouts without changing topology; each Generate click creates a fresh scatter arrangement.
- Select or search for a vertex and highlight its neighborhood.
- Edit directly on the canvas: add, drag, connect, rename, and delete vertices or edges, and assign positive edge weights.
- Step through BFS, DFS, Dijkstra, Kruskal, and greedy coloring with playback controls and operation counts.
- Find shortest paths and detect communities with label propagation and modularity scoring.
- Inspect diameter, radius, graph center, girth, clustering, cuts, Eulerian and Hamiltonian properties, bipartiteness, exact planarity, degree distribution, and centrality.
- Lock topology while rerolling scatter positions.
- Copy an edge list or export Graphology JSON and a rendered PNG.
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

Graph analysis is implemented locally with explicit, testable algorithms. It includes breadth-first distance sweeps, Tarjan-style cut detection, Brandes betweenness, iterative PageRank and eigenvector centrality, local clustering, bipartite coloring, and exact Hamiltonian search for graphs up to 16 vertices. Larger Hamiltonian cases use definitive sufficient results when available and otherwise report `unknown`, reflecting the problem's exponential complexity rather than presenting a guess. Planarity uses [TopoLoom](https://github.com/khalidsaidi/topoloom)'s deterministic TypeScript backend.

## Workspace modes

- **Explore** finds shortest paths, colors detected communities, and inspects vertex neighborhoods.
- **Algorithms** provides play, pause, step, and timeline controls for five classic algorithms.
- **Analysis** collects structural properties, a degree histogram, centrality rankings, and optional bipartition coloring.
- **Edit** turns the visualization into a graph canvas. Double-click empty space to add a vertex, drag vertices to move them, or use the panel to connect, rename, weight, and delete elements.

## Project structure

```text
src/
├── components/                 # Viewer and focused workspace panels
├── lib/analyzeGraph.ts         # Structural metrics and centrality
├── lib/communities.ts          # Label-propagation community detection
├── lib/graphAlgorithms.ts      # Algorithms, playback steps, shortest paths
├── lib/createRandomGraph.ts    # Generators, layouts, seeded sampling
├── App.tsx                     # Workbench state, editor, and export actions
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

React, TypeScript, Vite, Graphology, Sigma.js, and TopoLoom.

## License

[MIT](LICENSE)
