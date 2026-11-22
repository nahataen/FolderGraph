import { useEffect, useState } from 'react';
import { Background, Controls, MiniMap, ReactFlow, useReactFlow, type Edge, type Node, type NodeTypes, type OnNodesChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { StructuralFlowNodeData } from '../../../core/layout/dagreLayout';
import type { FileNodeRecord, NodeDisplayMode, WorkspaceRecord } from '../../../types/indexer';
import type { AgentActivityEvent } from '../../../types/protocol';
import { StructuralNode } from '../nodes/StructuralNode';
import { ActivityHud } from './ActivityHud';
import { NodeInspector } from './NodeInspector';
import { WorkspaceSidebar } from './WorkspaceSidebar';

const nodeTypes: NodeTypes = {
  structuralNode: StructuralNode,
};

function AutoFitOnCountChange({ nodeCount, panelKey }: { nodeCount: number; panelKey: string }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const t = setTimeout(() => void fitView({ padding: 0.18, duration: 240 }), 60);
    return () => clearTimeout(t);
  }, [nodeCount, panelKey, fitView]);
  return null;
}

interface IndexerWorkspaceProps {
  workspaces: WorkspaceRecord[];
  rawNodes: FileNodeRecord[];
  flowNodes: Node<StructuralFlowNodeData>[];
  flowEdges: Edge[];
  activeWorkspaceId: string;
  onSelectWorkspace: (id: string) => void;
  onAddWorkspace: (path: string) => Promise<void>;
  onRescanWorkspace: (id: string) => Promise<void>;
  onRemoveWorkspace: (id: string) => Promise<void>;
  displayMode: NodeDisplayMode;
  onDisplayModeChange: (mode: NodeDisplayMode) => void;
  showSymbols: boolean;
  onToggleSymbols: () => void;
  showImportEdges: boolean;
  onToggleImportEdges: () => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onToggleCollapse: (id: string) => void;
  onNodesChange: OnNodesChange<Node<StructuralFlowNodeData>>;
  onResetPositions: () => void;
  hasCustomPositions: boolean;
  selectedNode: FileNodeRecord | null;
  onSelectNode: (id: string | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  highlightedCount: number;
  loading: boolean;
  error: string | null;
  onExportSubgraph: (nodeId: string) => void;
  onCopyCompactContext: (nodeId?: string) => Promise<number>;
  recentActivities: AgentActivityEvent[];
  totalTokensSaved: number;
  activePulseCount: number;
}

export function IndexerWorkspace(props: IndexerWorkspaceProps) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const canvasWidthClass = 'flex-1 min-w-0 h-full relative overflow-hidden bg-[#0B0F17]';

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden">
      {leftOpen && (
        <WorkspaceSidebar
          workspaces={props.workspaces}
          activeWorkspaceId={props.activeWorkspaceId}
          onSelectWorkspace={props.onSelectWorkspace}
          onAddWorkspace={props.onAddWorkspace}
          onRescanWorkspace={props.onRescanWorkspace}
          onRemoveWorkspace={props.onRemoveWorkspace}
          searchQuery={props.searchQuery}
          onSearchChange={props.onSearchChange}
          highlightedCount={props.highlightedCount}
          displayMode={props.displayMode}
          onDisplayModeChange={props.onDisplayModeChange}
          showSymbols={props.showSymbols}
          onToggleSymbols={props.onToggleSymbols}
          showImportEdges={props.showImportEdges}
          onToggleImportEdges={props.onToggleImportEdges}
          onCollapseAll={props.onCollapseAll}
          onExpandAll={props.onExpandAll}
          onResetPositions={props.onResetPositions}
          hasCustomPositions={props.hasCustomPositions}
          onHidePanel={() => setLeftOpen(false)}
        />
      )}
      <main className={canvasWidthClass} data-testid="structural-canvas">
        <ActivityHud
          recentActivities={props.recentActivities}
          totalTokensSaved={props.totalTokensSaved}
          activeCount={props.activePulseCount}
          leftOpen={leftOpen}
          rightOpen={rightOpen}
          onShowLeft={() => setLeftOpen(true)}
          onShowRight={() => setRightOpen(true)}
          onCopyCompactContext={() => props.onCopyCompactContext()}
        />

        {props.error && (
          <div className="absolute top-14 left-4 right-4 z-20 px-3 py-2 rounded-lg bg-rose-950/80 border border-rose-500/40 text-xs text-rose-200">{props.error}</div>
        )}
        {props.loading ? (
          <div className="h-full flex items-center justify-center text-xs font-mono text-slate-400">Indexando árbol estructural...</div>
        ) : props.flowNodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm font-medium text-slate-200">No hay carpetas indexadas</p>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">Agrega una ruta de carpeta local en el panel izquierdo para construir el grafo estructural en tiempo real.</p>
          </div>
        ) : (
          <ReactFlow
            nodes={props.flowNodes}
            edges={props.flowEdges}
            nodeTypes={nodeTypes}
            nodesDraggable
            onNodesChange={props.onNodesChange}
            onNodeClick={(_e, node) => props.onSelectNode(node.id)}
            onNodeDoubleClick={(_e, node) => props.onToggleCollapse(node.id)}
            onPaneClick={() => props.onSelectNode(null)}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.15}
            maxZoom={2.2}
          >
            <AutoFitOnCountChange nodeCount={props.flowNodes.length} panelKey={`${leftOpen}-${rightOpen}`} />
            <Background color="#1E293B" gap={24} size={1} />
            <Controls showInteractive={false} />
            <MiniMap nodeColor="#38BDF8" maskColor="rgba(11, 15, 23, 0.78)" />
          </ReactFlow>
        )}
      </main>
      {rightOpen && (
        <NodeInspector
          node={props.selectedNode}
          allNodes={props.rawNodes}
          onClose={() => props.onSelectNode(null)}
          onHidePanel={() => setRightOpen(false)}
          onExportSubgraph={props.onExportSubgraph}
          onCopyCompactContext={props.onCopyCompactContext}
        />
      )}
    </div>
  );
}
