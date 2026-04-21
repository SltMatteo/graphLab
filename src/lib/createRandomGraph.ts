import Graph from 'graphology';
import circular from 'graphology-layout/circular';

function edgeKey(source: number, target: number): string {
  const [a, b] = source < target ? [source, target] : [target, source];
  return `${a}-${b}`;
}

export function createRandomGraph(nodeCount: number, edgeCount: number): Graph {
  const graph = new Graph({ type: 'undirected', multi: false, allowSelfLoops: false });

  for (let i = 0; i < nodeCount; i += 1) {
    graph.addNode(String(i), {
      label: String(i),
      size: 6,
    });
  }

  const maxEdges = Math.floor((nodeCount * (nodeCount - 1)) / 2);
  const targetEdgeCount = Math.min(edgeCount, maxEdges);
  const seen = new Set<string>();

  while (graph.size < targetEdgeCount) {
    const source = Math.floor(Math.random() * nodeCount);
    const target = Math.floor(Math.random() * nodeCount);

    if (source === target) continue;

    const key = edgeKey(source, target);
    if (seen.has(key)) continue;

    seen.add(key);
    graph.addEdge(String(source), String(target));
  }

  circular.assign(graph);

  graph.forEachNode((node, attributes) => {
    graph.setNodeAttribute(node, 'x', attributes.x * 100);
    graph.setNodeAttribute(node, 'y', attributes.y * 100);
  });

  return graph;
}

