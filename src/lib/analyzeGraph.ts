import type Graph from 'graphology';

export type GraphMetrics = {
  order: number;
  size: number;
  density: number;
  averageDegree: number;
  componentCount: number;
  componentSizes: number[];
  isolatedCount: number;
  minDegree: number;
  maxDegree: number;
};

export function analyzeGraph(graph: Graph): GraphMetrics {
  const nodes = graph.nodes();
  const visited = new Set<string>();
  const componentSizes: number[] = [];
  let isolatedCount = 0;
  let minDegree = Number.POSITIVE_INFINITY;
  let maxDegree = 0;
  let degreeSum = 0;

  nodes.forEach((node) => {
    const degree = graph.degree(node);
    degreeSum += degree;
    minDegree = Math.min(minDegree, degree);
    maxDegree = Math.max(maxDegree, degree);
    if (degree === 0) isolatedCount += 1;

    if (visited.has(node)) return;

    let componentSize = 0;
    const queue = [node];
    visited.add(node);

    while (queue.length > 0) {
      const current = queue.shift()!;
      componentSize += 1;
      graph.forEachNeighbor(current, (neighbor) => {
        if (visited.has(neighbor)) return;
        visited.add(neighbor);
        queue.push(neighbor);
      });
    }

    componentSizes.push(componentSize);
  });

  const maxPossibleEdges = (graph.order * (graph.order - 1)) / 2;

  return {
    order: graph.order,
    size: graph.size,
    density: maxPossibleEdges === 0 ? 0 : graph.size / maxPossibleEdges,
    averageDegree: graph.order === 0 ? 0 : degreeSum / graph.order,
    componentCount: componentSizes.length,
    componentSizes: componentSizes.sort((a, b) => b - a),
    isolatedCount,
    minDegree: Number.isFinite(minDegree) ? minDegree : 0,
    maxDegree,
  };
}
