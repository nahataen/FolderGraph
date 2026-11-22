import test from 'node:test';
import assert from 'node:assert/strict';
import { MarkdownParser } from './markdownParser';

test('MarkdownParser extracts wikilinks, relative links, and headings', () => {
  const parser = new MarkdownParser();
  const md = `
# Arquitectura Principal
Ver [[scanner]] y [[mermaidExporter#flow|Exportador]].
También revisa [Guía](./docs/guide.md).
## Subsistema FTS5
  `;

  const result = parser.parse(md);
  assert.ok(result.wikilinks.includes('scanner'));
  assert.ok(result.wikilinks.includes('mermaidExporter'));
  assert.ok(result.imports.includes('./docs/guide.md'));
  assert.equal(result.symbols.length, 2);
  assert.equal(result.symbols[0].name, 'Arquitectura Principal');
});
