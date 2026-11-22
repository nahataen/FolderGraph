import test from 'node:test';
import assert from 'node:assert/strict';
import { TypeScriptParser } from './tsParser';

test('TypeScriptParser extracts imports, exports, classes, and functions', () => {
  const parser = new TypeScriptParser();
  const sample = `
    import { useState } from 'react';
    import { FileGraphRepository } from '../db/fileGraphRepo';

    export interface NodeConfig {
      id: string;
    }

    export class GraphBuilder {
      build() {}
    }

    export async function scanFolder(path: string) {
      return path;
    }

    export const formatLabel = (name: string) => name.trim();
  `;

  const result = parser.parse(sample);
  assert.deepEqual(result.imports, ['react', '../db/fileGraphRepo']);
  assert.ok(result.exports.includes('NodeConfig'));
  assert.ok(result.exports.includes('GraphBuilder'));
  assert.ok(result.exports.includes('scanFolder'));
  assert.ok(result.exports.includes('formatLabel'));
  assert.equal(result.symbols.some((s) => s.name === 'GraphBuilder' && s.kind === 'class'), true);
  assert.equal(result.symbols.some((s) => s.name === 'scanFolder' && s.kind === 'function'), true);
});
