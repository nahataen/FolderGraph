import path from 'node:path';
import type { FileParseResult, IFileParser } from '../../../types/indexer';
import { JsonParser } from './jsonParser';
import { MarkdownParser } from './markdownParser';
import { PythonParser } from './pythonParser';
import { TypeScriptParser } from './tsParser';

export class ParserRegistry {
  private readonly parserMap = new Map<string, IFileParser>();

  constructor(parsers?: IFileParser[]) {
    const activeParsers = parsers ?? [
      new TypeScriptParser(),
      new PythonParser(),
      new MarkdownParser(),
      new JsonParser(),
    ];

    for (const parser of activeParsers) {
      for (const ext of parser.extensions) {
        this.parserMap.set(ext.toLowerCase(), parser);
      }
    }
  }

  parseFile(filePath: string, content: string): FileParseResult {
    const ext = path.extname(filePath).toLowerCase();
    const parser = this.parserMap.get(ext);
    if (!parser) {
      return {
        lines: content.split(/\r?\n/).length,
        imports: [],
        exports: [],
        symbols: [],
        wikilinks: [],
      };
    }
    return parser.parse(content, filePath);
  }
}
