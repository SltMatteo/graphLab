import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Graph from 'graphology';
import AdvancedAnalysis from './components/AdvancedAnalysis';
import AlgorithmPanel from './components/AlgorithmPanel';
import EditorPanel from './components/EditorPanel';
import ExplorePanel from './components/ExplorePanel';
import GraphViewer, { type GraphViewerHandle, type GraphVisualState } from './components/GraphViewer';
import { analyzeGraph } from './lib/analyzeGraph';
import type { AlgorithmStep } from './lib/graphAlgorithms';
import {
  applyGraphLayout,
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

type WorkspaceMode = 'explore' | 'algorithms' | 'analysis' | 'edit';

const DEFAULT_CONFIG: GraphConfig = {
  kind: 'random', nodeCount: 36, edgeCount: 54, layout: 'circular', seed: 1738,
  layoutSeed: 1738, probability: 0.12, attachmentCount: 2, neighborCount: 4,
  rewireProbability: 0.2, regularDegree: 4,
};

const LAYOUTS: Array<{ value: GraphLayout; label: string }> = [
  { value: 'circular', label: 'Circle' },
  { value: 'random', label: 'Scatter' },
  { value: 'grid', label: 'Grid' },
];

const MODES: Array<{ value: WorkspaceMode; label: string }> = [
  { value: 'explore', label: 'Explore' },
  { value: 'algorithms', label: 'Algorithms' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'edit', label: 'Edit' },
];

const COLORING_PALETTE = ['#67d7e2', '#ffb86b', '#d98cff', '#8ce99a', '#ffd166', '#79a8ff', '#ff7f96'];
const randomSeed = () => Math.floor(Math.random() * 999_999_999) + 1;
const formatMetric = (value: number, digits = 2) => new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);

export default function App() {
  const [draft, setDraft] = useState(DEFAULT_CONFIG);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [graph, setGraph] = useState(() => createGraph(DEFAULT_CONFIG));
  const [graphTitle, setGraphTitle] = useState('Uniform random G(n, m)');
  const [mode, setMode] = useState<WorkspaceMode>('explore');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [nodeQuery, setNodeQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [lockTopology, setLockTopology] = useState(true);
  const [connectMode, setConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [visualState, setVisualState] = useState<GraphVisualState>();
  const [communityColors, setCommunityColors] = useState<Record<string, string>>();
  const [algorithmStep, setAlgorithmStep] = useState<AlgorithmStep | null>(null);
  const [bipartitionVisible, setBipartitionVisible] = useState(false);
  const viewerRef = useRef<GraphViewerHandle>(null);

  const metrics = useMemo(() => analyzeGraph(graph), [graph]);
  const maxEdges = getMaxEdgeCount(draft.nodeCount);
  const chosenKind = GRAPH_KINDS.find(({ value }) => value === draft.kind)!;
  const appliedKind = GRAPH_KINDS.find(({ value }) => value === config.kind)!;
  const displayNodeColors = useMemo(() => {
    if (communityColors) return communityColors;
    if (bipartitionVisible && metrics.bipartition) {
      return Object.fromEntries(Object.entries(metrics.bipartition).map(([node, partition]) => [node, partition === 0 ? '#67d7e2' : '#d98cff']));
    }
    if (!algorithmStep?.colors) return undefined;
    return Object.fromEntries(Object.entries(algorithmStep.colors).map(([node, color]) => [node, COLORING_PALETTE[color % COLORING_PALETTE.length]]));
  }, [algorithmStep, bipartitionVisible, communityColors, metrics.bipartition]);

  const selectedNodeDetails = useMemo(() => {
    if (selectedNode === null || !graph.hasNode(selectedNode)) return null;
    return {
      id: selectedNode,
      degree: graph.degree(selectedNode),
      neighbors: graph.neighbors(selectedNode).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    };
  }, [graph, selectedNode]);

  const parameterNote = useMemo(() => {
    const n = Math.max(1, Math.min(MAX_NODES, Math.floor(draft.nodeCount || 1)));
    if (draft.kind === 'random') return `${formatMetric(maxEdges, 0)} possible edges`;
    if (draft.kind === 'erdos-renyi') return `About ${formatMetric(maxEdges * Math.min(1, Math.max(0, draft.probability)), 0)} expected edges`;
    if (draft.kind === 'random-tree') return `Always ${Math.max(0, n - 1)} edges and one component`;
    if (draft.kind === 'random-regular') {
      let degree = Math.min(n - 1, Math.max(0, Math.floor(draft.regularDegree)));
      if ((n * degree) % 2 !== 0) degree -= 1;
      return `${degree}-regular · ${formatMetric((n * degree) / 2, 0)} edges`;
    }
    if (draft.kind === 'preferential') return 'New vertices favor already well-connected vertices';
    if (draft.kind === 'small-world') return 'Neighbor degree rounds down to an even number';
    return `${getEdgeCount(draft.kind, n, draft.edgeCount)} edges`;
  }, [draft, maxEdges]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 2400);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const clearVisuals = useCallback(() => {
    setVisualState(undefined);
    setCommunityColors(undefined);
    setAlgorithmStep(null);
    setBipartitionVisible(false);
  }, []);

  const handleAlgorithmStep = useCallback((step: AlgorithmStep | null) => {
    setAlgorithmStep(step);
    setVisualState(step ?? undefined);
  }, []);

  const applyGraphEdit = useCallback((next: Graph, message: string) => {
    setGraph(next);
    setGraphTitle('Custom graph');
    setSelectedNode((current) => current && next.hasNode(current) ? current : null);
    setSelectedEdge((current) => current && next.hasEdge(current) ? current : null);
    clearVisuals();
    setNotice(message);
  }, [clearVisuals]);

  const handleGenerate = (event: FormEvent) => {
    event.preventDefault();
    const nodeCount = Math.min(MAX_NODES, Math.max(1, Math.floor(draft.nodeCount || 1)));
    const maxEvenNeighbors = nodeCount > 2 ? nodeCount - 1 - ((nodeCount - 1) % 2) : 2;
    const nextConfig: GraphConfig = {
      ...draft,
      nodeCount,
      edgeCount: draft.kind === 'random' ? getEdgeCount(draft.kind, nodeCount, draft.edgeCount) : draft.edgeCount,
      seed: normalizeSeed(draft.seed),
      layoutSeed: draft.layout === 'random' ? randomSeed() : draft.layoutSeed,
      probability: Math.min(1, Math.max(0, draft.probability || 0)),
      attachmentCount: nodeCount > 1 ? Math.min(nodeCount - 1, Math.max(1, Math.floor(draft.attachmentCount || 1))) : 1,
      neighborCount: Math.min(maxEvenNeighbors, Math.max(2, Math.floor(draft.neighborCount || 2))),
      rewireProbability: Math.min(1, Math.max(0, draft.rewireProbability || 0)),
      regularDegree: Math.min(nodeCount - 1, Math.max(0, Math.floor(draft.regularDegree || 0))),
    };
    setDraft(nextConfig);
    setConfig(nextConfig);
    setGraph(createGraph(nextConfig));
    setGraphTitle(GRAPH_KINDS.find(({ value }) => value === nextConfig.kind)!.label);
    setSelectedNode(null); setSelectedEdge(null); setNodeQuery(''); clearVisuals();
  };

  const handleShuffle = () => {
    const nextConfig = { ...config, seed: randomSeed(), layoutSeed: randomSeed() };
    setDraft(nextConfig); setConfig(nextConfig); setGraph(createGraph(nextConfig));
    setGraphTitle(appliedKind.label); setSelectedNode(null); setSelectedEdge(null); clearVisuals();
    setNotice('Generated a new sample');
  };

  const handleLayoutChange = (layout: GraphLayout) => {
    const layoutSeed = layout === 'random' ? randomSeed() : config.layoutSeed;
    setDraft((current) => ({ ...current, layout, layoutSeed }));
    setConfig((current) => ({ ...current, layout, layoutSeed }));
    setGraph(applyGraphLayout(graph.copy(), layout, layoutSeed));
    clearVisuals();
  };

  const rerollLayout = () => {
    if (config.layout !== 'random') return;
    const layoutSeed = randomSeed();
    if (lockTopology) {
      setGraph(applyGraphLayout(graph.copy(), config.layout, layoutSeed));
      setDraft((current) => ({ ...current, layoutSeed }));
      setConfig((current) => ({ ...current, layoutSeed }));
      setNotice('Rerolled positions; topology stayed locked');
    } else {
      const nextConfig = { ...config, seed: randomSeed(), layoutSeed };
      setDraft(nextConfig); setConfig(nextConfig); setGraph(createGraph(nextConfig));
      setGraphTitle(appliedKind.label); setNotice('Rerolled topology and positions');
    }
    clearVisuals();
  };

  const handleModeChange = (nextMode: WorkspaceMode) => {
    setMode(nextMode); setConnectMode(false); setConnectSource(null); clearVisuals();
  };

  const handleNodeSelect = useCallback((node: string | null) => {
    if (node && mode === 'edit' && connectMode) {
      if (!connectSource) {
        setConnectSource(node); setSelectedNode(node); setNotice(`Choose a vertex to connect to ${node}`);
        return;
      }
      if (node === connectSource) {
        setNotice('Choose a different vertex');
        return;
      }
      if (graph.hasEdge(connectSource, node)) {
        setNotice('Those vertices are already connected');
      } else {
        const next = graph.copy();
        next.addEdge(connectSource, node, { weight: 1 });
        applyGraphEdit(next, `Connected ${connectSource} and ${node}`);
      }
      setConnectMode(false); setConnectSource(null); setSelectedNode(node);
      return;
    }
    setSelectedNode(node);
    setSelectedEdge(null);
  }, [applyGraphEdit, connectMode, connectSource, graph, mode]);

  const handleNodeSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = nodeQuery.trim();
    if (graph.hasNode(query)) { setSelectedNode(query); setNotice(`Selected vertex ${query}`); }
    else setNotice(`Vertex ${query || '—'} does not exist`);
  };

  const addNodeAtCenter = () => {
    const next = graph.copy();
    let index = graph.order;
    while (next.hasNode(String(index))) index += 1;
    const node = String(index);
    next.addNode(node, { label: node, size: 6, color: '#58c7d9', x: (Math.random() - 0.5) * 20, y: (Math.random() - 0.5) * 20 });
    applyGraphEdit(next, `Added vertex ${node}`); setSelectedNode(node);
  };

  const renameSelectedNode = (name: string) => {
    if (!selectedNode) return;
    const nextName = name.trim();
    if (!nextName || (nextName !== selectedNode && graph.hasNode(nextName))) {
      setNotice(!nextName ? 'A vertex needs a name' : `Vertex ${nextName} already exists`); return;
    }
    if (nextName === selectedNode) return;
    const exported = graph.export();
    exported.nodes.forEach((node) => {
      if (node.key === selectedNode) {
        node.key = nextName;
        node.attributes = { ...(node.attributes ?? {}), label: nextName };
      }
    });
    exported.edges.forEach((edge) => {
      if (edge.source === selectedNode) edge.source = nextName;
      if (edge.target === selectedNode) edge.target = nextName;
    });
    const next = new Graph({ type: 'undirected', multi: false, allowSelfLoops: false });
    next.import(exported);
    applyGraphEdit(next, `Renamed ${selectedNode} to ${nextName}`);
    setSelectedNode(nextName);
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    const next = graph.copy(); next.dropNode(selectedNode);
    applyGraphEdit(next, `Deleted vertex ${selectedNode}`); setSelectedNode(null);
  };

  const deleteSelectedEdge = () => {
    if (!selectedEdge || !graph.hasEdge(selectedEdge)) return;
    const [source, target] = graph.extremities(selectedEdge);
    const next = graph.copy(); next.dropEdge(selectedEdge);
    applyGraphEdit(next, `Deleted edge ${source}–${target}`); setSelectedEdge(null);
  };

  const updateSelectedEdgeWeight = (weight: number) => {
    if (!selectedEdge || !graph.hasEdge(selectedEdge)) return;
    if (!Number.isFinite(weight) || weight <= 0) { setNotice('Edge weights must be positive'); return; }
    const next = graph.copy();
    next.mergeEdgeAttributes(selectedEdge, { weight, label: String(weight) });
    applyGraphEdit(next, `Updated edge weight to ${weight}`);
  };

  const copyEdgeList = async () => {
    const edgeList = graph.edges().map((edge) => graph.extremities(edge).join(' ')).join('\n');
    try { await navigator.clipboard.writeText(edgeList); setNotice(`Copied ${graph.size} edge${graph.size === 1 ? '' : 's'}`); }
    catch { setNotice('Could not access the clipboard'); }
  };

  const downloadGraph = () => {
    const payload = JSON.stringify({ format: 'graph-lab', version: 2, configuration: config, graph: graph.export() }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `graph-${config.kind}-${graph.order}-${config.seed}.json`; link.click();
    URL.revokeObjectURL(url); setNotice('Downloaded graph as JSON');
  };

  const exportPng = async () => { await viewerRef.current?.exportPng(); setNotice('Exported visualization as PNG'); };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <header className="brand"><div className="brand-mark" aria-hidden="true"><span /><span /><span /></div><div><h1>Graph Lab</h1><p>Interactive graph playground</p></div></header>

        <form className="builder" onSubmit={handleGenerate}>
          <div className="section-heading"><span>Build</span><span className="section-index">01</span></div>
          <div className="control-group">
            <label htmlFor="graph-kind">Graph family</label>
            <select id="graph-kind" value={draft.kind} onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as GraphKind }))}>
              {GRAPH_KINDS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
            <small>{chosenKind.description}</small>
          </div>
          <div className={`input-grid ${draft.kind === 'random' ? '' : 'single-input'}`}>
            <div className="control-group"><label htmlFor="nodes">Vertices</label><input id="nodes" type="number" min={1} max={MAX_NODES} value={draft.nodeCount} onChange={(event) => setDraft((current) => ({ ...current, nodeCount: Number(event.target.value) }))} /></div>
            {draft.kind === 'random' && <div className="control-group"><label htmlFor="edges">Edges</label><input id="edges" type="number" min={0} max={maxEdges} value={getEdgeCount(draft.kind, draft.nodeCount, draft.edgeCount)} onChange={(event) => setDraft((current) => ({ ...current, edgeCount: Number(event.target.value) }))} /></div>}
          </div>
          {draft.kind === 'erdos-renyi' && <div className="control-group"><label htmlFor="probability">Edge probability (p)</label><input id="probability" type="number" min={0} max={1} step={0.01} value={draft.probability} onChange={(event) => setDraft((current) => ({ ...current, probability: Number(event.target.value) }))} /></div>}
          {draft.kind === 'preferential' && <div className="control-group"><label htmlFor="attachment-count">Links per new vertex</label><input id="attachment-count" type="number" min={1} max={Math.max(1, draft.nodeCount - 1)} value={draft.attachmentCount} onChange={(event) => setDraft((current) => ({ ...current, attachmentCount: Number(event.target.value) }))} /></div>}
          {draft.kind === 'random-regular' && <div className="control-group"><label htmlFor="regular-degree">Degree per vertex</label><input id="regular-degree" type="number" min={0} max={Math.max(0, draft.nodeCount - 1)} value={draft.regularDegree} onChange={(event) => setDraft((current) => ({ ...current, regularDegree: Number(event.target.value) }))} /><small>Vertex count × degree must be even; invalid values round down.</small></div>}
          {draft.kind === 'small-world' && <div className="input-grid model-parameters"><div className="control-group"><label htmlFor="neighbor-count">Neighbor degree</label><input id="neighbor-count" type="number" min={2} max={Math.max(2, draft.nodeCount - 1)} step={2} value={draft.neighborCount} onChange={(event) => setDraft((current) => ({ ...current, neighborCount: Number(event.target.value) }))} /></div><div className="control-group"><label htmlFor="rewire-probability">Rewire probability</label><input id="rewire-probability" type="number" min={0} max={1} step={0.05} value={draft.rewireProbability} onChange={(event) => setDraft((current) => ({ ...current, rewireProbability: Number(event.target.value) }))} /></div></div>}
          <p className="field-note">Up to {MAX_NODES} vertices · {parameterNote}</p>
          <div className="control-group"><div className="label-row"><label htmlFor="seed">Seed</label><button type="button" className="text-button" onClick={handleShuffle}>New sample</button></div><input id="seed" type="number" min={1} value={draft.seed} onChange={(event) => setDraft((current) => ({ ...current, seed: Number(event.target.value) }))} /></div>
          <button className="primary-button" type="submit">Generate graph<span aria-hidden="true">↗</span></button>
        </form>

        <section className="layout-section" aria-labelledby="layout-title">
          <div className="section-heading"><span id="layout-title">Arrange</span><span className="section-index">02</span></div>
          <div className="segmented-control">{LAYOUTS.map(({ value, label }) => <button key={value} type="button" className={config.layout === value ? 'active' : ''} aria-pressed={config.layout === value} onClick={() => handleLayoutChange(value)}>{label}</button>)}</div>
          <label className="toggle-row"><input type="checkbox" checked={lockTopology} onChange={(event) => setLockTopology(event.target.checked)} /><span>Lock topology when rerolling</span></label>
          <button className="reroll-button" type="button" disabled={config.layout !== 'random'} onClick={rerollLayout}>Reroll scatter</button>
        </section>

        <section className="data-section" aria-labelledby="data-title">
          <div className="section-heading"><span id="data-title">Export</span><span className="section-index">03</span></div>
          <div className="secondary-actions three-actions"><button type="button" onClick={copyEdgeList}>Edge list</button><button type="button" onClick={downloadGraph}>JSON</button><button type="button" onClick={exportPng}>PNG</button></div>
        </section>
        <p className="sidebar-footnote">Simple · undirected · no self-loops</p>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div className="header-left"><div><span className="eyebrow">Live graph</span><h2>{graphTitle}</h2></div><nav className="mode-tabs" aria-label="Workspace mode">{MODES.map(({ value, label }) => <button key={value} type="button" className={mode === value ? 'active' : ''} aria-pressed={mode === value} onClick={() => handleModeChange(value)}>{label}</button>)}</nav></div>
          <form className="node-search" onSubmit={handleNodeSearch}><label htmlFor="node-search">Find vertex</label><div><input id="node-search" placeholder="Vertex ID" value={nodeQuery} onChange={(event) => setNodeQuery(event.target.value)} /><button type="submit">Find</button></div></form>
        </header>

        <div className="visualization">
          <GraphViewer ref={viewerRef} graph={graph} selectedNode={selectedNode} selectedEdge={selectedEdge} editMode={mode === 'edit'} visualState={visualState} nodeColors={displayNodeColors} onNodeSelect={handleNodeSelect} onEdgeSelect={setSelectedEdge} onGraphEdit={applyGraphEdit} />

          <aside className={`tool-panel ${mode === 'analysis' ? 'analysis-tool-panel' : ''}`}>
            {mode === 'explore' && <ExplorePanel graph={graph} onPathChange={setVisualState} onCommunityColorsChange={setCommunityColors} />}
            {mode === 'algorithms' && <AlgorithmPanel graph={graph} onStepChange={handleAlgorithmStep} />}
            {mode === 'analysis' && <AdvancedAnalysis metrics={metrics} bipartitionVisible={bipartitionVisible} onToggleBipartition={() => setBipartitionVisible((visible) => !visible)} />}
            {mode === 'edit' && <EditorPanel graph={graph} selectedNode={selectedNode} selectedEdge={selectedEdge} connectMode={connectMode} connectSource={connectSource} onConnectModeChange={(active) => { setConnectMode(active); setConnectSource(null); }} onAddNode={addNodeAtCenter} onRenameNode={renameSelectedNode} onDeleteNode={deleteSelectedNode} onDeleteEdge={deleteSelectedEdge} onUpdateEdgeWeight={updateSelectedEdgeWeight} />}
          </aside>

          {mode === 'explore' && <aside className={`node-inspector ${selectedNodeDetails ? 'has-selection' : ''}`} aria-live="polite">
            {selectedNodeDetails ? <><div className="inspector-header"><div><span className="eyebrow">Selected vertex</span><h3>{selectedNodeDetails.id}</h3></div><button type="button" onClick={() => setSelectedNode(null)} aria-label="Clear selection">×</button></div><div className="degree-readout"><span>Degree</span><strong>{selectedNodeDetails.degree}</strong></div><p className="neighbor-label">Neighbors</p>{selectedNodeDetails.neighbors.length > 0 ? <div className="neighbor-list">{selectedNodeDetails.neighbors.slice(0, 24).map((neighbor) => <button type="button" key={neighbor} onClick={() => setSelectedNode(neighbor)}>{neighbor}</button>)}</div> : <p className="muted">This vertex is isolated.</p>}</> : <div className="inspector-empty"><div className="selection-symbol" aria-hidden="true">⌁</div><p>Select a vertex to inspect its neighborhood.</p></div>}
          </aside>}
        </div>

        <section className="metrics" aria-label="Graph metrics">
          <div className="metric"><span>Vertices</span><strong>{metrics.order}</strong></div><div className="metric"><span>Edges</span><strong>{metrics.size}</strong></div><div className="metric"><span>Density</span><strong>{formatMetric(metrics.density, 3)}</strong></div><div className="metric"><span>Avg. degree</span><strong>{formatMetric(metrics.averageDegree)}</strong></div><div className="metric"><span>Components</span><strong>{metrics.componentCount}</strong></div><div className="metric"><span>Degree range</span><strong>{metrics.minDegree}–{metrics.maxDegree}</strong></div>
        </section>
      </main>
      <div className={`toast ${notice ? 'show' : ''}`} role="status" aria-live="polite">{notice}</div>
    </div>
  );
}
