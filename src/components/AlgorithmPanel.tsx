import { useEffect, useMemo, useState } from 'react';
import type Graph from 'graphology';
import { runAlgorithm, type AlgorithmKind, type AlgorithmStep } from '../lib/graphAlgorithms';

type Props = {
  graph: Graph;
  onStepChange: (step: AlgorithmStep | null) => void;
};

const OPTIONS: Array<{ value: AlgorithmKind; label: string }> = [
  { value: 'bfs', label: 'Breadth-first search' },
  { value: 'dfs', label: 'Depth-first search' },
  { value: 'dijkstra', label: "Dijkstra's algorithm" },
  { value: 'mst', label: 'Minimum spanning forest' },
  { value: 'coloring', label: 'Greedy coloring' },
];

export default function AlgorithmPanel({ graph, onStepChange }: Props) {
  const [kind, setKind] = useState<AlgorithmKind>('bfs');
  const [start, setStart] = useState(graph.nodes()[0] ?? '');
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const run = useMemo(() => runAlgorithm(graph, kind, start), [graph, kind, start]);
  const step = run.steps[stepIndex] ?? null;

  useEffect(() => {
    setStepIndex(0);
    setPlaying(false);
  }, [graph, kind, start]);

  useEffect(() => {
    setStart(graph.nodes()[0] ?? '');
  }, [graph]);

  useEffect(() => onStepChange(step), [onStepChange, step]);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStepIndex((current) => {
        if (current >= run.steps.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 650);
    return () => window.clearInterval(timer);
  }, [playing, run.steps.length]);

  return (
    <div className="algorithm-panel-content">
      <div className="panel-title-row"><div><span className="eyebrow">Playback</span><h3>Algorithm visualizer</h3></div></div>
      <div className="control-group">
        <label htmlFor="algorithm">Algorithm</label>
        <select id="algorithm" value={kind} onChange={(event) => setKind(event.target.value as AlgorithmKind)}>
          {OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {!['mst', 'coloring'].includes(kind) && (
        <div className="control-group">
          <label htmlFor="algorithm-start">Start vertex</label>
          <select id="algorithm-start" value={start} onChange={(event) => setStart(event.target.value)}>
            {graph.nodes().map((node) => <option key={node} value={node}>{node}</option>)}
          </select>
        </div>
      )}

      <div className="algorithm-readout">
        <p>{step?.message ?? 'This graph has no vertices to visit.'}</p>
        <div><span>{run.complexity}</span><span>{step?.operations ?? 0} operations</span></div>
      </div>

      <input
        className="step-slider"
        type="range"
        min={0}
        max={Math.max(0, run.steps.length - 1)}
        value={Math.min(stepIndex, Math.max(0, run.steps.length - 1))}
        onChange={(event) => setStepIndex(Number(event.target.value))}
        aria-label="Algorithm step"
      />
      <div className="playback-row">
        <button type="button" onClick={() => setStepIndex(0)} aria-label="First step">↤</button>
        <button type="button" onClick={() => setStepIndex((index) => Math.max(0, index - 1))} aria-label="Previous step">←</button>
        <button type="button" className="play-button" onClick={() => setPlaying((value) => !value)}>{playing ? 'Pause' : 'Play'}</button>
        <button type="button" onClick={() => setStepIndex((index) => Math.min(run.steps.length - 1, index + 1))} aria-label="Next step">→</button>
        <span>{run.steps.length === 0 ? 0 : stepIndex + 1}/{run.steps.length}</span>
      </div>
      <div className="legend-row"><span className="legend-active">Active</span><span className="legend-frontier">Frontier</span><span className="legend-visited">Visited</span></div>
    </div>
  );
}
