import type { ChatEdgeRecord, ChatNodeRecord } from './chatGraph';
import type { FileEdgeRecord, FileNodeRecord, WorkspaceRecord } from './indexer';

export type MermaidFormat = 'flowchart' | 'mindmap';

export interface MermaidExportOptions {
  format: MermaidFormat;
  rootNodeId?: string;
  maxDepth?: number;
  includeSymbols?: boolean;
  includeImports?: boolean;
}

export interface MermaidExportResult {
  format: MermaidFormat;
  code: string;
  nodeCount: number;
  edgeCount: number;
}

export type ActivityKind = 'edit' | 'create' | 'delete' | 'move' | 'read' | 'search' | 'mcp_query';

export interface AgentActivityEvent {
  id: string;
  actor: 'agent' | 'fs' | 'user';
  action: ActivityKind;
  label: string;
  nodeId?: string;
  fromNodeId?: string;
  toNodeId?: string;
  filePath?: string;
  tokensSaved?: number;
  timestamp: number;
}

export type WsServerEvent =
  | {
      type: 'graph:delta';
      workspaceId: string;
      reason: 'add' | 'change' | 'unlink' | 'rescan';
      changedPath?: string;
      changedNodeId?: string;
      timestamp: number;
    }
  | {
      type: 'agent:activity';
      activity: AgentActivityEvent;
    }
  | {
      type: 'workspace:updated';
      workspaces: WorkspaceRecord[];
    }
  | {
      type: 'chat:updated';
      nodes: ChatNodeRecord[];
      edges: ChatEdgeRecord[];
    }
  | {
      type: 'pong';
      timestamp: number;
    };

export interface StructuralSearchResult {
  nodes: FileNodeRecord[];
  edges: FileEdgeRecord[];
  query: string;
}
