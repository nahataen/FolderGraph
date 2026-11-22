import type { ChatConnectionReason, ChatEdgeRecord, ChatNodeRecord } from '../../types/chatGraph';
import type { FileNodeRecord } from '../../types/indexer';
import { extractReferencedEntities } from './entityExtractor';
import { buildTfIdfVectors, cosineSimilarityDense, cosineSimilarityMap, tokenizeText } from './tfidf';

const X_STEP = 270;
const Y_STEP = 155;

function inferTopicLabel(content: string, entities: Set<string>): string {
  if (entities.size > 0) {
    const first = Array.from(entities)[0];
    return first.length > 22 ? first.slice(0, 22) : first;
  }
  const tokens = tokenizeText(content);
  if (tokens.length === 0) return 'General';
  const top = tokens.slice(0, 2).map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return top.join(' · ');
}

export function computeChatTimelineGraph(
  rawNodes: Array<{
    id: string;
    sessionId: string;
    content: string;
    timestamp: number;
    embedding?: number[] | null;
  }>,
  knownFileNodes: FileNodeRecord[] = []
): { nodes: ChatNodeRecord[]; edges: ChatEdgeRecord[] } {
  const sorted = [...rawNodes].sort((a, b) => a.timestamp - b.timestamp);
  if (sorted.length === 0) {
    return { nodes: [], edges: [] };
  }

  const vectors = buildTfIdfVectors(sorted.map((n) => n.content));
  const entitiesList = sorted.map((n) => extractReferencedEntities(n.content, knownFileNodes));
  const edges: ChatEdgeRecord[] = [];
  const connectedIds = new Set<string>();

  const assignedCluster: string[] = new Array(sorted.length).fill('');
  const topicOrder: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    let bestPrevIdx = -1;
    let bestScore = 0;
    let bestReason: ChatConnectionReason = 'keyword';

    for (let j = i - 1; j >= 0; j--) {
      const lexical = cosineSimilarityMap(vectors[i], vectors[j]);
      const sharedEntities = Array.from(entitiesList[i]).filter((e) => entitiesList[j].has(e));
      const entityScore = sharedEntities.length > 0 ? Math.min(0.95, 0.48 + sharedEntities.length * 0.2) : 0;

      const embA = sorted[i].embedding;
      const embB = sorted[j].embedding;
      const semantic = embA && embB ? cosineSimilarityDense(embA, embB) : 0;

      const timeDiffMinutes = Math.abs(sorted[i].timestamp - sorted[j].timestamp) / 60_000;
      const temporalBoost = timeDiffMinutes <= 15 && lexical > 0.08 ? 0.08 : 0;

      const combined = Math.max(semantic, entityScore, lexical + temporalBoost);
      if (combined >= 0.22 && combined > bestScore) {
        bestScore = combined;
        bestPrevIdx = j;
        if (semantic >= entityScore && semantic >= lexical + temporalBoost && semantic >= 0.68) {
          bestReason = 'semantic';
        } else if (entityScore >= lexical + temporalBoost && sharedEntities.length > 0) {
          bestReason = 'entity';
        } else {
          bestReason = 'keyword';
        }
      }
    }

    if (bestPrevIdx !== -1) {
      const clusterName = assignedCluster[bestPrevIdx];
      assignedCluster[i] = clusterName;
      edges.push({
        id: `cedge:${sorted[bestPrevIdx].id}:${sorted[i].id}`,
        sourceId: sorted[bestPrevIdx].id,
        targetId: sorted[i].id,
        similarityScore: Number(bestScore.toFixed(3)),
        connectionReason: bestReason,
      });
      connectedIds.add(sorted[bestPrevIdx].id);
      connectedIds.add(sorted[i].id);
    } else {
      const candidateTopic = inferTopicLabel(sorted[i].content, entitiesList[i]);
      const uniqueTopic = topicOrder.includes(candidateTopic)
        ? `${candidateTopic} (${topicOrder.filter((t) => t.startsWith(candidateTopic)).length + 1})`
        : candidateTopic;
      assignedCluster[i] = uniqueTopic;
      topicOrder.push(uniqueTopic);
    }
  }

  const nodes: ChatNodeRecord[] = sorted.map((item, idx) => {
    const laneIndex = Math.max(0, topicOrder.indexOf(assignedCluster[idx]));
    return {
      id: item.id,
      sessionId: item.sessionId,
      content: item.content,
      timestamp: item.timestamp,
      topicCluster: assignedCluster[idx],
      xPos: idx * X_STEP + 60,
      yPos: laneIndex * Y_STEP + 70,
      isIsolated: !connectedIds.has(item.id),
      embedding: item.embedding ?? null,
    };
  });

  return { nodes, edges };
}
