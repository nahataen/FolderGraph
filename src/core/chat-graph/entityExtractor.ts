import type { FileNodeRecord } from '../../types/indexer';

export function extractReferencedEntities(content: string, knownFileNodes: FileNodeRecord[]): Set<string> {
  const entities = new Set<string>();
  const lowerContent = content.toLowerCase();

  const codePattern = /\b[A-Za-z0-9_-]+\.(?:ts|tsx|js|jsx|py|md|json|sql|css)\b/g;
  const fileMatches = content.match(codePattern) ?? [];
  for (const m of fileMatches) {
    entities.add(m.toLowerCase());
  }

  const backtickRegex = /`([^`]{2,48})`/g;
  let btMatch: RegExpExecArray | null;
  while ((btMatch = backtickRegex.exec(content)) !== null) {
    if (btMatch[1]) {
      entities.add(btMatch[1].trim().toLowerCase());
    }
  }

  for (const node of knownFileNodes) {
    if (node.name.length >= 4 && lowerContent.includes(node.name.toLowerCase())) {
      entities.add(node.name.toLowerCase());
    }
  }

  return entities;
}
