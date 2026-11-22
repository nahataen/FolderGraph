import type { FileParseResult, IFileParser, ParsedSymbol } from '../../../types/indexer';

export class MarkdownParser implements IFileParser {
  readonly extensions = ['.md', '.mdx'];

  parse(content: string): FileParseResult {
    const linesArray = content.split(/\r?\n/);
    const wikilinks = new Set<string>();
    const imports = new Set<string>();
    const symbols: ParsedSymbol[] = [];

    const wikiRegex = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
    let wikiMatch: RegExpExecArray | null;
    while ((wikiMatch = wikiRegex.exec(content)) !== null) {
      if (wikiMatch[1]) {
        const target = wikiMatch[1].trim();
        wikilinks.add(target);
        imports.add(target);
      }
    }

    const mdLinkRegex = /\[[^\]]+\]\(([^)#\s]+\.mdx?)\)/g;
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = mdLinkRegex.exec(content)) !== null) {
      if (linkMatch[1]) {
        imports.add(linkMatch[1].trim());
      }
    }

    linesArray.forEach((line, index) => {
      const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch?.[2]) {
        symbols.push({
          name: headingMatch[2].trim().slice(0, 48),
          kind: 'heading',
          line: index + 1,
        });
      }
    });

    return {
      lines: linesArray.length,
      imports: Array.from(imports),
      exports: [],
      symbols: symbols.slice(0, 12),
      wikilinks: Array.from(wikilinks),
    };
  }
}
