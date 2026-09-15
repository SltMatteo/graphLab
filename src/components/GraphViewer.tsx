import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type Graph from 'graphology';
import Sigma from 'sigma';
import type { GraphAppearance } from '../lib/appearance';

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
  appearance: GraphAppearance;
  selectedNode: string | null;
  selectedEdge?: string | null;
  editMode?: boolean;
  visualState?: GraphVisualState;
  nodeColors?: Record<string, string>;
  onNodeSelect: (node: string | null) => void;
  onEdgeSelect?: (edge: string | null) => void;
  onGraphEdit?: (graph: Graph, message: string, previous?: Graph) => void;
};

function blendHex(foreground: string, background: string, opacity: number) {
  const channels = (color: string) => [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
  const foregroundChannels = channels(foreground);
  const backgroundChannels = channels(background);
  return `#${foregroundChannels.map((channel, index) => Math.round(channel * opacity + backgroundChannels[index] * (1 - opacity)).toString(16).padStart(2, '0')).join('')}`;
}

function paintBackground(context: CanvasRenderingContext2D, width: number, height: number, appearance: GraphAppearance) {
  context.fillStyle = appearance.backgroundColor;
  context.fillRect(0, 0, width, height);
  if (appearance.glow) {
    const glow = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.65);
    glow.addColorStop(0, `${appearance.accentColor}1f`);
    glow.addColorStop(1, `${appearance.accentColor}00`);
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
  }
  if (appearance.pattern === 'plain') return;

  context.save();
  context.globalAlpha = 0.2;
  context.strokeStyle = appearance.patternColor;
  context.fillStyle = appearance.patternColor;
  const spacing = 26 * Math.max(1, window.devicePixelRatio || 1);
  if (appearance.pattern === 'dots') {
    for (let x = spacing / 2; x < width; x += spacing) {
      for (let y = spacing / 2; y < height; y += spacing) {
        context.beginPath();
        context.arc(x, y, Math.max(1, window.devicePixelRatio || 1), 0, Math.PI * 2);
        context.fill();
      }
    }
  } else {
    context.lineWidth = Math.max(1, window.devicePixelRatio || 1);
    for (let x = spacing; x < width; x += spacing) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
    for (let y = spacing; y < height; y += spacing) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
  }
  context.restore();
}

const GraphViewer = forwardRef<GraphViewerHandle, GraphViewerProps>(function GraphViewer(
  {
    graph,
    appearance,
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
  const appearanceRef = useRef(appearance);

  selectedNodeRef.current = selectedNode;
  selectedEdgeRef.current = selectedEdge;
  editModeRef.current = editMode;
  visualStateRef.current = visualState;
  nodeColorsRef.current = nodeColors;
  onGraphEditRef.current = onGraphEdit;
  appearanceRef.current = appearance;

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
      paintBackground(context, output.width, output.height, appearanceRef.current);
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
      renderEdgeLabels: true,
      allowInvalidContainer: false,
      defaultNodeType: 'circle',
      enableEdgeEvents: true,
      labelColor: { color: appearanceRef.current.labelColor },
      labelFont: 'Inter, ui-sans-serif, system-ui, sans-serif',
      labelRenderedSizeThreshold: appearanceRef.current.showLabels ? 11 : Number.POSITIVE_INFINITY,
      labelSize: 12,
      minCameraRatio: 0.08,
      maxCameraRatio: 12,
      nodeReducer: (node, data) => {
        const currentAppearance = appearanceRef.current;
        const baseSize = data.size * currentAppearance.nodeScale;
        const label = currentAppearance.showLabels ? data.label : '';
        const forceLabel = currentAppearance.showLabels;
        const state = visualStateRef.current;
        const pathNodes = new Set(state?.pathNodes ?? []);
        const visited = new Set(state?.visited ?? []);
        const frontier = new Set(state?.frontier ?? []);
        const focusedNode = hoveredNodeRef.current ?? selectedNodeRef.current;
        const mappedColor = nodeColorsRef.current?.[node];

        if (state?.activeNode === node) {
          return { ...data, label, color: currentAppearance.accentColor, forceLabel, highlighted: true, size: baseSize * 1.6, zIndex: 5 };
        }
        if (pathNodes.has(node)) {
          return { ...data, label, color: '#ffd166', forceLabel, highlighted: true, size: baseSize * 1.35, zIndex: 4 };
        }
        if (frontier.has(node)) return { ...data, label, color: '#d98cff', forceLabel, size: baseSize * 1.2, zIndex: 3 };
        if (visited.has(node)) return { ...data, label, color: currentAppearance.nodeColor, forceLabel, size: baseSize * 1.1, zIndex: 2 };
        if (mappedColor) return { ...data, label, color: mappedColor, size: baseSize, zIndex: 1 };

        if (focusedNode) {
          if (node === focusedNode) {
            return { ...data, label, color: currentAppearance.accentColor, forceLabel, highlighted: true, size: baseSize * 1.55, zIndex: 2 };
          }
          if (graph.hasNode(focusedNode) && graph.hasEdge(focusedNode, node)) {
            return { ...data, label, color: blendHex(currentAppearance.nodeColor, '#ffffff', 0.72), forceLabel, size: baseSize * 1.15, zIndex: 1 };
          }
          return { ...data, color: blendHex(currentAppearance.nodeColor, currentAppearance.backgroundColor, 0.28), label: '', size: baseSize, zIndex: 0 };
        }

        if ((state?.visited || state?.frontier || state?.pathNodes) && !mappedColor) {
          return { ...data, color: blendHex(currentAppearance.nodeColor, currentAppearance.backgroundColor, 0.28), label: '', size: baseSize, zIndex: 0 };
        }
        return { ...data, color: currentAppearance.nodeColor, label, size: baseSize };
      },
      edgeReducer: (edge, data) => {
        const currentAppearance = appearanceRef.current;
        const baseSize = data.size * currentAppearance.edgeThickness;
        const label = currentAppearance.showLabels ? data.label : '';
        const state = visualStateRef.current;
        if (selectedEdgeRef.current === edge) return { ...data, label, color: currentAppearance.accentColor, size: baseSize * 2.2, zIndex: 5 };
        if (state?.pathEdges?.includes(edge)) return { ...data, label, color: '#ffd166', size: baseSize * 3, zIndex: 4 };
        if (state?.edges?.includes(edge)) return { ...data, label, color: currentAppearance.nodeColor, size: baseSize * 2.3, zIndex: 3 };
        const focusedNode = hoveredNodeRef.current ?? selectedNodeRef.current;
        if (!focusedNode) return { ...data, label, color: currentAppearance.edgeColor, size: baseSize };
        const [source, target] = graph.extremities(edge);
        const isAdjacent = source === focusedNode || target === focusedNode;
        return isAdjacent
          ? { ...data, label, color: currentAppearance.nodeColor, size: baseSize * 1.7, zIndex: 1 }
          : { ...data, label: '', color: blendHex(currentAppearance.edgeColor, currentAppearance.backgroundColor, 0.24), size: baseSize * 0.5, zIndex: 0 };
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
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.setSetting('labelColor', { color: appearance.labelColor });
    renderer.setSetting('labelRenderedSizeThreshold', appearance.showLabels ? 11 : Number.POSITIVE_INFINITY);
    renderer.refresh();
  }, [appearance, selectedNode, selectedEdge, visualState, nodeColors]);

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
