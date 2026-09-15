import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_APPEARANCE, normalizeAppearance } from '../src/lib/appearance.ts';

test('appearance settings accept valid custom values', () => {
  const appearance = normalizeAppearance({
    ...DEFAULT_APPEARANCE,
    nodeColor: '#ABCDEF',
    pattern: 'grid',
    nodeScale: 1.4,
    edgeThickness: 2.2,
    showLabels: false,
  });

  assert.equal(appearance.nodeColor, '#ABCDEF');
  assert.equal(appearance.pattern, 'grid');
  assert.equal(appearance.nodeScale, 1.4);
  assert.equal(appearance.edgeThickness, 2.2);
  assert.equal(appearance.showLabels, false);
});

test('appearance settings recover safely from invalid persisted values', () => {
  const appearance = normalizeAppearance({
    nodeColor: 'cyan',
    backgroundColor: '#not-a-color',
    pattern: 'noise',
    nodeScale: 99,
    edgeThickness: -4,
    glow: 'yes',
  });

  assert.equal(appearance.nodeColor, DEFAULT_APPEARANCE.nodeColor);
  assert.equal(appearance.backgroundColor, DEFAULT_APPEARANCE.backgroundColor);
  assert.equal(appearance.pattern, DEFAULT_APPEARANCE.pattern);
  assert.equal(appearance.nodeScale, 1.8);
  assert.equal(appearance.edgeThickness, 0.5);
  assert.equal(appearance.glow, DEFAULT_APPEARANCE.glow);
});
