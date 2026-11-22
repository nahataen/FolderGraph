export type ChatConnectionReason = 'keyword' | 'entity' | 'semantic';

export interface ChatNodeRecord {
  id: string;
  sessionId: string;
  content: string;
  timestamp: number;
  topicCluster: string;
  xPos: number;
  yPos: number;
  isIsolated: boolean;
  embedding: number[] | null;
}

export interface ChatEdgeRecord {
  id: string;
  sourceId: string;
  targetId: string;
  similarityScore: number;
  connectionReason: ChatConnectionReason;
}

export type ChatFilterMode = 'all' | 'connected' | 'isolated';

export interface ChatGraphPayload {
  nodes: ChatNodeRecord[];
  edges: ChatEdgeRecord[];
  topics: string[];
}

export interface CreateChatMessageInput {
  sessionId?: string;
  content: string;
  timestamp?: number;
}
