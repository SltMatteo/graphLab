import { useMemo, useState } from 'react';
import GraphViewer from './components/GraphViewer';
import { createRandomGraph, type GraphLayout } from './lib/createRandomGraph';

const DEFAULT_NODES = 50;
const DEFAULT_EDGES = 80;
const DEFAULT_LAYOUT: GraphLayout = 'circular';

export default function App() {
  const [nodeCountInput, setNodeCountInput] = useState<number>(DEFAULT_NODES);
  const [edgeCountInput, setEdgeCountInput] = useState<number>(DEFAULT_EDGES);
  const [layout, setLayout] = useState<GraphLayout>(DEFAULT_LAYOUT);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [graphConfig, setGraphConfig] = useState({
    nodeCount: DEFAULT_NODES,
    edgeCount: DEFAULT_EDGES,
    seed: Date.now(),
  });

  const maxEdges = useMemo(() => {
    const n = Math.max(0, nodeCountInput);
    return Math.floor((n * (n - 1)) / 2);
  }, [nodeCountInput]);

  const graph = useMemo(() => {
    return createRandomGraph(graphConfig.nodeCount, graphConfig.edgeCount, layout, graphConfig.seed);
  }, [graphConfig, layout]);

  const selectedNodeDetails = useMemo(() => {
    if (!selectedNode || !graph.hasNode(selectedNode)) return null;

    return {
      id: selectedNode,
      degree: graph.degree(selectedNode),
      neighbors: graph.neighbors(selectedNode),
    };
  }, [graph, selectedNode]);

  const handleGenerate = () => {
    const safeNodes = Math.max(0, Math.floor(nodeCountInput));
    const safeEdges = Math.max(0, Math.floor(edgeCountInput));
    const cappedEdges = Math.min(safeEdges, Math.floor((safeNodes * (safeNodes - 1)) / 2));

    setGraphConfig({
      nodeCount: safeNodes,
      edgeCount: cappedEdges,
      seed: Date.now(),
    });
    setSelectedNode(null);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>Graph Lab</h1>
        <p className="subtitle">v1</p>

        <div className="control-group">
          <label htmlFor="nodes">Nodes</label>
          <input
            id="nodes"
            type="number"
            min={0}
            value={nodeCountInput}
            onChange={(event) => setNodeCountInput(Number(event.target.value))}
          />
        </div>

        <div className="control-group">
          <label htmlFor="edges">Edges</label>
          <input
            id="edges"
            type="number"
            min={0}
            max={maxEdges}
            value={edgeCountInput}
            onChange={(event) => setEdgeCountInput(Number(event.target.value))}
          />
          <small>Maximum simple undirected edges for this node count: {maxEdges}</small>
        </div>

        <div className="control-group">
          <label htmlFor="layout">Layout</label>
          <select
            id="layout"
            value={layout}
            onChange={(event) => {
              setLayout(event.target.value as GraphLayout);
              setSelectedNode(null);
            }}
          >
            <option value="circular">Circular</option>
            <option value="random">Random</option>
            <option value="grid">Grid</option>
          </select>
        </div>

        <button className="primary-button" onClick={handleGenerate}>
          Generate graph
        </button>

        <div className="stats-card">
          <h2>Current graph</h2>
          <p>Nodes: {graph.order}</p>
          <p>Edges: {graph.size}</p>
        </div>

        <div className="stats-card">
          <h2>Selected node</h2>
          {selectedNodeDetails ? (
            <>
              <p>ID: {selectedNodeDetails.id}</p>
              <p>Degree: {selectedNodeDetails.degree}</p>
              <p>
                Neighbors:{' '}
                {selectedNodeDetails.neighbors.length > 0
                  ? selectedNodeDetails.neighbors.join(', ')
                  : 'None'}
              </p>
            </>
          ) : (
            <p>No node selected</p>
          )}
        </div>
      </aside>

      <main className="viewer-panel">
        <GraphViewer graph={graph} selectedNode={selectedNode} onNodeSelect={setSelectedNode} />
      </main>
    </div>
  );
}
