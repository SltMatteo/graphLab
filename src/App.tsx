import { FormEvent, useEffect, useMemo, useState } from 'react';
import GraphViewer from './components/GraphViewer';
import { analyzeGraph } from './lib/analyzeGraph';
import {
  createGraph,
  getEdgeCount,
  getMaxEdgeCount,
  GRAPH_KINDS,
  MAX_NODES,
  normalizeSeed,
  type GraphConfig,
  type GraphKind,
  type GraphLayout,
} from './lib/createRandomGraph';

const DEFAULT_CONFIG: GraphConfig = {
  kind: 'random',
  nodeCount: 36,
  edgeCount: 54,
  layout: 'circular',
  seed: 1738,
  layoutSeed: 1738,
  probability: 0.12,
  attachmentCount: 2,
  neighborCount: 4,
  rewireProbability: 0.2,
  regularDegree: 4,
};

const LAYOUTS: Array<{ value: GraphLayout; label: string }> = [
  { value: 'circular', label: 'Circle' },
  { value: 'random', label: 'Scatter' },
  { value: 'grid', label: 'Grid' },
];

function randomSeed() {
  return Math.floor(Math.random() * 999_999_999) + 1;
}

function formatMetric(value: number, digits = 2) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}

export default function App() {
  const [draft, setDraft] = useState(DEFAULT_CONFIG);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeQuery, setNodeQuery] = useState('');
  const [notice, setNotice] = useState('');

  const graph = useMemo(() => createGraph(config), [config]);
  const metrics = useMemo(() => analyzeGraph(graph), [graph]);
  const maxEdges = getMaxEdgeCount(draft.nodeCount);
  const chosenKind = GRAPH_KINDS.find(({ value }) => value === draft.kind)!;
  const appliedKind = GRAPH_KINDS.find(({ value }) => value === config.kind)!;

  const parameterNote = useMemo(() => {
    const n = Math.max(1, Math.min(MAX_NODES, Math.floor(draft.nodeCount || 1)));
    if (draft.kind === 'random') return `${formatMetric(maxEdges, 0)} possible edges`;
    if (draft.kind === 'erdos-renyi') {
      return `About ${formatMetric(maxEdges * Math.min(1, Math.max(0, draft.probability)), 0)} expected edges`;
    }
    if (draft.kind === 'random-tree') return `Always ${Math.max(0, n - 1)} edges and one component`;
    if (draft.kind === 'random-regular') {
      let degree = Math.min(n - 1, Math.max(0, Math.floor(draft.regularDegree)));
      if ((n * degree) % 2 !== 0) degree -= 1;
      return `${degree}-regular · ${formatMetric((n * degree) / 2, 0)} edges`;
    }
    if (draft.kind === 'preferential') return 'Each new vertex favors already well-connected vertices';
    if (draft.kind === 'small-world') return 'Neighbor degree is rounded down to an even number';
    return `${getEdgeCount(draft.kind, n, draft.edgeCount)} edges`;
  }, [draft, maxEdges]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 2400);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const selectedNodeDetails = useMemo(() => {
    if (selectedNode === null || !graph.hasNode(selectedNode)) return null;
    return {
      id: selectedNode,
      degree: graph.degree(selectedNode),
      neighbors: graph.neighbors(selectedNode).sort((a, b) => Number(a) - Number(b)),
    };
  }, [graph, selectedNode]);

  const handleGenerate = (event: FormEvent) => {
    event.preventDefault();
    const nodeCount = Math.min(MAX_NODES, Math.max(1, Math.floor(draft.nodeCount || 1)));
    const maxEvenNeighbors = nodeCount > 2
      ? nodeCount - 1 - ((nodeCount - 1) % 2)
      : 2;
    const nextConfig = {
      ...draft,
      nodeCount,
      edgeCount: draft.kind === 'random'
        ? getEdgeCount(draft.kind, nodeCount, draft.edgeCount)
        : draft.edgeCount,
      seed: normalizeSeed(draft.seed),
      layoutSeed: draft.layout === 'random' ? randomSeed() : draft.layoutSeed,
      probability: Math.min(1, Math.max(0, draft.probability || 0)),
      attachmentCount: nodeCount > 1
        ? Math.min(nodeCount - 1, Math.max(1, Math.floor(draft.attachmentCount || 1)))
        : 1,
      neighborCount: Math.min(maxEvenNeighbors, Math.max(2, Math.floor(draft.neighborCount || 2))),
      rewireProbability: Math.min(1, Math.max(0, draft.rewireProbability || 0)),
      regularDegree: Math.min(nodeCount - 1, Math.max(0, Math.floor(draft.regularDegree || 0))),
    };
    setDraft(nextConfig);
    setConfig(nextConfig);
    setSelectedNode(null);
    setNodeQuery('');
  };

  const handleShuffle = () => {
    const seed = randomSeed();
    const layoutSeed = randomSeed();
    setDraft((current) => ({ ...current, seed, layoutSeed }));
    setConfig((current) => ({ ...current, seed, layoutSeed }));
    setSelectedNode(null);
    setNotice('Generated a new sample');
  };

  const handleLayoutChange = (layout: GraphLayout) => {
    const layoutSeed = layout === 'random' ? randomSeed() : config.layoutSeed;
    setDraft((current) => ({ ...current, layout, layoutSeed }));
    setConfig((current) => ({ ...current, layout, layoutSeed }));
  };

  const handleNodeSearch = (event: FormEvent) => {
    event.preventDefault();
    const normalizedQuery = nodeQuery.trim();
    if (graph.hasNode(normalizedQuery)) {
      setSelectedNode(normalizedQuery);
      setNotice(`Selected vertex ${normalizedQuery}`);
    } else {
      setNotice(`Vertex ${normalizedQuery || '—'} does not exist`);
    }
  };

  const copyEdgeList = async () => {
    const edgeList = graph
      .edges()
      .map((edge) => graph.extremities(edge).join(' '))
      .join('\n');
    try {
      await navigator.clipboard.writeText(edgeList);
      setNotice(`Copied ${graph.size} edge${graph.size === 1 ? '' : 's'}`);
    } catch {
      setNotice('Could not access the clipboard');
    }
  };

  const downloadGraph = () => {
    const payload = JSON.stringify(
      {
        format: 'graph-lab',
        version: 1,
        configuration: config,
        graph: graph.export(),
      },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `graph-${config.kind}-${config.nodeCount}-${config.seed}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Downloaded graph as JSON');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <header className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <h1>Graph Lab</h1>
            <p>Interactive graph playground</p>
          </div>
        </header>

        <form className="builder" onSubmit={handleGenerate}>
          <div className="section-heading">
            <span>Build</span>
            <span className="section-index">01</span>
          </div>

          <div className="control-group">
            <label htmlFor="graph-kind">Graph family</label>
            <select
              id="graph-kind"
              value={draft.kind}
              onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as GraphKind }))}
            >
              {GRAPH_KINDS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <small>{chosenKind.description}</small>
          </div>

          <div className={`input-grid ${draft.kind === 'random' ? '' : 'single-input'}`}>
            <div className="control-group">
              <label htmlFor="nodes">Vertices</label>
              <input
                id="nodes"
                type="number"
                min={1}
                max={MAX_NODES}
                value={draft.nodeCount}
                onChange={(event) => setDraft((current) => ({ ...current, nodeCount: Number(event.target.value) }))}
              />
            </div>
            {draft.kind === 'random' && (
              <div className="control-group">
                <label htmlFor="edges">Edges</label>
                <input
                  id="edges"
                  type="number"
                  min={0}
                  max={maxEdges}
                  value={getEdgeCount(draft.kind, draft.nodeCount, draft.edgeCount)}
                  onChange={(event) => setDraft((current) => ({ ...current, edgeCount: Number(event.target.value) }))}
                />
              </div>
            )}
          </div>
          {draft.kind === 'erdos-renyi' && (
            <div className="control-group">
              <label htmlFor="probability">Edge probability (p)</label>
              <input
                id="probability"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={draft.probability}
                onChange={(event) => setDraft((current) => ({ ...current, probability: Number(event.target.value) }))}
              />
            </div>
          )}
          {draft.kind === 'preferential' && (
            <div className="control-group">
              <label htmlFor="attachment-count">Links per new vertex</label>
              <input
                id="attachment-count"
                type="number"
                min={1}
                max={Math.max(1, draft.nodeCount - 1)}
                value={draft.attachmentCount}
                onChange={(event) => setDraft((current) => ({ ...current, attachmentCount: Number(event.target.value) }))}
              />
            </div>
          )}
          {draft.kind === 'random-regular' && (
            <div className="control-group">
              <label htmlFor="regular-degree">Degree per vertex</label>
              <input
                id="regular-degree"
                type="number"
                min={0}
                max={Math.max(0, draft.nodeCount - 1)}
                value={draft.regularDegree}
                onChange={(event) => setDraft((current) => ({ ...current, regularDegree: Number(event.target.value) }))}
              />
              <small>The product of vertex count and degree must be even; invalid values round down.</small>
            </div>
          )}
          {draft.kind === 'small-world' && (
            <div className="input-grid model-parameters">
              <div className="control-group">
                <label htmlFor="neighbor-count">Neighbor degree</label>
                <input
                  id="neighbor-count"
                  type="number"
                  min={2}
                  max={Math.max(2, draft.nodeCount - 1)}
                  step={2}
                  value={draft.neighborCount}
                  onChange={(event) => setDraft((current) => ({ ...current, neighborCount: Number(event.target.value) }))}
                />
              </div>
              <div className="control-group">
                <label htmlFor="rewire-probability">Rewire probability</label>
                <input
                  id="rewire-probability"
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={draft.rewireProbability}
                  onChange={(event) => setDraft((current) => ({ ...current, rewireProbability: Number(event.target.value) }))}
                />
              </div>
            </div>
          )}
          <p className="field-note">Up to {MAX_NODES} vertices · {parameterNote}</p>

          <div className="control-group">
            <div className="label-row">
              <label htmlFor="seed">Seed</label>
              <button type="button" className="text-button" onClick={handleShuffle}>New sample</button>
            </div>
            <input
              id="seed"
              type="number"
              min={1}
              value={draft.seed}
              onChange={(event) => setDraft((current) => ({ ...current, seed: Number(event.target.value) }))}
            />
            <small>Controls the topology. Scatter positions refresh whenever you generate.</small>
          </div>

          <button className="primary-button" type="submit">
            Generate graph
            <span aria-hidden="true">↗</span>
          </button>
        </form>

        <section className="layout-section" aria-labelledby="layout-title">
          <div className="section-heading">
            <span id="layout-title">Arrange</span>
            <span className="section-index">02</span>
          </div>
          <div className="segmented-control">
            {LAYOUTS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={config.layout === value ? 'active' : ''}
                aria-pressed={config.layout === value}
                onClick={() => handleLayoutChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="data-section" aria-labelledby="data-title">
          <div className="section-heading">
            <span id="data-title">Take it with you</span>
            <span className="section-index">03</span>
          </div>
          <div className="secondary-actions">
            <button type="button" onClick={copyEdgeList}>Copy edge list</button>
            <button type="button" onClick={downloadGraph}>Download JSON</button>
          </div>
        </section>

        <p className="sidebar-footnote">Simple · undirected · no self-loops</p>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div>
            <span className="eyebrow">Live graph</span>
            <h2>{appliedKind.label}</h2>
          </div>
          <form className="node-search" onSubmit={handleNodeSearch}>
            <label htmlFor="node-search">Find vertex</label>
            <div>
              <input
                id="node-search"
                inputMode="numeric"
                placeholder={`0–${graph.order - 1}`}
                value={nodeQuery}
                onChange={(event) => setNodeQuery(event.target.value)}
              />
              <button type="submit" aria-label="Find vertex">Find</button>
            </div>
          </form>
        </header>

        <div className="visualization">
          <GraphViewer graph={graph} selectedNode={selectedNode} onNodeSelect={setSelectedNode} />

          <aside className={`node-inspector ${selectedNodeDetails ? 'has-selection' : ''}`} aria-live="polite">
            {selectedNodeDetails ? (
              <>
                <div className="inspector-header">
                  <div>
                    <span className="eyebrow">Selected vertex</span>
                    <h3>{selectedNodeDetails.id}</h3>
                  </div>
                  <button type="button" onClick={() => setSelectedNode(null)} aria-label="Clear selected vertex">×</button>
                </div>
                <div className="degree-readout">
                  <span>Degree</span>
                  <strong>{selectedNodeDetails.degree}</strong>
                </div>
                <p className="neighbor-label">Neighbors</p>
                {selectedNodeDetails.neighbors.length > 0 ? (
                  <div className="neighbor-list">
                    {selectedNodeDetails.neighbors.slice(0, 24).map((neighbor) => (
                      <button type="button" key={neighbor} onClick={() => setSelectedNode(neighbor)}>{neighbor}</button>
                    ))}
                    {selectedNodeDetails.neighbors.length > 24 && (
                      <span>+{selectedNodeDetails.neighbors.length - 24}</span>
                    )}
                  </div>
                ) : <p className="muted">This vertex is isolated.</p>}
              </>
            ) : (
              <div className="inspector-empty">
                <div className="selection-symbol" aria-hidden="true">⌁</div>
                <p>Select a vertex to inspect its neighborhood.</p>
              </div>
            )}
          </aside>
        </div>

        <section className="metrics" aria-label="Graph metrics">
          <div className="metric"><span>Vertices</span><strong>{metrics.order}</strong></div>
          <div className="metric"><span>Edges</span><strong>{metrics.size}</strong></div>
          <div className="metric"><span>Density</span><strong>{formatMetric(metrics.density, 3)}</strong></div>
          <div className="metric"><span>Avg. degree</span><strong>{formatMetric(metrics.averageDegree)}</strong></div>
          <div className="metric"><span>Components</span><strong>{metrics.componentCount}</strong></div>
          <div className="metric"><span>Degree range</span><strong>{metrics.minDegree}–{metrics.maxDegree}</strong></div>
        </section>
      </main>
      <div className={`toast ${notice ? 'show' : ''}`} role="status" aria-live="polite">
        {notice}
      </div>
    </div>
  );
}
