import type { FileParseResult, IFileParser, ParsedSymbol } from '../../../types/indexer';

export class PythonParser implements IFileParser {
  readonly extensions = ['.py'];

  parse(content: string): FileParseResult {
    const linesArray = content.split(/\r?\n/);
    const imports = new Set<string>();
    const exportsSet = new Set<string>();
    const symbols: ParsedSymbol[] = [];

    linesArray.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) return;

      const fromImport = trimmed.match(/^from\s+([A-Za-z0-9_.]+)\s+import\s+/);
      if (fromImport?.[1]) {
        imports.add(fromImport[1]);
      } else {
        const plainImport = trimmed.match(/^import\s+([A-Za-z0-9_.,\s]+)/);
        if (plainImport?.[1]) {
          plainImport[1]
            .split(',')
            .map((item) => item.trim().split(/\s+as\s+/)[0])
            .filter(Boolean)
            .forEach((mod) => imports.add(mod));
        }
      }

      const classMatch = line.match(/^class\s+([A-Za-z_][A-Za-z0-9_]*)/);
      if (classMatch?.[1]) {
        symbols.push({ name: classMatch[1], kind: 'class', line: lineNum });
        exportsSet.add(classMatch[1]);
      }

      const defMatch = line.match(/^(?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
      if (defMatch?.[1] && !defMatch[1].startsWith('_')) {
        symbols.push({ name: defMatch[1], kind: 'function', line: lineNum });
        exportsSet.add(defMatch[1]);
      }
    });

    return {
      lines: linesArray.length,
      imports: Array.from(imports),
      exports: Array.from(exportsSet),
      symbols: symbols.slice(0, 18),
      wikilinks: [],
    };
  }
}
