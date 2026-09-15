import type Graph from 'graphology';

export type AlgorithmKind = 'bfs' | 'dfs' | 'dijkstra' | 'mst' | 'coloring';

export type AlgorithmStep = {
  activeNode: string | null;
  visited: string[];
  frontier: string[];
  edges: string[];
  colors?: Record<string, number>;
  message: string;
  operations: number;
};

export type AlgorithmRun = {
  name: string;
  complexity: string;
  steps: AlgorithmStep[];
};

export type PathResult = {
  nodes: string[];
  edges: string[];
  distance: number | null;
};

function edgeBetween(graph: Graph, source: string, target: string): string | null {
  return graph.edge(source, target) ?? graph.edge(target, source) ?? null;
}

function sortedNeighbors(graph: Graph, node: string) {
  return graph.neighbors(node).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function shortestPath(graph: Graph, source: string, target: string): PathResult {
  if (!graph.hasNode(source) || !graph.hasNode(target)) return { nodes: [], edges: [], distance: null };
  const queue = [source];
  const parent = new Map<string, string | null>([[source, null]]);

  for (let index = 0; index < queue.length && !parent.has(target); index += 1) {
    const current = queue[index];
    sortedNeighbors(graph, current).forEach((neighbor) => {
      if (!parent.has(neighbor)) {
        parent.set(neighbor, current);
        queue.push(neighbor);
      }
    });
  }

  if (!parent.has(target)) return { nodes: [], edges: [], distance: null };
  const nodes: string[] = [];
  for (let current: string | null = target; current !== null; current = parent.get(current) ?? null) {
    nodes.push(current);
  }
  nodes.reverse();
  const edges = nodes.slice(1).map((node, index) => edgeBetween(graph, nodes[index], node)!).filter(Boolean);
  return { nodes, edges, distance: edges.length };
}

function runBfs(graph: Graph, start: string): AlgorithmRun {
  const visited = new Set<string>([start]);
  const queue = [start];
  const treeEdges: string[] = [];
  const steps: AlgorithmStep[] = [{
    activeNode: start, visited: [], frontier: [start], edges: [], operations: 0,
    message: `Start at vertex ${start}.`,
  }];
  let operations = 0;

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    sortedNeighbors(graph, current).forEach((neighbor) => {
      operations += 1;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
        const edge = edgeBetween(graph, current, neighbor);
        if (edge) treeEdges.push(edge);
      }
    });
    steps.push({
      activeNode: current,
      visited: queue.slice(0, index + 1),
      frontier: queue.slice(index + 1),
      edges: [...treeEdges],
      operations,
      message: `Visit ${current}; the queue now contains ${queue.slice(index + 1).join(', ') || 'nothing'}.`,
    });
  }
  return { name: 'Breadth-first search', complexity: 'O(V + E)', steps };
}

function runDfs(graph: Graph, start: string): AlgorithmRun {
  const visited = new Set<string>();
  const stack: Array<{ node: string; edge: string | null }> = [{ node: start, edge: null }];
  const treeEdges: string[] = [];
  const steps: AlgorithmStep[] = [];
  let operations = 0;

  while (stack.length > 0) {
    const { node, edge } = stack.pop()!;
    if (visited.has(node)) continue;
    visited.add(node);
    if (edge) treeEdges.push(edge);
    const neighbors = sortedNeighbors(graph, node).reverse();
    neighbors.forEach((neighbor) => {
      operations += 1;
      if (!visited.has(neighbor)) stack.push({ node: neighbor, edge: edgeBetween(graph, node, neighbor) });
    });
    steps.push({
      activeNode: node,
      visited: [...visited],
      frontier: stack.map((item) => item.node),
      edges: [...treeEdges],
      operations,
      message: `Visit ${node}; ${stack.length} ${stack.length === 1 ? 'vertex remains' : 'vertices remain'} on the stack.`,
    });
  }
  return { name: 'Depth-first search', complexity: 'O(V + E)', steps };
}

function runDijkstra(graph: Graph, start: string): AlgorithmRun {
  const nodes = graph.nodes();
  const distance = new Map(nodes.map((node) => [node, Number.POSITIVE_INFINITY]));
  const previous = new Map<string, string>();
  const settled = new Set<string>();
  const steps: AlgorithmStep[] = [];
  let operations = 0;
  distance.set(start, 0);

  while (settled.size < nodes.length) {
    const current = nodes
      .filter((node) => !settled.has(node))
      .sort((a, b) => distance.get(a)! - distance.get(b)!)[0];
    if (!current || !Number.isFinite(distance.get(current)!)) break;
    settled.add(current);

    graph.forEachNeighbor(current, (neighbor) => {
      if (settled.has(neighbor)) return;
      operations += 1;
      const edge = edgeBetween(graph, current, neighbor);
      const weight = edge ? Number(graph.getEdgeAttribute(edge, 'weight') ?? 1) : 1;
      const candidate = distance.get(current)! + (Number.isFinite(weight) && weight > 0 ? weight : 1);
      if (candidate < distance.get(neighbor)!) {
        distance.set(neighbor, candidate);
        previous.set(neighbor, current);
      }
    });

    const edges = [...previous.entries()]
      .map(([node, parent]) => edgeBetween(graph, node, parent))
      .filter((edge): edge is string => edge !== null);
    steps.push({
      activeNode: current,
      visited: [...settled],
      frontier: nodes.filter((node) => !settled.has(node) && Number.isFinite(distance.get(node)!)),
      edges,
      operations,
      message: `Settle ${current} at distance ${distance.get(current)}.`,
    });
  }
  return { name: "Dijkstra's algorithm", complexity: 'O(V² + E)', steps };
}

function runMst(graph: Graph): AlgorithmRun {
  const parent = new Map(graph.nodes().map((node) => [node, node]));
  const find = (node: string): string => {
    const currentParent = parent.get(node)!;
    if (currentParent === node) return node;
    const root = find(currentParent);
    parent.set(node, root);
    return root;
  };
  const edges = graph.edges().sort((first, second) => {
    const firstWeight = Number(graph.getEdgeAttribute(first, 'weight') ?? 1);
    const secondWeight = Number(graph.getEdgeAttribute(second, 'weight') ?? 1);
    return firstWeight - secondWeight;
  });
  const accepted: string[] = [];
  const steps: AlgorithmStep[] = [];
  let operations = 0;

  edges.forEach((edge) => {
    operations += 1;
    const [source, target] = graph.extremities(edge);
    const sourceRoot = find(source);
    const targetRoot = find(target);
    if (sourceRoot !== targetRoot) {
      parent.set(sourceRoot, targetRoot);
      accepted.push(edge);
      steps.push({
        activeNode: target,
        visited: [...new Set(accepted.flatMap((acceptedEdge) => graph.extremities(acceptedEdge)))],
        frontier: [], edges: [...accepted], operations,
        message: `Accept ${source}–${target}; it connects two components without a cycle.`,
      });
    }
  });
  return { name: "Kruskal's minimum spanning forest", complexity: 'O(E log E)', steps };
}

function runColoring(graph: Graph): AlgorithmRun {
  const order = graph.nodes().sort((a, b) => graph.degree(b) - graph.degree(a));
  const colors: Record<string, number> = {};
  const steps: AlgorithmStep[] = [];
  let operations = 0;

  order.forEach((node) => {
    const unavailable = new Set<number>();
    graph.forEachNeighbor(node, (neighbor) => {
      operations += 1;
      if (colors[neighbor] !== undefined) unavailable.add(colors[neighbor]);
    });
    let color = 0;
    while (unavailable.has(color)) color += 1;
    colors[node] = color;
    steps.push({
      activeNode: node, visited: Object.keys(colors), frontier: [], edges: [], colors: { ...colors }, operations,
      message: `Assign color ${color + 1} to ${node}; ${Math.max(...Object.values(colors)) + 1} colors used so far.`,
    });
  });
  return { name: 'Greedy graph coloring', complexity: 'O(V + E)', steps };
}

export function runAlgorithm(graph: Graph, kind: AlgorithmKind, start?: string): AlgorithmRun {
  const firstNode = start && graph.hasNode(start) ? start : graph.nodes()[0];
  if (!firstNode) return { name: kind.toUpperCase(), complexity: '—', steps: [] };
  if (kind === 'bfs') return runBfs(graph, firstNode);
  if (kind === 'dfs') return runDfs(graph, firstNode);
  if (kind === 'dijkstra') return runDijkstra(graph, firstNode);
  if (kind === 'mst') return runMst(graph);
  return runColoring(graph);
}
