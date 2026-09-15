import { graph as topoGraph, planarity } from '@khalidsaidi/topoloom';
import type Graph from 'graphology';

export type NodeCentrality = {
  degree: number;
  closeness: number;
  betweenness: number;
  pageRank: number;
  eigenvector: number;
};

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
  diameter: number | null;
  radius: number | null;
  centers: string[];
  girth: number | null;
  clusteringCoefficient: number;
  articulationPoints: string[];
  bridges: Array<[string, string]>;
  eulerian: 'circuit' | 'trail' | 'none';
  bipartite: boolean;
  planar: boolean;
  degreeDistribution: Array<{ degree: number; count: number }>;
  centrality: Record<string, NodeCentrality>;
};

type TraversalSummary = {
  distances: Map<string, number>;
  betweenness: Map<string, number>;
  girth: number;
};

function breadthFirstSummary(graph: Graph, source: string): TraversalSummary {
  const stack: string[] = [];
  const queue = [source];
  let queueIndex = 0;
  const predecessors = new Map<string, string[]>();
  const pathCounts = new Map<string, number>([[source, 1]]);
  const distances = new Map<string, number>([[source, 0]]);
  const parents = new Map<string, string | null>([[source, null]]);
  let girth = Number.POSITIVE_INFINITY;

  while (queueIndex < queue.length) {
    const vertex = queue[queueIndex++];
    stack.push(vertex);
    const distance = distances.get(vertex)!;

    graph.forEachNeighbor(vertex, (neighbor) => {
      if (!distances.has(neighbor)) {
        distances.set(neighbor, distance + 1);
        parents.set(neighbor, vertex);
        queue.push(neighbor);
      }

      if (distances.get(neighbor) === distance + 1) {
        pathCounts.set(neighbor, (pathCounts.get(neighbor) ?? 0) + (pathCounts.get(vertex) ?? 0));
        const list = predecessors.get(neighbor) ?? [];
        list.push(vertex);
        predecessors.set(neighbor, list);
      } else if (parents.get(vertex) !== neighbor) {
        girth = Math.min(girth, distance + (distances.get(neighbor) ?? 0) + 1);
      }
    });
  }

  const dependencies = new Map<string, number>();
  const betweenness = new Map<string, number>();

  while (stack.length > 0) {
    const vertex = stack.pop()!;
    const vertexPaths = pathCounts.get(vertex) ?? 1;
    (predecessors.get(vertex) ?? []).forEach((predecessor) => {
      const share = ((pathCounts.get(predecessor) ?? 0) / vertexPaths) * (1 + (dependencies.get(vertex) ?? 0));
      dependencies.set(predecessor, (dependencies.get(predecessor) ?? 0) + share);
    });
    if (vertex !== source) betweenness.set(vertex, dependencies.get(vertex) ?? 0);
  }

  return { distances, betweenness, girth };
}

function findComponents(graph: Graph) {
  const visited = new Set<string>();
  const components: string[][] = [];

  graph.forEachNode((node) => {
    if (visited.has(node)) return;
    const component: string[] = [];
    const queue = [node];
    visited.add(node);
    for (let index = 0; index < queue.length; index += 1) {
      const current = queue[index];
      component.push(current);
      graph.forEachNeighbor(current, (neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      });
    }
    components.push(component);
  });
  return components.sort((a, b) => b.length - a.length);
}

function findCuts(graph: Graph) {
  let time = 0;
  const discovery = new Map<string, number>();
  const low = new Map<string, number>();
  const parent = new Map<string, string | null>();
  const articulationPoints = new Set<string>();
  const bridges: Array<[string, string]> = [];

  const visit = (node: string) => {
    time += 1;
    discovery.set(node, time);
    low.set(node, time);
    let childCount = 0;

    graph.forEachNeighbor(node, (neighbor) => {
      if (!discovery.has(neighbor)) {
        childCount += 1;
        parent.set(neighbor, node);
        visit(neighbor);
        low.set(node, Math.min(low.get(node)!, low.get(neighbor)!));

        if (parent.get(node) === null && childCount > 1) articulationPoints.add(node);
        if (parent.get(node) !== null && low.get(neighbor)! >= discovery.get(node)!) articulationPoints.add(node);
        if (low.get(neighbor)! > discovery.get(node)!) bridges.push([node, neighbor]);
      } else if (neighbor !== parent.get(node)) {
        low.set(node, Math.min(low.get(node)!, discovery.get(neighbor)!));
      }
    });
  };

  graph.forEachNode((node) => {
    if (!discovery.has(node)) {
      parent.set(node, null);
      visit(node);
    }
  });

  return { articulationPoints: [...articulationPoints], bridges };
}

function testBipartite(graph: Graph) {
  const colors = new Map<string, 0 | 1>();
  let bipartite = true;

  graph.forEachNode((node) => {
    if (colors.has(node) || !bipartite) return;
    colors.set(node, 0);
    const queue = [node];
    for (let index = 0; index < queue.length && bipartite; index += 1) {
      const current = queue[index];
      graph.forEachNeighbor(current, (neighbor) => {
        if (!colors.has(neighbor)) {
          colors.set(neighbor, colors.get(current) === 0 ? 1 : 0);
          queue.push(neighbor);
        } else if (colors.get(neighbor) === colors.get(current)) bipartite = false;
      });
    }
  });
  return bipartite;
}

function testPlanar(graph: Graph) {
  const builder = new topoGraph.GraphBuilder();
  const vertexIds = new Map<string, number>();
  graph.forEachNode((node) => vertexIds.set(node, builder.addVertex(node)));
  graph.forEachEdge((_edge, _attributes, source, target) => {
    builder.addEdge(vertexIds.get(source)!, vertexIds.get(target)!);
  });
  return planarity.testPlanarity(builder.build(), { backend: 'ts', maxTsVertices: 300 }).planar;
}

function calculatePageRank(graph: Graph, iterations = 40, damping = 0.85) {
  const nodes = graph.nodes();
  const count = nodes.length;
  let ranks = new Map(nodes.map((node) => [node, count === 0 ? 0 : 1 / count]));

  for (let iteration = 0; iteration < iterations && count > 0; iteration += 1) {
    const dangling = nodes.reduce((sum, node) => graph.degree(node) === 0 ? sum + ranks.get(node)! : sum, 0);
    const next = new Map<string, number>();
    nodes.forEach((node) => {
      let incoming = 0;
      graph.forEachNeighbor(node, (neighbor) => { incoming += ranks.get(neighbor)! / graph.degree(neighbor); });
      next.set(node, (1 - damping) / count + damping * (incoming + dangling / count));
    });
    ranks = next;
  }
  return ranks;
}

function calculateEigenvectorCentrality(graph: Graph, iterations = 50) {
  const nodes = graph.nodes();
  let scores = new Map(nodes.map((node) => [node, nodes.length === 0 ? 0 : 1 / Math.sqrt(nodes.length)]));

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next = new Map<string, number>();
    let norm = 0;
    nodes.forEach((node) => {
      let score = 0;
      graph.forEachNeighbor(node, (neighbor) => { score += scores.get(neighbor) ?? 0; });
      next.set(node, score);
      norm += score * score;
    });
    norm = Math.sqrt(norm) || 1;
    next.forEach((score, node) => next.set(node, score / norm));
    scores = next;
  }
  return scores;
}

export function analyzeGraph(graph: Graph): GraphMetrics {
  const nodes = graph.nodes();
  const components = findComponents(graph);
  const degreeCounts = new Map<number, number>();
  const betweenness = new Map(nodes.map((node) => [node, 0]));
  const closeness = new Map<string, number>();
  const eccentricities = new Map<string, number>();
  let isolatedCount = 0;
  let minDegree = Number.POSITIVE_INFINITY;
  let maxDegree = 0;
  let degreeSum = 0;
  let girth = Number.POSITIVE_INFINITY;
  let clusteringSum = 0;

  nodes.forEach((node) => {
    const degree = graph.degree(node);
    degreeSum += degree;
    minDegree = Math.min(minDegree, degree);
    maxDegree = Math.max(maxDegree, degree);
    degreeCounts.set(degree, (degreeCounts.get(degree) ?? 0) + 1);
    if (degree === 0) isolatedCount += 1;

    const neighbors = graph.neighbors(node);
    let neighborEdges = 0;
    for (let first = 0; first < neighbors.length; first += 1) {
      for (let second = first + 1; second < neighbors.length; second += 1) {
        if (graph.hasEdge(neighbors[first], neighbors[second])) neighborEdges += 1;
      }
    }
    clusteringSum += degree < 2 ? 0 : (2 * neighborEdges) / (degree * (degree - 1));

    const traversal = breadthFirstSummary(graph, node);
    const distances = [...traversal.distances.values()];
    const distanceSum = distances.reduce((sum, distance) => sum + distance, 0);
    const reachable = traversal.distances.size - 1;
    const normalizedReach = nodes.length > 1 ? reachable / (nodes.length - 1) : 0;
    closeness.set(node, distanceSum === 0 ? 0 : (reachable / distanceSum) * normalizedReach);
    eccentricities.set(node, distances.length > 0 ? Math.max(...distances) : 0);
    traversal.betweenness.forEach((value, vertex) => {
      betweenness.set(vertex, (betweenness.get(vertex) ?? 0) + value / 2);
    });
    girth = Math.min(girth, traversal.girth);
  });

  const connected = components.length === 1;
  const eccentricityValues = [...eccentricities.values()];
  const diameter = connected && eccentricityValues.length > 0 ? Math.max(...eccentricityValues) : null;
  const radius = connected && eccentricityValues.length > 0 ? Math.min(...eccentricityValues) : null;
  const centers = radius === null ? [] : nodes.filter((node) => eccentricities.get(node) === radius);
  const pageRank = calculatePageRank(graph);
  const eigenvector = calculateEigenvectorCentrality(graph);
  const betweennessNormalizer = nodes.length > 2 ? ((nodes.length - 1) * (nodes.length - 2)) / 2 : 1;
  const { articulationPoints, bridges } = findCuts(graph);
  const nonIsolatedConnected = components.filter((component) => component.some((node) => graph.degree(node) > 0)).length <= 1;
  const oddDegrees = nodes.filter((node) => graph.degree(node) % 2 === 1).length;
  const maxPossibleEdges = (graph.order * (graph.order - 1)) / 2;

  return {
    order: graph.order,
    size: graph.size,
    density: maxPossibleEdges === 0 ? 0 : graph.size / maxPossibleEdges,
    averageDegree: graph.order === 0 ? 0 : degreeSum / graph.order,
    componentCount: components.length,
    componentSizes: components.map((component) => component.length),
    isolatedCount,
    minDegree: Number.isFinite(minDegree) ? minDegree : 0,
    maxDegree,
    diameter,
    radius,
    centers,
    girth: Number.isFinite(girth) ? girth : null,
    clusteringCoefficient: nodes.length === 0 ? 0 : clusteringSum / nodes.length,
    articulationPoints: articulationPoints.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    bridges,
    eulerian: !nonIsolatedConnected || (oddDegrees !== 0 && oddDegrees !== 2)
      ? 'none'
      : oddDegrees === 0 ? 'circuit' : 'trail',
    bipartite: testBipartite(graph),
    planar: testPlanar(graph),
    degreeDistribution: [...degreeCounts.entries()]
      .sort(([first], [second]) => first - second)
      .map(([degree, count]) => ({ degree, count })),
    centrality: Object.fromEntries(nodes.map((node) => [node, {
      degree: nodes.length > 1 ? graph.degree(node) / (nodes.length - 1) : 0,
      closeness: closeness.get(node) ?? 0,
      betweenness: (betweenness.get(node) ?? 0) / betweennessNormalizer,
      pageRank: pageRank.get(node) ?? 0,
      eigenvector: eigenvector.get(node) ?? 0,
    }])),
  };
}
