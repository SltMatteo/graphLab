import { useMemo, useState } from 'react';
import GraphViewer from './components/GraphViewer';
import { createRandomGraph } from './lib/createRandomGraph';

const DEFAULT_NODES = 50;
const DEFAULT_EDGES = 80;

export default function App() {
  const [nodeCountInput, setNodeCountInput] = useState<number>(DEFAULT_NODES);
  const [edgeCountInput, setEdgeCountInput] = useState<number>(DEFAULT_EDGES);
  const [graphConfig, setGraphConfig] = useState({
    nodeCount: DEFAULT_NODES,
    edgeCount: DEFAULT_EDGES,
  });

  const maxEdges = useMemo(() => {
    const n = Math.max(0, nodeCountInput);
    return Math.floor((n * (n - 1)) / 2);
  }, [nodeCountInput]);

  const graph = useMemo(() => {
    return createRandomGraph(graphConfig.nodeCount, graphConfig.edgeCount);
  }, [graphConfig]);

  const handleGenerate = () => {
    const safeNodes = Math.max(0, Math.floor(nodeCountInput));
    const safeEdges = Math.max(0, Math.floor(edgeCountInput));
    const cappedEdges = Math.min(safeEdges, Math.floor((safeNodes * (safeNodes - 1)) / 2));

    setGraphConfig({
      nodeCount: safeNodes,
      edgeCount: cappedEdges,
    });
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

        <button className="primary-button" onClick={handleGenerate}>
          Generate graph
        </button>

        <div className="stats-card">
          <h2>Current graph</h2>
          <p>Nodes: {graph.order}</p>
          <p>Edges: {graph.size}</p>
        </div>
      </aside>

      <main className="viewer-panel">
        <GraphViewer graph={graph} />
      </main>
    </div>
  );
}

