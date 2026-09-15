import type Graph from 'graphology';

export type CommunityResult = {
  assignments: Record<string, number>;
  count: number;
  modularity: number;
};

export function detectCommunities(graph: Graph, maxIterations = 30): CommunityResult {
  const nodes = graph.nodes().sort((a, b) => graph.degree(b) - graph.degree(a));
  const labels = new Map(nodes.map((node) => [node, node]));

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let changed = false;
    nodes.forEach((node) => {
      const scores = new Map<string, number>();
      graph.forEachNeighbor(node, (neighbor) => {
        const label = labels.get(neighbor)!;
        const edge = graph.edge(node, neighbor) ?? graph.edge(neighbor, node);
        const weight = edge ? Number(graph.getEdgeAttribute(edge, 'weight') ?? 1) : 1;
        scores.set(label, (scores.get(label) ?? 0) + weight);
      });
      if (scores.size === 0) return;
      const current = labels.get(node)!;
      const best = [...scores.entries()].sort(([firstLabel, first], [secondLabel, second]) => {
        if (second !== first) return second - first;
        if (firstLabel === current) return -1;
        if (secondLabel === current) return 1;
        return firstLabel.localeCompare(secondLabel, undefined, { numeric: true });
      })[0][0];
      if (best !== current) {
        labels.set(node, best);
        changed = true;
      }
    });
    if (!changed) break;
  }

  const uniqueLabels = [...new Set(labels.values())]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const labelIds = new Map(uniqueLabels.map((label, index) => [label, index]));
  const assignments = Object.fromEntries(nodes.map((node) => [node, labelIds.get(labels.get(node)!)!]));
  const edgeCount = graph.size;
  let modularity = 0;

  if (edgeCount > 0) {
    nodes.forEach((source) => {
      nodes.forEach((target) => {
        if (assignments[source] !== assignments[target]) return;
        const adjacent = graph.hasEdge(source, target) ? 1 : 0;
        modularity += adjacent - (graph.degree(source) * graph.degree(target)) / (2 * edgeCount);
      });
    });
    modularity /= 2 * edgeCount;
  }

  return { assignments, count: uniqueLabels.length, modularity };
}
