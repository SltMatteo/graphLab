import {
  APPEARANCE_PRESETS,
  DEFAULT_APPEARANCE,
  type CanvasPattern,
  type GraphAppearance,
} from '../lib/appearance';

type AppearancePanelProps = {
  appearance: GraphAppearance;
  onChange: (appearance: GraphAppearance) => void;
};

const COLOR_FIELDS: Array<{ key: keyof GraphAppearance; label: string }> = [
  { key: 'nodeColor', label: 'Vertices' },
  { key: 'edgeColor', label: 'Edges' },
  { key: 'accentColor', label: 'Selection' },
  { key: 'backgroundColor', label: 'Canvas' },
  { key: 'patternColor', label: 'Pattern' },
  { key: 'labelColor', label: 'Labels' },
];

const PATTERNS: Array<{ value: CanvasPattern; label: string }> = [
  { value: 'dots', label: 'Dots' },
  { value: 'grid', label: 'Grid' },
  { value: 'plain', label: 'Plain' },
];

export default function AppearancePanel({ appearance, onChange }: AppearancePanelProps) {
  const update = <Key extends keyof GraphAppearance>(key: Key, value: GraphAppearance[Key]) =>
    onChange({ ...appearance, [key]: value });

  return (
    <div className="appearance-panel">
      <div className="panel-title-row"><div><span className="eyebrow">Personalize</span><h3>Appearance</h3></div></div>
      <p className="panel-copy">Create a look for this canvas. Your choices are saved automatically and included in PNG exports.</p>

      <p className="appearance-subheading">Presets</p>
      <div className="preset-grid">
        {APPEARANCE_PRESETS.map((preset) => {
          const active = Object.entries(preset.value).every(([key, value]) => appearance[key as keyof GraphAppearance] === value);
          return (
            <button key={preset.name} type="button" className={active ? 'active' : ''} onClick={() => onChange({ ...preset.value })} title={preset.description}>
              <span className="preset-swatch" style={{ background: preset.value.backgroundColor }}>
                <i style={{ background: preset.value.nodeColor }} />
                <i style={{ background: preset.value.accentColor }} />
              </span>
              <span>{preset.name}</span>
            </button>
          );
        })}
      </div>

      <p className="appearance-subheading">Palette</p>
      <div className="color-grid">
        {COLOR_FIELDS.map(({ key, label }) => (
          <label key={key} className="color-field">
            <span>{label}</span>
            <span className="color-input-wrap">
              <input type="color" value={appearance[key] as string} onChange={(event) => update(key, event.target.value)} aria-label={`${label} color`} />
              <code>{(appearance[key] as string).toUpperCase()}</code>
            </span>
          </label>
        ))}
      </div>

      <p className="appearance-subheading">Canvas pattern</p>
      <div className="appearance-segments">
        {PATTERNS.map(({ value, label }) => <button key={value} type="button" className={appearance.pattern === value ? 'active' : ''} aria-pressed={appearance.pattern === value} onClick={() => update('pattern', value)}>{label}</button>)}
      </div>

      <label className="range-field">
        <span><span>Vertex size</span><strong>{appearance.nodeScale.toFixed(1)}×</strong></span>
        <input type="range" min={0.6} max={1.8} step={0.1} value={appearance.nodeScale} onChange={(event) => update('nodeScale', Number(event.target.value))} />
      </label>
      <label className="range-field">
        <span><span>Edge thickness</span><strong>{appearance.edgeThickness.toFixed(1)}×</strong></span>
        <input type="range" min={0.5} max={3} step={0.1} value={appearance.edgeThickness} onChange={(event) => update('edgeThickness', Number(event.target.value))} />
      </label>

      <div className="appearance-toggles">
        <label className="toggle-row"><input type="checkbox" checked={appearance.showLabels} onChange={(event) => update('showLabels', event.target.checked)} /><span>Show labels</span></label>
        <label className="toggle-row"><input type="checkbox" checked={appearance.glow} onChange={(event) => update('glow', event.target.checked)} /><span>Ambient glow</span></label>
      </div>

      <button className="panel-secondary appearance-reset" type="button" onClick={() => onChange({ ...DEFAULT_APPEARANCE })}>Reset appearance</button>
    </div>
  );
}
