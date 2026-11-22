import type { FileParseResult, IFileParser, ParsedSymbol } from '../../../types/indexer';

export class JsonParser implements IFileParser {
  readonly extensions = ['.json'];

  parse(content: string): FileParseResult {
    const lines = content.split(/\r?\n/).length;
    const imports: string[] = [];
    const symbols: ParsedSymbol[] = [];

    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const deps = parsed.dependencies as Record<string, unknown> | undefined;
        if (deps && typeof deps === 'object') {
          Object.keys(deps).slice(0, 12).forEach((pkg) => imports.push(pkg));
        }
        const scripts = parsed.scripts as Record<string, unknown> | undefined;
        if (scripts && typeof scripts === 'object') {
          Object.keys(scripts).slice(0, 8).forEach((scriptName) => {
            symbols.push({ name: `script:${scriptName}`, kind: 'config', line: 1 });
          });
        } else {
          Object.keys(parsed).slice(0, 8).forEach((key) => {
            symbols.push({ name: key, kind: 'config', line: 1 });
          });
        }
      }
    } catch {
      // Malformed JSON still gets indexed with line count safely
    }

    return {
      lines,
      imports,
      exports: [],
      symbols,
      wikilinks: [],
    };
  }
}
