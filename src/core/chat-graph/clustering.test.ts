import test from 'node:test';
import assert from 'node:assert/strict';
import { computeChatTimelineGraph } from './clustering';

test('computeChatTimelineGraph orders X chronologically, branches Y by topic, and detects isolated nodes', () => {
  const messages = [
    { id: 'm1', sessionId: 's1', content: 'Revisar `scanner.ts` para mejorar el parser incremental de archivos.', timestamp: 1000 },
    { id: 'm2', sessionId: 's1', content: 'Necesitamos configurar el menú oscuro de la interfaz de usuario.', timestamp: 2000 },
    { id: 'm3', sessionId: 's1', content: 'Volver a `scanner.ts` y optimizar la lectura de carpetas grandes.', timestamp: 3000 },
    { id: 'm4', sessionId: 's1', content: 'Idea suelta: comprar café de grano mañana por la tarde.', timestamp: 4000 },
  ];

  const { nodes, edges } = computeChatTimelineGraph(messages);
  assert.equal(nodes.length, 4);
  assert.ok(nodes[0].xPos < nodes[1].xPos && nodes[1].xPos < nodes[2].xPos);

  // m1 and m3 share scanner.ts entity -> same Y lane and connected
  const m1 = nodes.find((n) => n.id === 'm1')!;
  const m3 = nodes.find((n) => n.id === 'm3')!;
  const m4 = nodes.find((n) => n.id === 'm4')!;

  assert.equal(m1.yPos, m3.yPos);
  assert.equal(m1.isIsolated, false);
  assert.equal(m3.isIsolated, false);
  assert.equal(m4.isIsolated, true);
  assert.ok(edges.some((e) => e.sourceId === 'm1' && e.targetId === 'm3' && e.connectionReason === 'entity'));
});
