export type CanvasPattern = 'dots' | 'grid' | 'plain';

export type GraphAppearance = {
  nodeColor: string;
  edgeColor: string;
  accentColor: string;
  backgroundColor: string;
  patternColor: string;
  labelColor: string;
  pattern: CanvasPattern;
  nodeScale: number;
  edgeThickness: number;
  showLabels: boolean;
  glow: boolean;
};

export const DEFAULT_APPEARANCE: GraphAppearance = {
  nodeColor: '#58c7d9',
  edgeColor: '#315f69',
  accentColor: '#ffb86b',
  backgroundColor: '#09171b',
  patternColor: '#67d7e2',
  labelColor: '#dff7fa',
  pattern: 'dots',
  nodeScale: 1,
  edgeThickness: 1,
  showLabels: true,
  glow: true,
};

export const APPEARANCE_PRESETS: Array<{ name: string; description: string; value: GraphAppearance }> = [
  { name: 'Abyss', description: 'The Graph Lab original', value: DEFAULT_APPEARANCE },
  {
    name: 'Ultraviolet', description: 'Electric violet on midnight',
    value: { ...DEFAULT_APPEARANCE, nodeColor: '#b58cff', edgeColor: '#51437a', accentColor: '#ff7ac6', backgroundColor: '#100d20', patternColor: '#9b7bff', labelColor: '#f2eaff', pattern: 'grid' },
  },
  {
    name: 'Ember', description: 'Warm amber on charcoal',
    value: { ...DEFAULT_APPEARANCE, nodeColor: '#f6a94a', edgeColor: '#66503a', accentColor: '#ff6b57', backgroundColor: '#17130f', patternColor: '#e5963f', labelColor: '#fff2db', pattern: 'dots' },
  },
  {
    name: 'Blueprint', description: 'Crisp technical blue',
    value: { ...DEFAULT_APPEARANCE, nodeColor: '#66b5ff', edgeColor: '#315d87', accentColor: '#ffe066', backgroundColor: '#07182a', patternColor: '#4c9be8', labelColor: '#e4f2ff', pattern: 'grid', glow: false },
  },
  {
    name: 'Paper', description: 'A light, print-friendly canvas',
    value: { ...DEFAULT_APPEARANCE, nodeColor: '#167d91', edgeColor: '#91a6aa', accentColor: '#d55d35', backgroundColor: '#f3f0e8', patternColor: '#7d989d', labelColor: '#17343a', pattern: 'plain', glow: false },
  },
];

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const PATTERNS: CanvasPattern[] = ['dots', 'grid', 'plain'];

const boundedNumber = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

export function normalizeAppearance(value: unknown): GraphAppearance {
  if (!value || typeof value !== 'object') return { ...DEFAULT_APPEARANCE };
  const candidate = value as Partial<GraphAppearance>;
  const color = (input: unknown, fallback: string) => typeof input === 'string' && HEX_COLOR.test(input) ? input : fallback;
  return {
    nodeColor: color(candidate.nodeColor, DEFAULT_APPEARANCE.nodeColor),
    edgeColor: color(candidate.edgeColor, DEFAULT_APPEARANCE.edgeColor),
    accentColor: color(candidate.accentColor, DEFAULT_APPEARANCE.accentColor),
    backgroundColor: color(candidate.backgroundColor, DEFAULT_APPEARANCE.backgroundColor),
    patternColor: color(candidate.patternColor, DEFAULT_APPEARANCE.patternColor),
    labelColor: color(candidate.labelColor, DEFAULT_APPEARANCE.labelColor),
    pattern: PATTERNS.includes(candidate.pattern as CanvasPattern) ? candidate.pattern as CanvasPattern : DEFAULT_APPEARANCE.pattern,
    nodeScale: boundedNumber(candidate.nodeScale, DEFAULT_APPEARANCE.nodeScale, 0.6, 1.8),
    edgeThickness: boundedNumber(candidate.edgeThickness, DEFAULT_APPEARANCE.edgeThickness, 0.5, 3),
    showLabels: typeof candidate.showLabels === 'boolean' ? candidate.showLabels : DEFAULT_APPEARANCE.showLabels,
    glow: typeof candidate.glow === 'boolean' ? candidate.glow : DEFAULT_APPEARANCE.glow,
  };
}

export const APPEARANCE_STORAGE_KEY = 'graph-lab:appearance:v1';

export function loadAppearance(): GraphAppearance {
  try {
    const saved = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    return saved ? normalizeAppearance(JSON.parse(saved)) : { ...DEFAULT_APPEARANCE };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function saveAppearance(appearance: GraphAppearance) {
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    // Personalization still works for the current session when storage is unavailable.
  }
}
