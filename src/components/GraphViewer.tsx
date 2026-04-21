import { useEffect, useRef } from 'react';
import Sigma from 'sigma';
import Graph from 'graphology';

type GraphViewerProps = {
  graph: Graph;
  selectedNode: string | null;
  onNodeSelect: (node: string | null) => void;
};

export default function GraphViewer({ graph, selectedNode, onNodeSelect }: GraphViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<Sigma | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (rendererRef.current) {
      rendererRef.current.kill();
      rendererRef.current = null;
    }

    rendererRef.current = new Sigma(graph, containerRef.current, {
      renderEdgeLabels: false,
      allowInvalidContainer: false,
      defaultNodeType: 'circle',
      labelRenderedSizeThreshold: 12,
      minCameraRatio: 0.08,
      maxCameraRatio: 10,
      nodeReducer: (node, data) => {
        if (node !== selectedNode) return data;

        return {
          ...data,
          color: '#f97316',
          forceLabel: true,
          highlighted: true,
          size: data.size * 1.8,
        };
      },
    });

    rendererRef.current.on('clickNode', ({ node }) => {
      onNodeSelect(node);
    });

    rendererRef.current.on('clickStage', () => {
      onNodeSelect(null);
    });

    return () => {
      rendererRef.current?.kill();
      rendererRef.current = null;
    };
  }, [graph, onNodeSelect, selectedNode]);

  return <div ref={containerRef} className="graph-container" />;
}
