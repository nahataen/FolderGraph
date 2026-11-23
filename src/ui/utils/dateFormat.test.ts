import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNodeDateTooltip,
  formatCompactBadgeTime,
  formatFullDateTime,
  formatRelativeTime,
  formatShortDateTime,
} from './dateFormat';

test('formatRelativeTime and formatCompactBadgeTime render concise Spanish intervals', () => {
  const now = 1_700_000_000_000;
  assert.equal(formatRelativeTime(now - 10_000, now), 'ahora');
  assert.equal(formatRelativeTime(now - 5 * 60_000, now), 'hace 5 min');
  assert.equal(formatRelativeTime(now - 3 * 3600_000, now), 'hace 3 h');
  assert.equal(formatRelativeTime(now - 2 * 86_400_000, now), 'hace 2 d');

  assert.equal(formatCompactBadgeTime(now - 20_000, now), 'ahora');
  assert.equal(formatCompactBadgeTime(now - 12 * 60_000, now), 'hace 12m');
  assert.equal(formatCompactBadgeTime(now - 4 * 3600_000, now), 'hace 4h');
});

test('buildNodeDateTooltip includes both modification and creation formatted dates', () => {
  const mod = 1_700_000_000_000;
  const cre = 1_699_900_000_000;
  const tip = buildNodeDateTooltip('scanner.ts', mod, cre);
  assert.ok(tip.includes('scanner.ts'));
  assert.ok(tip.includes('Última mod.:'));
  assert.ok(tip.includes('Creado:'));
  assert.notEqual(formatShortDateTime(mod), '—');
  assert.notEqual(formatFullDateTime(cre), 'Sin fecha');
});
