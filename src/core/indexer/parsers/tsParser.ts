import type { FileParseResult, IFileParser, ParsedSymbol } from '../../../types/indexer';

export class TypeScriptParser implements IFileParser {
  readonly extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

  parse(content: string): FileParseResult {
    const linesArray = content.split(/\r?\n/);
    const imports = new Set<string>();
    const exportsSet = new Set<string>();
    const symbols: ParsedSymbol[] = [];
    const seenSymbols = new Set<string>();

    const importRegex = /(?:import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\))/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(content)) !== null) {
      const target = match[1] || match[2];
      if (target) {
        imports.add(target);
      }
    }

    linesArray.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
        return;
      }

      const classMatch = trimmed.match(/^(?:export\s+(?:default\s+)?)?(?:abstract\s+)?class\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
      if (classMatch?.[1]) {
        const name = classMatch[1];
        if (trimmed.startsWith('export')) exportsSet.add(name);
        if (!seenSymbols.has(`class:${name}`)) {
          seenSymbols.add(`class:${name}`);
          symbols.push({ name, kind: 'class', line: lineNum });
        }
      }

      const ifaceMatch = trimmed.match(/^(?:export\s+)?(?:interface|type)\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
      if (ifaceMatch?.[1]) {
        const name = ifaceMatch[1];
        if (trimmed.startsWith('export')) exportsSet.add(name);
        if (!seenSymbols.has(`interface:${name}`)) {
          seenSymbols.add(`interface:${name}`);
          symbols.push({ name, kind: 'interface', line: lineNum });
        }
      }

      const fnMatch = trimmed.match(
        /^(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/
      );
      if (fnMatch?.[1]) {
        const name = fnMatch[1];
        if (trimmed.startsWith('export')) exportsSet.add(name);
        if (!seenSymbols.has(`fn:${name}`)) {
          seenSymbols.add(`fn:${name}`);
          symbols.push({ name, kind: 'function', line: lineNum });
        }
      }

      const arrowMatch = trimmed.match(
        /^(?:export\s+)?(?:const|let)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::[^=]+)?=>/
      );
      if (arrowMatch?.[1]) {
        const name = arrowMatch[1];
        if (trimmed.startsWith('export')) exportsSet.add(name);
        if (!seenSymbols.has(`fn:${name}`)) {
          seenSymbols.add(`fn:${name}`);
          symbols.push({ name, kind: 'function', line: lineNum });
        }
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
