import type { GraphMetrics, NodeCentrality } from '../lib/analyzeGraph';

type Props = {
  metrics: GraphMetrics;
  bipartitionVisible: boolean;
  onToggleBipartition: () => void;
};

const format = (value: number, digits = 3) => new Intl.NumberFormat('en-US', {
  maximumFractionDigits: digits,
}).format(value);

const CENTRALITY_LABELS: Array<[keyof NodeCentrality, string]> = [
  ['degree', 'Degree'],
  ['closeness', 'Closeness'],
  ['betweenness', 'Betweenness'],
  ['pageRank', 'PageRank'],
  ['eigenvector', 'Eigenvector'],
];

export default function AdvancedAnalysis({ metrics, bipartitionVisible, onToggleBipartition }: Props) {
  const topCentrality = Object.entries(metrics.centrality)
    .sort(([, first], [, second]) => second.betweenness - first.betweenness)
    .slice(0, 8);
  const maxDistributionCount = Math.max(1, ...metrics.degreeDistribution.map(({ count }) => count));

  return (
    <div className="analysis-panel-content">
      <div className="panel-title-row">
        <div><span className="eyebrow">Structure</span><h3>Deep analysis</h3></div>
        <span className="analysis-badge">Exact</span>
      </div>

      <div className="analysis-grid">
        <article><span>Diameter</span><strong>{metrics.diameter ?? '—'}</strong><small>Longest shortest path; undefined when disconnected.</small></article>
        <article><span>Radius</span><strong>{metrics.radius ?? '—'}</strong><small>Minimum vertex eccentricity.</small></article>
        <article><span>Girth</span><strong>{metrics.girth ?? 'Acyclic'}</strong><small>Length of the shortest cycle.</small></article>
        <article><span>Clustering</span><strong>{format(metrics.clusteringCoefficient)}</strong><small>Average local neighbor connectivity.</small></article>
      </div>

      <div className="property-list">
        <div><span>Planar</span><strong className={metrics.planar ? 'positive' : 'negative'}>{metrics.planar ? 'Yes' : 'No'}</strong></div>
        <div><span>Bipartite</span><strong className={metrics.bipartite ? 'positive' : 'negative'}>{metrics.bipartite ? 'Yes' : 'No'}</strong></div>
        <div><span>Eulerian</span><strong>{metrics.eulerian === 'none' ? 'No' : metrics.eulerian}</strong></div>
        <div><span>Hamiltonian</span><strong>{metrics.hamiltonian === 'unknown' ? 'Unknown (>16 vertices)' : metrics.hamiltonian}</strong></div>
        <div><span>Center</span><strong>{metrics.centers.join(', ') || '—'}</strong></div>
        <div><span>Articulation points</span><strong>{metrics.articulationPoints.join(', ') || 'None'}</strong></div>
        <div><span>Bridges</span><strong>{metrics.bridges.length}</strong></div>
      </div>

      {metrics.bipartite && (
        <button type="button" className="panel-secondary" onClick={onToggleBipartition}>
          {bipartitionVisible ? 'Hide bipartition colors' : 'Color the two partitions'}
        </button>
      )}

      <section className="distribution" aria-labelledby="distribution-title">
        <div className="subheading"><span id="distribution-title">Degree distribution</span><small>vertices per degree</small></div>
        <div className="distribution-chart">
          {metrics.degreeDistribution.map(({ degree, count }) => (
            <div key={degree} title={`Degree ${degree}: ${count} vertices`}>
              <span style={{ height: `${Math.max(5, (count / maxDistributionCount) * 100)}%` }} />
              <small>{degree}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="centrality-table" aria-labelledby="centrality-title">
        <div className="subheading"><span id="centrality-title">Centrality</span><small>top by betweenness</small></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Vertex</th>{CENTRALITY_LABELS.map(([, label]) => <th key={label}>{label}</th>)}</tr></thead>
            <tbody>
              {topCentrality.map(([node, values]) => (
                <tr key={node}><th>{node}</th>{CENTRALITY_LABELS.map(([key]) => <td key={key}>{format(values[key])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
