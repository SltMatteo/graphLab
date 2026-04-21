import Graph from 'graphology';
import circular from 'graphology-layout/circular';
import random from 'graphology-layout/random';

export type GraphLayout = 'circular' | 'random' | 'grid';

function edgeKey(source: number, target: number): string {
  const [a, b] = source < target ? [source, target] : [target, source];
  return `${a}-${b}`;
}

function createSeededRandom(seed: number) {
  let state = seed || 1;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
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

export function createRandomGraph(
  nodeCount: number,
  edgeCount: number,
  layout: GraphLayout = 'circular',
  seed = Date.now(),
): Graph {
  const graph = new Graph({ type: 'undirected', multi: false, allowSelfLoops: false });
  const rng = createSeededRandom(seed);

  for (let i = 0; i < nodeCount; i += 1) {
    graph.addNode(String(i), {
      label: String(i),
      size: 6,
      color: '#60a5fa',
    });
  }

  const maxEdges = Math.floor((nodeCount * (nodeCount - 1)) / 2);
  const targetEdgeCount = Math.min(edgeCount, maxEdges);
  const seen = new Set<string>();

  while (graph.size < targetEdgeCount) {
    const source = Math.floor(rng() * nodeCount);
    const target = Math.floor(rng() * nodeCount);

    if (source === target) continue;

    const key = edgeKey(source, target);
    if (seen.has(key)) continue;

    seen.add(key);
    graph.addEdge(String(source), String(target));
  }

  assignLayout(graph, layout, rng);

  return graph;
}
