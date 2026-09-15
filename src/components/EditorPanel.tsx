import { useEffect, useState } from 'react';
import type Graph from 'graphology';

type Props = {
  graph: Graph;
  selectedNode: string | null;
  selectedEdge: string | null;
  connectMode: boolean;
  connectSource: string | null;
  onConnectModeChange: (active: boolean) => void;
  onAddNode: () => void;
  onRenameNode: (name: string) => void;
  onDeleteNode: () => void;
  onDeleteEdge: () => void;
};

export default function EditorPanel({
  graph, selectedNode, selectedEdge, connectMode, connectSource, onConnectModeChange,
  onAddNode, onRenameNode, onDeleteNode, onDeleteEdge,
}: Props) {
  const [name, setName] = useState(selectedNode ?? '');
  useEffect(() => setName(selectedNode ?? ''), [selectedNode]);
  const edgeEnds = selectedEdge && graph.hasEdge(selectedEdge) ? graph.extremities(selectedEdge) : null;

  return (
    <div className="editor-panel-content">
      <div className="panel-title-row"><div><span className="eyebrow">Canvas tools</span><h3>Graph editor</h3></div></div>
      <p className="panel-copy">Double-click empty space to add a vertex. Drag vertices to reposition them.</p>
      <div className="editor-actions">
        <button type="button" onClick={onAddNode}>+ Add vertex</button>
        <button type="button" className={connectMode ? 'active' : ''} onClick={() => onConnectModeChange(!connectMode)}>
          {connectMode ? (connectSource ? `From ${connectSource}…` : 'Choose first vertex') : 'Connect vertices'}
        </button>
      </div>

      <div className="panel-divider" />
      <span className="eyebrow">Selected vertex</span>
      {selectedNode ? (
        <form onSubmit={(event) => { event.preventDefault(); onRenameNode(name); }}>
          <div className="control-group"><label htmlFor="vertex-name">Label / ID</label><input id="vertex-name" value={name} onChange={(event) => setName(event.target.value)} /></div>
          <div className="editor-actions"><button type="submit">Rename</button><button type="button" className="danger" onClick={onDeleteNode}>Delete vertex</button></div>
        </form>
      ) : <p className="muted">Select a vertex on the canvas.</p>}

      <div className="panel-divider" />
      <span className="eyebrow">Selected edge</span>
      {edgeEnds ? (
        <div className="selected-edge"><strong>{edgeEnds[0]} — {edgeEnds[1]}</strong><button type="button" className="danger" onClick={onDeleteEdge}>Delete edge</button></div>
      ) : <p className="muted">Select an edge on the canvas.</p>}
    </div>
  );
}
