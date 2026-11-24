import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  connectHarnessMcp,
  disconnectHarnessMcp,
  sanitizeSseUrl,
  scanInstalledHarnesses,
} from './harnessDetector';

function makeTempEnv() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stratagraph-harness-'));
  const homeDir = path.join(root, 'home');
  const binDir = path.join(root, 'bin');
  const projectDir = path.join(root, 'project');
  fs.mkdirSync(homeDir, { recursive: true });
  fs.mkdirSync(binDir, { recursive: true });
  fs.mkdirSync(projectDir, { recursive: true });
  return { root, homeDir, binDir, projectDir };
}

test('scanInstalledHarnesses detects binaries, config dirs, and MCP entries across Claude, Codex, Antigravity, DeepSeek, MiniMax, and VS Code', () => {
  const { root, homeDir, binDir, projectDir } = makeTempEnv();

  // Create mock executable binaries for claude, deepseek, code
  for (const bin of ['claude', 'deepseek', 'code']) {
    const p = path.join(binDir, bin);
    fs.writeFileSync(p, '#!/bin/sh\necho ok\n', { mode: 0o755 });
  }
  // Create config directories for codex, antigravity, minimax
  fs.mkdirSync(path.join(homeDir, '.codex'), { recursive: true });
  fs.mkdirSync(path.join(homeDir, '.gemini', 'antigravity'), { recursive: true });
  fs.mkdirSync(path.join(homeDir, '.minimax'), { recursive: true });

  const scan = scanInstalledHarnesses({
    mode: 'stdio',
    env: { homeDir, projectDir, pathDirs: [binDir], dbPath: path.join(root, 'db.sqlite') },
  });

  const byId = new Map(scan.harnesses.map((h) => [h.id, h]));
  assert.equal(byId.get('claude-code')?.installed, true);
  assert.equal(byId.get('claude-code')?.binaryPath, path.join(binDir, 'claude'));
  assert.equal(byId.get('codex')?.installed, true);
  assert.equal(byId.get('antigravity')?.installed, true);
  assert.equal(byId.get('deepseek')?.installed, true);
  assert.equal(byId.get('minimax')?.installed, true);
  assert.equal(byId.get('vscode')?.installed, true);
  assert.equal(byId.get('cursor')?.installed, false);
  assert.equal(scan.connectedCount, 0);

  fs.rmSync(root, { recursive: true, force: true });
});

test('connectHarnessMcp merges stratagraph without overwriting existing servers in JSON and Codex TOML, and disconnect removes cleanly', () => {
  const { root, homeDir, binDir, projectDir } = makeTempEnv();
  const env = { homeDir, projectDir, pathDirs: [binDir], dbPath: path.join(root, 'db.sqlite') };

  // Pre-seed Claude JSON and Codex TOML with existing configs
  const claudeCfg = path.join(homeDir, '.claude.json');
  fs.writeFileSync(
    claudeCfg,
    JSON.stringify({ mcpServers: { otherTool: { command: 'node', args: ['other.js'] } } }, null, 2)
  );
  const codexDir = path.join(homeDir, '.codex');
  fs.mkdirSync(codexDir, { recursive: true });
  const codexCfg = path.join(codexDir, 'config.toml');
  fs.writeFileSync(codexCfg, 'model = "gpt-5-codex"\n\n[mcp_servers.other]\ncommand = "echo"\n');

  const claudeAfter = connectHarnessMcp({ harnessId: 'claude-code', mode: 'stdio', env });
  assert.equal(claudeAfter.mcpConnected, true);
  assert.equal(claudeAfter.connectedMode, 'stdio');
  const parsedClaude = JSON.parse(fs.readFileSync(claudeCfg, 'utf8'));
  assert.ok(parsedClaude.mcpServers.otherTool, 'Should preserve existing MCP server');
  assert.ok(parsedClaude.mcpServers.stratagraph, 'Should insert stratagraph MCP server');

  const codexAfter = connectHarnessMcp({ harnessId: 'codex', mode: 'sse', sseUrl: 'http://127.0.0.1:3000', env });
  assert.equal(codexAfter.mcpConnected, true);
  assert.equal(codexAfter.connectedMode, 'sse');
  const codexRaw = fs.readFileSync(codexCfg, 'utf8');
  assert.ok(codexRaw.includes('model = "gpt-5-codex"'));
  assert.ok(codexRaw.includes('[mcp_servers.other]'));
  assert.ok(codexRaw.includes('[mcp_servers.stratagraph]'));
  assert.ok(codexRaw.includes('http://127.0.0.1:3000/mcp/sse'));

  // Disconnect both cleanly
  const claudeOff = disconnectHarnessMcp({ harnessId: 'claude-code', env });
  assert.equal(claudeOff.mcpConnected, false);
  const parsedAfterOff = JSON.parse(fs.readFileSync(claudeCfg, 'utf8'));
  assert.ok(parsedAfterOff.mcpServers.otherTool);
  assert.equal(parsedAfterOff.mcpServers.stratagraph, undefined);

  const codexOff = disconnectHarnessMcp({ harnessId: 'codex', env });
  assert.equal(codexOff.mcpConnected, false);
  const codexAfterOff = fs.readFileSync(codexCfg, 'utf8');
  assert.ok(codexAfterOff.includes('[mcp_servers.other]'));
  assert.ok(!codexAfterOff.includes('[mcp_servers.stratagraph]'));

  fs.rmSync(root, { recursive: true, force: true });
});

test('sanitizeSseUrl rejects unsafe schemes and preserves http/https origins cleanly', () => {
  assert.equal(sanitizeSseUrl('javascript:alert(1)'), 'http://127.0.0.1:3000/mcp/sse');
  assert.equal(sanitizeSseUrl('http://localhost:3000/anything'), 'http://localhost:3000/mcp/sse');
});
