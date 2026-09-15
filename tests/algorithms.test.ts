import assert from 'node:assert/strict';
import { test } from 'node:test';
import Graph from 'graphology';
import { detectCommunities } from '../src/lib/communities.ts';
import { runAlgorithm, shortestPath } from '../src/lib/graphAlgorithms.ts';

function pathGraph(length: number) {
  const graph = new Graph({ type: 'undirected' });
  for (let node = 0; node < length; node += 1) graph.addNode(String(node));
  for (let node = 0; node < length - 1; node += 1) graph.addEdge(String(node), String(node + 1));
  return graph;
}

test('shortest path returns an ordered route', () => {
  const result = shortestPath(pathGraph(5), '0', '4');
  assert.deepEqual(result.nodes, ['0', '1', '2', '3', '4']);
  assert.equal(result.distance, 4);
});

test('search visualizers produce progressive steps and operation counts', () => {
  const graph = pathGraph(5);
  const bfs = runAlgorithm(graph, 'bfs', '0');
  const dfs = runAlgorithm(graph, 'dfs', '0');
  assert.deepEqual(bfs.steps.at(-1)?.visited, ['0', '1', '2', '3', '4']);
  assert.equal(dfs.steps.length, 5);
  assert.ok((bfs.steps.at(-1)?.operations ?? 0) > 0);
});

test('MST and coloring runs expose their final solutions', () => {
  const graph = pathGraph(5);
  const mst = runAlgorithm(graph, 'mst');
  const coloring = runAlgorithm(graph, 'coloring');
  assert.equal(mst.steps.at(-1)?.edges.length, 4);
  assert.equal(new Set(Object.values(coloring.steps.at(-1)?.colors ?? {})).size, 2);
});

test('community detection separates disconnected groups', () => {
  const graph = new Graph({ type: 'undirected' });
  ['0', '1', '2', '3', '4', '5'].forEach((node) => graph.addNode(node));
  graph.addEdge('0', '1'); graph.addEdge('1', '2'); graph.addEdge('2', '0');
  graph.addEdge('3', '4'); graph.addEdge('4', '5'); graph.addEdge('5', '3');
  const result = detectCommunities(graph);
  assert.equal(result.count, 2);
  assert.notEqual(result.assignments['0'], result.assignments['3']);
});
