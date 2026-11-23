import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFsTimestamps } from './fsTimestamps';
import { scanWorkspaceDirectory } from './scanner';

test('readFsTimestamps reads file stat timestamps and preserves earlier createdAt', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strata-ts-'));
  try {
    const filePath = path.join(tmpDir, 'sample.ts');
    fs.writeFileSync(filePath, 'export const x = 1;\n', 'utf8');

    const first = readFsTimestamps(filePath);
    assert.ok(first.modifiedAt > 0);
    assert.ok(first.createdAt > 0);
    assert.ok(first.createdAt <= first.modifiedAt + 1000);

    const earlier = first.createdAt - 120_000;
    const preserved = readFsTimestamps(filePath, earlier);
    assert.equal(preserved.createdAt, earlier);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('scanWorkspaceDirectory populates createdAt and modifiedAt on folders, files, and symbols', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strata-scan-ts-'));
  try {
    const filePath = path.join(tmpDir, 'alpha.ts');
    fs.writeFileSync(filePath, 'export function greetUser() { return "hi"; }\n', 'utf8');

    const result = scanWorkspaceDirectory({
      id: 'ws-test',
      rootPath: tmpDir,
      name: 'tmp',
      watcherActive: false,
      lastScannedAt: Date.now(),
    });

    const fileNode = result.nodes.find((n) => n.name === 'alpha.ts');
    const symNode = result.nodes.find((n) => n.type === 'symbol' && n.name === 'greetUser');
    assert.ok(fileNode?.metadata.createdAt);
    assert.ok(fileNode?.metadata.modifiedAt);
    assert.equal(fileNode?.updatedAt, fileNode?.metadata.modifiedAt);
    assert.equal(symNode?.metadata.createdAt, fileNode?.metadata.createdAt);
    assert.equal(symNode?.metadata.modifiedAt, fileNode?.metadata.modifiedAt);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
