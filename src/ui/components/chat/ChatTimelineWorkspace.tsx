import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node, type NodeTypes, type OnNodesChange } from '@xyflow/react';
import { Trash2, X } from 'lucide-react';
import type { ChatFilterMode, ChatNodeRecord } from '../../../types/chatGraph';
import type { ChatTimelineFlowData } from '../../hooks/useChatGraph';
import { formatFullDateTime, formatRelativeTime } from '../../utils/dateFormat';
import { ChatTimelineNode } from '../nodes/ChatTimelineNode';
import { ChatControlsBar } from './ChatControlsBar';

const chatNodeTypes: NodeTypes = {
  chatTimelineNode: ChatTimelineNode,
};

interface ChatTimelineWorkspaceProps {
  topics: string[];
  flowNodes: Node<ChatTimelineFlowData>[];
  flowEdges: Edge[];
  onNodesChange: OnNodesChange<Node<ChatTimelineFlowData>>;
  filterMode: ChatFilterMode;
  onFilterModeChange: (m: ChatFilterMode) => void;
  topicFilter: string;
  onTopicFilterChange: (t: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  expandAll: boolean;
  onToggleExpandAll: () => void;
  selectedChatNode: ChatNodeRecord | null;
  onSelectChatNode: (id: string | null) => void;
  onAddMessage: (content: string) => Promise<void>;
  onDeleteMessage: (id: string) => Promise<void>;
  loading: boolean;
}

export function ChatTimelineWorkspace(props: ChatTimelineWorkspaceProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <ChatControlsBar
        topics={props.topics}
        topicFilter={props.topicFilter}
        onTopicFilterChange={props.onTopicFilterChange}
        filterMode={props.filterMode}
        onFilterModeChange={props.onFilterModeChange}
        searchQuery={props.searchQuery}
        onSearchChange={props.onSearchChange}
        expandAll={props.expandAll}
        onToggleExpandAll={props.onToggleExpandAll}
        onAddMessage={props.onAddMessage}
      />

      <div className="flex-1 min-h-0 flex relative bg-[#0B0F17]" data-testid="chat-timeline-canvas">
        <div className="absolute top-3 left-4 z-10 pointer-events-none text-[11px] font-mono text-slate-400">
          Eje X: cronología · Eje Y: carriles de tema ({props.topics.length})
        </div>

        <main className="flex-1 min-w-0 h-full">
          {props.loading ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-400">
              Cargando mapa de ideas...
            </div>
          ) : props.flowNodes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <p className="text-sm font-medium text-slate-200">Sin nodos visibles con este filtro</p>
              <p className="mt-1 text-xs text-slate-400">Ajusta el filtro de tema o añade una nueva idea arriba.</p>
            </div>
          ) : (
            <ReactFlow
              key={`${props.filterMode}-${props.topicFilter}`}
              nodes={props.flowNodes}
              edges={props.flowEdges}
              nodeTypes={chatNodeTypes}
              elevateEdgesOnSelect={false}
              nodesDraggable
              onNodesChange={props.onNodesChange}
              onNodeClick={(_e, node) => props.onSelectChatNode(node.id)}
              onPaneClick={() => props.onSelectChatNode(null)}
              fitView
              fitViewOptions={{ padding: 0.22 }}
              minZoom={0.2}
              maxZoom={2}
            >
              <Background color="#1E293B" gap={28} size={1} />
              <Controls showInteractive={false} />
              <MiniMap nodeColor="#A78BFA" maskColor="rgba(11, 15, 23, 0.78)" />
            </ReactFlow>
          )}
        </main>

        {props.selectedChatNode && (
          <aside className="w-[290px] shrink-0 bg-[#111827] border-l border-white/[0.08] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-sky-400">{props.selectedChatNode.topicCluster}</span>
              <button
                type="button"
                onClick={() => props.onSelectChatNode(null)}
                aria-label="Cerrar detalle de idea"
                className="p-1 text-slate-400 hover:text-slate-100 rounded"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              {formatFullDateTime(props.selectedChatNode.timestamp)} ({formatRelativeTime(props.selectedChatNode.timestamp)}) ·{' '}
              {props.selectedChatNode.isIsolated ? 'Nodo suelto' : 'Conectado al hilo'}
            </p>
            <p className="text-xs leading-relaxed text-slate-200 bg-[#0B0F17] p-3 rounded-lg border border-white/[0.07]">
              {props.selectedChatNode.content}
            </p>
            <button
              type="button"
              onClick={() => void props.onDeleteMessage(props.selectedChatNode!.id)}
              className="mt-auto py-2 px-3 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-500/30 rounded-lg flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Eliminar nodo</span>
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
