import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRoundedPolylinePath,
  computeDashedLaneGeometry,
  computeSpanBaseOffset,
  type EdgeNodeBound,
} from './edgeRouting';

test('buildRoundedPolylinePath produces smooth SVG M/L/Q path', () => {
  const path = buildRoundedPolylinePath([
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    { x: 200, y: 100 },
    { x: 200, y: 0 },
  ]);
  assert.ok(path.startsWith('M 0 0'));
  assert.ok(path.includes('Q '));
  assert.ok(path.endsWith('L 200.0 0.0'));
});

test('computeDashedLaneGeometry separates horizontal lanes by laneIndex', () => {
  const lane0 = computeDashedLaneGeometry({
    sourceX: 100,
    sourceY: 200,
    targetX: 340,
    targetY: 200,
    laneIndex: 0,
    baseOffset: 60,
  });
  const lane1 = computeDashedLaneGeometry({
    sourceX: 100,
    sourceY: 200,
    targetX: 460,
    targetY: 200,
    laneIndex: 1,
    baseOffset: 60,
  });

  assert.equal(lane0.labelY, 260);
  assert.equal(lane1.labelY, 282);
  assert.notEqual(lane0.labelY, lane1.labelY);
  assert.ok(lane0.labelX > 100 && lane0.labelX < 340);
});

test('computeSpanBaseOffset clears symbol clouds underneath file rows', () => {
  const bounds = new Map<string, EdgeNodeBound>([
    ['f1', { id: 'f1', left: 50, right: 150, top: 100, bottom: 140 }],
    ['sym1', { id: 'sym1', left: 60, right: 140, top: 170, bottom: 230 }],
    ['f2', { id: 'f2', left: 250, right: 350, top: 100, bottom: 140 }],
  ]);

  const offset = computeSpanBaseOffset('f1', 'f2', bounds);
  assert.equal(offset, 116);
});
