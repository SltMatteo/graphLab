import { useEffect, useRef } from 'react';
import Sigma from 'sigma';
import Graph from 'graphology';

type GraphViewerProps = {
  graph: Graph;
};

export default function GraphViewer({ graph }: GraphViewerProps) {
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
    });

    return () => {
      rendererRef.current?.kill();
      rendererRef.current = null;
    };
  }, [graph]);

  return <div ref={containerRef} className="graph-container" />;
}
