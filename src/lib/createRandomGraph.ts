import Graph from 'graphology';
import circular from 'graphology-layout/circular.js';
import random from 'graphology-layout/random.js';

export type GraphLayout = 'circular' | 'random' | 'grid';
export type GraphKind =
  | 'random'
  | 'erdos-renyi'
  | 'random-tree'
  | 'random-regular'
  | 'preferential'
  | 'small-world'
  | 'path'
  | 'cycle'
  | 'star'
  | 'complete';

export type GraphConfig = {
  kind: GraphKind;
  nodeCount: number;
  edgeCount: number;
  layout: GraphLayout;
  seed: number;
  layoutSeed: number;
  probability: number;
  attachmentCount: number;
  neighborCount: number;
  rewireProbability: number;
  regularDegree: number;
};

export const MAX_NODES = 250;

export const GRAPH_KINDS: Array<{ value: GraphKind; label: string; description: string }> = [
  { value: 'random', label: 'Uniform random G(n, m)', description: 'Choose exactly m edges uniformly from all possible pairs.' },
  { value: 'erdos-renyi', label: 'Erdős–Rényi G(n, p)', description: 'Include every possible edge independently with probability p.' },
  { value: 'random-tree', label: 'Random tree', description: 'Sample a uniformly random labeled tree using a Prüfer sequence.' },
  { value: 'random-regular', label: 'Random regular', description: 'Give every vertex the same degree, with a randomized labeling.' },
  { value: 'preferential', label: 'Preferential attachment', description: 'Grow a scale-free network where popular vertices attract new links.' },
  { value: 'small-world', label: 'Small world', description: 'Rewire a ring lattice to combine clustering with short paths.' },
  { value: 'path', label: 'Path', description: 'A chain where only consecutive vertices are adjacent.' },
  { value: 'cycle', label: 'Cycle', description: 'A path whose first and last vertices are connected.' },
  { value: 'star', label: 'Star', description: 'One central vertex connected to every other vertex.' },
  { value: 'complete', label: 'Complete', description: 'Every pair of distinct vertices is connected.' },
];

export function getMaxEdgeCount(nodeCount: number): number {
  const n = Math.max(0, Math.floor(nodeCount));
  return (n * (n - 1)) / 2;
}

export function getEdgeCount(kind: GraphKind, nodeCount: number, requestedEdges: number): number {
  const n = Math.max(0, Math.floor(nodeCount));

  switch (kind) {
    case 'complete':
      return getMaxEdgeCount(n);
    case 'cycle':
      return n > 2 ? n : Math.max(0, n - 1);
    case 'path':
    case 'star':
    case 'random-tree':
      return Math.max(0, n - 1);
    default:
      return Math.min(Math.max(0, Math.floor(requestedEdges)), getMaxEdgeCount(n));
  }
}

export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 1;
  return Math.abs(Math.floor(seed)) >>> 0 || 1;
}

function createSeededRandom(seed: number) {
  let state = normalizeSeed(seed);

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function assignGridLayout(graph: Graph) {
  const nodes = graph.nodes();
  const columns = Math.ceil(Math.sqrt(Math.max(nodes.length, 1)));
  const spacing = 32;
  const xOffset = ((columns - 1) * spacing) / 2;
  const rows = Math.ceil(nodes.length / columns);
  const yOffset = ((rows - 1) * spacing) / 2;

  nodes.forEach((node, index) => {
    graph.setNodeAttribute(node, 'x', (index % columns) * spacing - xOffset);
    graph.setNodeAttribute(node, 'y', Math.floor(index / columns) * spacing - yOffset);
  });
}

function assignLayout(graph: Graph, layout: GraphLayout, rng: () => number) {
  if (layout === 'random') {
    random.assign(graph, { center: 0, scale: 180, rng });
    return;
  }

  if (layout === 'grid') {
    assignGridLayout(graph);
    return;
  }

  circular.assign(graph, { center: 0, scale: 120 });
}

function addRandomEdges(graph: Graph, edgeCount: number, rng: () => number) {
  const candidates: Array<[number, number]> = [];

  for (let source = 0; source < graph.order; source += 1) {
    for (let target = source + 1; target < graph.order; target += 1) {
      candidates.push([source, target]);
    }
  }

  // Partial Fisher-Yates sampling avoids rejection loops for dense graphs.
  for (let index = 0; index < edgeCount; index += 1) {
    const selectedIndex = index + Math.floor(rng() * (candidates.length - index));
    [candidates[index], candidates[selectedIndex]] = [candidates[selectedIndex], candidates[index]];
    const [source, target] = candidates[index];
    graph.addEdge(String(source), String(target));
  }
}

function addErdosRenyiEdges(graph: Graph, probability: number, rng: () => number) {
  const p = Math.min(1, Math.max(0, probability));
  for (let source = 0; source < graph.order; source += 1) {
    for (let target = source + 1; target < graph.order; target += 1) {
      if (rng() < p) graph.addEdge(String(source), String(target));
    }
  }
}

function addRandomTreeEdges(graph: Graph, rng: () => number) {
  const n = graph.order;
  if (n < 2) return;
  if (n === 2) {
    graph.addEdge('0', '1');
    return;
  }

  const sequence = Array.from({ length: n - 2 }, () => Math.floor(rng() * n));
  const degrees = Array.from({ length: n }, () => 1);
  sequence.forEach((node) => { degrees[node] += 1; });

  sequence.forEach((node) => {
    const leaf = degrees.findIndex((degree) => degree === 1);
    graph.addEdge(String(leaf), String(node));
    degrees[leaf] -= 1;
    degrees[node] -= 1;
  });

  const remaining = degrees
    .map((degree, node) => ({ degree, node }))
    .filter(({ degree }) => degree === 1)
    .map(({ node }) => node);
  graph.addEdge(String(remaining[0]), String(remaining[1]));
}

function addRandomRegularEdges(graph: Graph, requestedDegree: number, rng: () => number) {
  const n = graph.order;
  if (n < 2) return;

  let degree = Math.min(n - 1, Math.max(0, Math.floor(requestedDegree)));
  if ((n * degree) % 2 !== 0) degree -= 1;
  if (degree <= 0) return;

  const vertices = Array.from({ length: n }, (_, index) => index);
  for (let index = vertices.length - 1; index > 0; index -= 1) {
    const selected = Math.floor(rng() * (index + 1));
    [vertices[index], vertices[selected]] = [vertices[selected], vertices[index]];
  }

  for (let offset = 1; offset <= Math.floor(degree / 2); offset += 1) {
    for (let index = 0; index < n; index += 1) {
      const source = String(vertices[index]);
      const target = String(vertices[(index + offset) % n]);
      if (!graph.hasEdge(source, target)) graph.addEdge(source, target);
    }
  }

  if (degree % 2 === 1) {
    for (let index = 0; index < n / 2; index += 1) {
      graph.addEdge(String(vertices[index]), String(vertices[index + n / 2]));
    }
  }
}

function addPreferentialAttachmentEdges(graph: Graph, requestedCount: number, rng: () => number) {
  const n = graph.order;
  if (n < 2) return;

  const attachmentCount = Math.min(n - 1, Math.max(1, Math.floor(requestedCount)));
  const initialSize = Math.min(n, attachmentCount + 1);

  for (let source = 0; source < initialSize; source += 1) {
    for (let target = source + 1; target < initialSize; target += 1) {
      graph.addEdge(String(source), String(target));
    }
  }

  for (let node = initialSize; node < n; node += 1) {
    const selected = new Set<number>();
    while (selected.size < Math.min(attachmentCount, node)) {
      const candidates = Array.from({ length: node }, (_, candidate) => candidate)
        .filter((candidate) => !selected.has(candidate));
      const totalWeight = candidates.reduce(
        (sum, candidate) => sum + Math.max(1, graph.degree(String(candidate))),
        0,
      );
      let threshold = rng() * totalWeight;
      let target = candidates[candidates.length - 1];

      for (const candidate of candidates) {
        threshold -= Math.max(1, graph.degree(String(candidate)));
        if (threshold <= 0) {
          target = candidate;
          break;
        }
      }

      selected.add(target);
    }

    selected.forEach((target) => graph.addEdge(String(node), String(target)));
  }
}

function addSmallWorldEdges(graph: Graph, requestedNeighbors: number, probability: number, rng: () => number) {
  const n = graph.order;
  if (n < 3) {
    if (n === 2) graph.addEdge('0', '1');
    return;
  }

  const maxEvenNeighbors = n - 1 - ((n - 1) % 2);
  const neighborCount = Math.min(
    maxEvenNeighbors,
    Math.max(2, Math.floor(requestedNeighbors / 2) * 2),
  );
  const latticeEdges: Array<[number, number]> = [];

  for (let source = 0; source < n; source += 1) {
    for (let offset = 1; offset <= neighborCount / 2; offset += 1) {
      const target = (source + offset) % n;
      if (!graph.hasEdge(String(source), String(target))) {
        graph.addEdge(String(source), String(target));
        latticeEdges.push([source, target]);
      }
    }
  }

  const beta = Math.min(1, Math.max(0, probability));
  latticeEdges.forEach(([source, target]) => {
    if (rng() >= beta) return;
    const candidates = Array.from({ length: n }, (_, candidate) => candidate)
      .filter((candidate) => candidate !== source && !graph.hasEdge(String(source), String(candidate)));
    if (candidates.length === 0) return;
    graph.dropEdge(String(source), String(target));
    const replacement = candidates[Math.floor(rng() * candidates.length)];
    graph.addEdge(String(source), String(replacement));
  });
}

function addStructuredEdges(graph: Graph, kind: 'path' | 'cycle' | 'star' | 'complete') {
  const n = graph.order;

  if (kind === 'complete') {
    for (let source = 0; source < n; source += 1) {
      for (let target = source + 1; target < n; target += 1) {
        graph.addEdge(String(source), String(target));
      }
    }
    return;
  }

  if (kind === 'star') {
    for (let target = 1; target < n; target += 1) graph.addEdge('0', String(target));
    return;
  }

  for (let source = 0; source < n - 1; source += 1) {
    graph.addEdge(String(source), String(source + 1));
  }

  if (kind === 'cycle' && n > 2) graph.addEdge(String(n - 1), '0');
}

export function createGraph(config: GraphConfig): Graph {
  const nodeCount = Math.min(MAX_NODES, Math.max(1, Math.floor(config.nodeCount)));
  const graph = new Graph({ type: 'undirected', multi: false, allowSelfLoops: false });
  const rng = createSeededRandom(config.seed);

  for (let index = 0; index < nodeCount; index += 1) {
    graph.addNode(String(index), {
      label: String(index),
      size: 6,
      color: '#58c7d9',
    });
  }

  const edgeCount = getEdgeCount(config.kind, nodeCount, config.edgeCount);
  if (config.kind === 'random') addRandomEdges(graph, edgeCount, rng);
  else if (config.kind === 'erdos-renyi') addErdosRenyiEdges(graph, config.probability, rng);
  else if (config.kind === 'random-tree') addRandomTreeEdges(graph, rng);
  else if (config.kind === 'random-regular') addRandomRegularEdges(graph, config.regularDegree, rng);
  else if (config.kind === 'preferential') addPreferentialAttachmentEdges(graph, config.attachmentCount, rng);
  else if (config.kind === 'small-world') {
    addSmallWorldEdges(graph, config.neighborCount, config.rewireProbability, rng);
  } else addStructuredEdges(graph, config.kind);

  graph.forEachNode((node) => {
    const degree = graph.degree(node);
    graph.setNodeAttribute(node, 'size', 5.5 + Math.min(3.5, degree * 0.18));
  });

  assignLayout(graph, config.layout, createSeededRandom(config.layoutSeed));
  return graph;
}

// Kept as a compatibility wrapper for the original public API.
export function createRandomGraph(
  nodeCount: number,
  edgeCount: number,
  layout: GraphLayout = 'circular',
  seed = Date.now(),
): Graph {
  return createGraph({
    kind: 'random',
    nodeCount,
    edgeCount,
    layout,
    seed,
    layoutSeed: seed,
    probability: 0.12,
    attachmentCount: 2,
    neighborCount: 4,
    rewireProbability: 0.2,
    regularDegree: 4,
  });
}
