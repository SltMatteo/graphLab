import { useEffect, useMemo, useState } from 'react';
import type Graph from 'graphology';
import { detectCommunities } from '../lib/communities';
import { shortestPath, type PathResult } from '../lib/graphAlgorithms';
import type { GraphVisualState } from './GraphViewer';

type Props = {
  graph: Graph;
  onPathChange: (state: GraphVisualState | undefined) => void;
  onCommunityColorsChange: (colors: Record<string, string> | undefined) => void;
};

const COMMUNITY_COLORS = ['#67d7e2', '#ffb86b', '#d98cff', '#8ce99a', '#ffd166', '#79a8ff', '#ff7f96', '#b8e986'];

export default function ExplorePanel({ graph, onPathChange, onCommunityColorsChange }: Props) {
  const nodes = graph.nodes();
  const [source, setSource] = useState(nodes[0] ?? '');
  const [target, setTarget] = useState(nodes[nodes.length - 1] ?? '');
  const [path, setPath] = useState<PathResult | null>(null);
  const [communitiesVisible, setCommunitiesVisible] = useState(false);
  const communities = useMemo(() => detectCommunities(graph), [graph]);

  useEffect(() => {
    const currentNodes = graph.nodes();
    setSource(currentNodes[0] ?? '');
    setTarget(currentNodes[currentNodes.length - 1] ?? '');
    setPath(null);
    setCommunitiesVisible(false);
    onPathChange(undefined);
    onCommunityColorsChange(undefined);
  }, [graph, onCommunityColorsChange, onPathChange]);

  const findPath = () => {
    const result = shortestPath(graph, source, target);
    setPath(result);
    onPathChange({ pathNodes: result.nodes, pathEdges: result.edges });
  };

  const toggleCommunities = () => {
    const next = !communitiesVisible;
    setCommunitiesVisible(next);
    onCommunityColorsChange(next
      ? Object.fromEntries(Object.entries(communities.assignments).map(([node, community]) => [node, COMMUNITY_COLORS[community % COMMUNITY_COLORS.length]]))
      : undefined);
  };

  return (
    <div className="explore-panel-content">
      <div className="panel-title-row"><div><span className="eyebrow">Routes</span><h3>Shortest path</h3></div></div>
      <div className="input-grid">
        <div className="control-group"><label htmlFor="path-source">From</label><select id="path-source" value={source} onChange={(event) => setSource(event.target.value)}>{nodes.map((node) => <option key={node}>{node}</option>)}</select></div>
        <div className="control-group"><label htmlFor="path-target">To</label><select id="path-target" value={target} onChange={(event) => setTarget(event.target.value)}>{nodes.map((node) => <option key={node}>{node}</option>)}</select></div>
      </div>
      <button type="button" className="panel-primary" onClick={findPath}>Find shortest path</button>
      {path && <p className="path-result">{path.distance === null ? 'No route connects these vertices.' : `${path.nodes.join(' → ')} · distance ${path.distance}`}</p>}

      <div className="panel-divider" />
      <div className="panel-title-row"><div><span className="eyebrow">Structure</span><h3>Communities</h3></div><strong>{communities.count}</strong></div>
      <p className="panel-copy">Label propagation groups vertices that are more densely connected to one another.</p>
      <div className="community-summary"><span>Modularity</span><strong>{communities.modularity.toFixed(3)}</strong></div>
      <button type="button" className="panel-secondary" onClick={toggleCommunities}>{communitiesVisible ? 'Hide communities' : 'Color communities'}</button>
    </div>
  );
}
