import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type Graph from 'graphology';
import Sigma from 'sigma';

export type GraphVisualState = {
  activeNode?: string | null;
  visited?: string[];
  frontier?: string[];
  edges?: string[];
  pathNodes?: string[];
  pathEdges?: string[];
};

export type GraphViewerHandle = {
  exportPng: () => Promise<void>;
};

type GraphViewerProps = {
  graph: Graph;
  selectedNode: string | null;
  selectedEdge?: string | null;
  editMode?: boolean;
  visualState?: GraphVisualState;
  nodeColors?: Record<string, string>;
  onNodeSelect: (node: string | null) => void;
  onEdgeSelect?: (edge: string | null) => void;
  onGraphEdit?: (graph: Graph, message: string, previous?: Graph) => void;
};

const GraphViewer = forwardRef<GraphViewerHandle, GraphViewerProps>(function GraphViewer(
  {
    graph,
    selectedNode,
    selectedEdge = null,
    editMode = false,
    visualState,
    nodeColors,
    onNodeSelect,
    onEdgeSelect,
    onGraphEdit,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<Sigma | null>(null);
  const selectedNodeRef = useRef(selectedNode);
  const selectedEdgeRef = useRef(selectedEdge);
  const hoveredNodeRef = useRef<string | null>(null);
  const editModeRef = useRef(editMode);
  const visualStateRef = useRef(visualState);
  const nodeColorsRef = useRef(nodeColors);
  const onGraphEditRef = useRef(onGraphEdit);

  selectedNodeRef.current = selectedNode;
  selectedEdgeRef.current = selectedEdge;
  editModeRef.current = editMode;
  visualStateRef.current = visualState;
  nodeColorsRef.current = nodeColors;
  onGraphEditRef.current = onGraphEdit;

  useImperativeHandle(ref, () => ({
    exportPng: async () => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      renderer.refresh();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const layers = Object.values(renderer.getCanvases());
      const firstLayer = layers[0];
      if (!firstLayer) return;
      const output = document.createElement('canvas');
      output.width = firstLayer.width;
      output.height = firstLayer.height;
      const context = output.getContext('2d');
      if (!context) return;
      context.fillStyle = '#09171b';
      context.fillRect(0, 0, output.width, output.height);
      layers.forEach((layer) => context.drawImage(layer, 0, 0));
      const link = document.createElement('a');
      link.download = `graph-lab-${Date.now()}.png`;
      link.href = output.toDataURL('image/png');
      link.click();
    },
  }), []);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      allowInvalidContainer: false,
      defaultNodeType: 'circle',
      enableEdgeEvents: true,
      labelColor: { color: '#dff7fa' },
      labelFont: 'Inter, ui-sans-serif, system-ui, sans-serif',
      labelRenderedSizeThreshold: 11,
      labelSize: 12,
      minCameraRatio: 0.08,
      maxCameraRatio: 12,
      nodeReducer: (node, data) => {
        const state = visualStateRef.current;
        const pathNodes = new Set(state?.pathNodes ?? []);
        const visited = new Set(state?.visited ?? []);
        const frontier = new Set(state?.frontier ?? []);
        const focusedNode = hoveredNodeRef.current ?? selectedNodeRef.current;
        const mappedColor = nodeColorsRef.current?.[node];

        if (state?.activeNode === node) {
          return { ...data, color: '#ffb86b', forceLabel: true, highlighted: true, size: data.size * 1.6, zIndex: 5 };
        }
        if (pathNodes.has(node)) {
          return { ...data, color: '#ffd166', forceLabel: true, highlighted: true, size: data.size * 1.35, zIndex: 4 };
        }
        if (frontier.has(node)) return { ...data, color: '#d98cff', forceLabel: true, size: data.size * 1.2, zIndex: 3 };
        if (visited.has(node)) return { ...data, color: '#67d7e2', forceLabel: true, size: data.size * 1.1, zIndex: 2 };
        if (mappedColor) return { ...data, color: mappedColor, zIndex: 1 };

        if (focusedNode) {
          if (node === focusedNode) {
            return { ...data, color: '#ffb86b', forceLabel: true, highlighted: true, size: data.size * 1.55, zIndex: 2 };
          }
          if (graph.hasNode(focusedNode) && graph.hasEdge(focusedNode, node)) {
            return { ...data, color: '#77e6ef', forceLabel: true, size: data.size * 1.15, zIndex: 1 };
          }
          return { ...data, color: '#274651', label: '', zIndex: 0 };
        }

        if ((state?.visited || state?.frontier || state?.pathNodes) && !mappedColor) {
          return { ...data, color: '#274651', label: '', zIndex: 0 };
        }
        return data;
      },
      edgeReducer: (edge, data) => {
        const state = visualStateRef.current;
        if (selectedEdgeRef.current === edge) return { ...data, color: '#ffb86b', size: 2.2, zIndex: 5 };
        if (state?.pathEdges?.includes(edge)) return { ...data, color: '#ffd166', size: 3, zIndex: 4 };
        if (state?.edges?.includes(edge)) return { ...data, color: '#67d7e2', size: 2.3, zIndex: 3 };
        const focusedNode = hoveredNodeRef.current ?? selectedNodeRef.current;
        if (!focusedNode) return data;
        const [source, target] = graph.extremities(edge);
        const isAdjacent = source === focusedNode || target === focusedNode;
        return isAdjacent
          ? { ...data, color: '#4fb9c6', size: 1.7, zIndex: 1 }
          : { ...data, color: '#172e36', size: 0.5, zIndex: 0 };
      },
      zIndex: true,
    });

    rendererRef.current = renderer;
    renderer.on('clickNode', ({ node }) => onNodeSelect(node));
    renderer.on('clickEdge', ({ edge }) => onEdgeSelect?.(edge));
    renderer.on('clickStage', () => {
      onNodeSelect(null);
      onEdgeSelect?.(null);
    });
    renderer.on('doubleClickStage', ({ event }) => {
      if (!editModeRef.current || !onGraphEditRef.current) return;
      event.preventSigmaDefault();
      const position = renderer.viewportToGraph(event);
      const next = graph.copy();
      let index = graph.order;
      while (next.hasNode(String(index))) index += 1;
      const node = String(index);
      next.addNode(node, { label: node, size: 6, color: '#58c7d9', ...position });
      onGraphEditRef.current(next, `Added vertex ${node}`);
    });
    renderer.on('enterNode', ({ node }) => {
      hoveredNodeRef.current = node;
      renderer.getMouseCaptor().container.style.cursor = editModeRef.current ? 'grab' : 'pointer';
      renderer.refresh();
    });
    renderer.on('leaveNode', () => {
      hoveredNodeRef.current = null;
      renderer.getMouseCaptor().container.style.cursor = 'default';
      renderer.refresh();
    });

    let draggedNode: string | null = null;
    let graphBeforeDrag: Graph | null = null;
    renderer.on('downNode', ({ node, event }) => {
      if (!editModeRef.current) return;
      draggedNode = node;
      graphBeforeDrag = graph.copy();
      event.preventSigmaDefault();
      renderer.getCamera().disable();
      renderer.getMouseCaptor().container.style.cursor = 'grabbing';
    });
    const mouse = renderer.getMouseCaptor();
    mouse.on('mousemovebody', (event) => {
      if (!draggedNode) return;
      const position = renderer.viewportToGraph(event);
      graph.mergeNodeAttributes(draggedNode, position);
      renderer.refresh({ skipIndexation: true });
    });
    mouse.on('mouseup', () => {
      if (draggedNode && graphBeforeDrag && onGraphEditRef.current) {
        onGraphEditRef.current(graph.copy(), `Moved vertex ${draggedNode}`, graphBeforeDrag);
      }
      draggedNode = null;
      graphBeforeDrag = null;
      renderer.getCamera().enable();
      renderer.getMouseCaptor().container.style.cursor = 'default';
    });

    return () => {
      renderer.kill();
      rendererRef.current = null;
      hoveredNodeRef.current = null;
    };
  }, [graph, onEdgeSelect, onNodeSelect]);

  useEffect(() => {
    rendererRef.current?.refresh();
  }, [selectedNode, selectedEdge, visualState, nodeColors]);

  const moveCamera = (action: 'in' | 'out' | 'reset') => {
    const camera = rendererRef.current?.getCamera();
    if (!camera) return;
    if (action === 'in') void camera.animatedZoom({ duration: 180 });
    if (action === 'out') void camera.animatedUnzoom({ duration: 180 });
    if (action === 'reset') void camera.animatedReset({ duration: 240 });
  };

  return (
    <div className="graph-stage">
      <div
        ref={containerRef}
        className="graph-container"
        role="img"
        aria-label={`Interactive visualization with ${graph.order} vertices and ${graph.size} edges`}
      />
      <div className="camera-controls" aria-label="Graph view controls">
        <button type="button" onClick={() => moveCamera('in')} title="Zoom in" aria-label="Zoom in">+</button>
        <button type="button" onClick={() => moveCamera('out')} title="Zoom out" aria-label="Zoom out">−</button>
        <button type="button" onClick={() => moveCamera('reset')} title="Reset view" aria-label="Reset view">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9V4h5M20 15v5h-5M5.2 6.8A8 8 0 0 1 19.4 10M18.8 17.2A8 8 0 0 1 4.6 14" />
          </svg>
        </button>
      </div>
    </div>
  );
});

export default GraphViewer;
