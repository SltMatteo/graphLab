import { useEffect, useRef } from 'react';
import type Graph from 'graphology';
import Sigma from 'sigma';

type GraphViewerProps = {
  graph: Graph;
  selectedNode: string | null;
  onNodeSelect: (node: string | null) => void;
};

export default function GraphViewer({ graph, selectedNode, onNodeSelect }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<Sigma | null>(null);
  const selectedNodeRef = useRef(selectedNode);
  const hoveredNodeRef = useRef<string | null>(null);

  selectedNodeRef.current = selectedNode;

  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      allowInvalidContainer: false,
      defaultNodeType: 'circle',
      labelColor: { color: '#dff7fa' },
      labelFont: 'Inter, ui-sans-serif, system-ui, sans-serif',
      labelRenderedSizeThreshold: 11,
      labelSize: 12,
      minCameraRatio: 0.08,
      maxCameraRatio: 12,
      nodeReducer: (node, data) => {
        const focusedNode = hoveredNodeRef.current ?? selectedNodeRef.current;
        if (!focusedNode) return data;

        if (node === focusedNode) {
          return {
            ...data,
            color: '#ffb86b',
            forceLabel: true,
            highlighted: true,
            size: data.size * 1.55,
            zIndex: 2,
          };
        }

        if (graph.hasEdge(focusedNode, node)) {
          return {
            ...data,
            color: '#77e6ef',
            forceLabel: true,
            size: data.size * 1.15,
            zIndex: 1,
          };
        }

        return { ...data, color: '#274651', label: '', zIndex: 0 };
      },
      edgeReducer: (edge, data) => {
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
    renderer.on('clickStage', () => onNodeSelect(null));
    renderer.on('enterNode', ({ node }) => {
      hoveredNodeRef.current = node;
      renderer.getMouseCaptor().container.style.cursor = 'pointer';
      renderer.refresh();
    });
    renderer.on('leaveNode', () => {
      hoveredNodeRef.current = null;
      renderer.getMouseCaptor().container.style.cursor = 'default';
      renderer.refresh();
    });

    return () => {
      renderer.kill();
      rendererRef.current = null;
      hoveredNodeRef.current = null;
    };
  }, [graph, onNodeSelect]);

  useEffect(() => {
    rendererRef.current?.refresh();
  }, [selectedNode]);

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
        <button type="button" onClick={() => moveCamera('in')} title="Zoom in" aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => moveCamera('out')} title="Zoom out" aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={() => moveCamera('reset')} title="Reset view" aria-label="Reset view">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9V4h5M20 15v5h-5M5.2 6.8A8 8 0 0 1 19.4 10M18.8 17.2A8 8 0 0 1 4.6 14" />
          </svg>
        </button>
      </div>
    </div>
  );
}
