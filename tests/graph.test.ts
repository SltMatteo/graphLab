import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeGraph } from '../src/lib/analyzeGraph.ts';
import { createGraph, getEdgeCount, getMaxEdgeCount, type GraphConfig } from '../src/lib/createRandomGraph.ts';

const baseConfig: GraphConfig = {
  kind: 'random',
  nodeCount: 12,
  edgeCount: 18,
  layout: 'circular',
  seed: 42,
  layoutSeed: 42,
  probability: 0.12,
  attachmentCount: 2,
  neighborCount: 4,
  rewireProbability: 0.2,
  regularDegree: 4,
};

function edgeList(config: GraphConfig) {
  const graph = createGraph(config);
  return graph.edges().map((edge) => graph.extremities(edge).sort().join('-')).sort();
}

test('random graphs are reproducible for a given seed', () => {
  assert.deepEqual(edgeList(baseConfig), edgeList(baseConfig));
  assert.notDeepEqual(edgeList(baseConfig), edgeList({ ...baseConfig, seed: 43 }));
});

test('random graphs are simple and respect the requested edge count', () => {
  const graph = createGraph({ ...baseConfig, nodeCount: 20, edgeCount: 80 });
  assert.equal(graph.order, 20);
  assert.equal(graph.size, 80);
  assert.equal(graph.selfLoopCount, 0);
  assert.equal(graph.multi, false);
});

test('structured graph families have the expected sizes', () => {
  assert.equal(createGraph({ ...baseConfig, kind: 'path', nodeCount: 8 }).size, 7);
  assert.equal(createGraph({ ...baseConfig, kind: 'cycle', nodeCount: 8 }).size, 8);
  assert.equal(createGraph({ ...baseConfig, kind: 'star', nodeCount: 8 }).size, 7);
  assert.equal(createGraph({ ...baseConfig, kind: 'complete', nodeCount: 8 }).size, 28);
});

test('random tree, Erdős–Rényi, and growth models satisfy their invariants', () => {
  const tree = createGraph({ ...baseConfig, kind: 'random-tree', nodeCount: 20 });
  const emptyErdosRenyi = createGraph({ ...baseConfig, kind: 'erdos-renyi', probability: 0 });
  const fullErdosRenyi = createGraph({ ...baseConfig, kind: 'erdos-renyi', probability: 1 });
  const preferential = createGraph({ ...baseConfig, kind: 'preferential', nodeCount: 20 });
  const smallWorld = createGraph({ ...baseConfig, kind: 'small-world', nodeCount: 20 });

  assert.equal(tree.size, 19);
  assert.equal(analyzeGraph(tree).componentCount, 1);
  assert.equal(emptyErdosRenyi.size, 0);
  assert.equal(fullErdosRenyi.size, getMaxEdgeCount(baseConfig.nodeCount));
  assert.equal(analyzeGraph(preferential).componentCount, 1);
  assert.equal(smallWorld.size, 40);
});

test('random regular graphs give every vertex the requested degree', () => {
  const graph = createGraph({ ...baseConfig, kind: 'random-regular', nodeCount: 20, regularDegree: 6 });
  assert.equal(graph.size, 60);
  graph.forEachNode((node) => assert.equal(graph.degree(node), 6));
});

test('scatter positions can change without changing seeded topology', () => {
  const first = createGraph({ ...baseConfig, layout: 'random', layoutSeed: 10 });
  const second = createGraph({ ...baseConfig, layout: 'random', layoutSeed: 11 });

  assert.deepEqual(edgeList({ ...baseConfig, layout: 'random', layoutSeed: 10 }), edgeList({ ...baseConfig, layout: 'random', layoutSeed: 11 }));
  assert.notEqual(first.getNodeAttribute('0', 'x'), second.getNodeAttribute('0', 'x'));
});

test('edge helpers clamp values to a simple undirected graph', () => {
  assert.equal(getMaxEdgeCount(8), 28);
  assert.equal(getEdgeCount('random', 8, 100), 28);
  assert.equal(getEdgeCount('random', 8, -10), 0);
});

test('analysis reports components, isolates, density, and degrees', () => {
  const path = createGraph({ ...baseConfig, kind: 'path', nodeCount: 5 });
  const metrics = analyzeGraph(path);

  assert.equal(metrics.componentCount, 1);
  assert.equal(metrics.isolatedCount, 0);
  assert.equal(metrics.minDegree, 1);
  assert.equal(metrics.maxDegree, 2);
  assert.equal(metrics.averageDegree, 1.6);
  assert.equal(metrics.density, 0.4);
});

test('advanced analysis finds distances, cycles, cuts, and graph properties', () => {
  const path = createGraph({ ...baseConfig, kind: 'path', nodeCount: 5 });
  const pathMetrics = analyzeGraph(path);
  assert.equal(pathMetrics.diameter, 4);
  assert.equal(pathMetrics.radius, 2);
  assert.deepEqual(pathMetrics.centers, ['2']);
  assert.equal(pathMetrics.girth, null);
  assert.equal(pathMetrics.bridges.length, 4);
  assert.deepEqual(pathMetrics.articulationPoints, ['1', '2', '3']);
  assert.equal(pathMetrics.eulerian, 'trail');
  assert.equal(pathMetrics.bipartite, true);
  assert.equal(pathMetrics.planar, true);

  const cycle = analyzeGraph(createGraph({ ...baseConfig, kind: 'cycle', nodeCount: 5 }));
  assert.equal(cycle.girth, 5);
  assert.equal(cycle.eulerian, 'circuit');
  assert.equal(cycle.bipartite, false);

  const complete = analyzeGraph(createGraph({ ...baseConfig, kind: 'complete', nodeCount: 5 }));
  assert.equal(complete.planar, false);
  assert.equal(complete.clusteringCoefficient, 1);
});
