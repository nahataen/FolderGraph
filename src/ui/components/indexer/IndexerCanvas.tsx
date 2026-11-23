import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node, type OnNodesChange } from '@xyflow/react';
import type { StructuralFlowNodeData } from '../../../core/layout/dagreLayout';
import type { AgentActivityEvent } from '../../../types/protocol';
import type { TimelineScrubberController } from '../../hooks/useTimelineScrubber';
import { ActivityHud } from './ActivityHud';
import { AutoFitView } from './AutoFitView';
import { structuralEdgeTypes, structuralNodeTypes } from './flowRegistry';
import { TimelineScrubberGizmo } from './TimelineScrubberGizmo';
import { TimelineViewportFocus } from './TimelineViewportFocus';

interface IndexerCanvasProps {
  flowNodes: Node<StructuralFlowNodeData>[];
  flowEdges: Edge[];
  onNodesChange: OnNodesChange<Node<StructuralFlowNodeData>>;
  onSelectNode: (id: string | null) => void;
  onToggleCollapse: (id: string) => void;
  leftOpen: boolean;
  rightOpen: boolean;
  onShowLeft: () => void;
  onShowRight: () => void;
  loading: boolean;
  error: string | null;
  recentActivities: AgentActivityEvent[];
  totalTokensSaved: number;
  activePulseCount: number;
  onCopyCompactContext: (nodeId?: string) => Promise<number>;
  canArrangeSubtree: boolean;
  onArrangeSubtree: () => void;
  timeline: TimelineScrubberController;
}

export function IndexerCanvas(props: IndexerCanvasProps) {
  return (
    <main className="flex-1 min-w-0 h-full relative overflow-hidden bg-[#0B0F17]" data-testid="structural-canvas">
      <ActivityHud
        recentActivities={props.recentActivities}
        totalTokensSaved={props.totalTokensSaved}
        activeCount={props.activePulseCount}
        leftOpen={props.leftOpen}
        rightOpen={props.rightOpen}
        onShowLeft={props.onShowLeft}
        onShowRight={props.onShowRight}
        onCopyCompactContext={() => props.onCopyCompactContext()}
        canArrangeSubtree={props.canArrangeSubtree}
        onArrangeSubtree={props.onArrangeSubtree}
      />

      {props.error && (
        <div className="absolute top-14 left-4 right-4 z-20 px-3 py-2 rounded-lg bg-rose-950/80 border border-rose-500/40 text-xs text-rose-200">
          {props.error}
        </div>
      )}

      {props.loading ? (
        <div className="h-full flex items-center justify-center text-xs font-mono text-slate-400">
          Indexando árbol estructural...
        </div>
      ) : props.flowNodes.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <p className="text-sm font-medium text-slate-200">No hay carpetas indexadas</p>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            Agrega una ruta de carpeta local en el panel izquierdo para construir el grafo estructural en tiempo real.
          </p>
        </div>
      ) : (
        <ReactFlow
          nodes={props.flowNodes}
          edges={props.flowEdges}
          nodeTypes={structuralNodeTypes}
          edgeTypes={structuralEdgeTypes}
          elevateEdgesOnSelect={false}
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
          <AutoFitView nodeCount={props.flowNodes.length} panelKey={`${props.leftOpen}-${props.rightOpen}`} />
          <TimelineViewportFocus
            focusNodeId={props.timeline.focusNodeId}
            focusRequestTick={props.timeline.focusRequestTick}
          />
          <Background color="#1E293B" gap={24} size={1} />
          <Controls showInteractive={false} />
          <MiniMap nodeColor="#38BDF8" maskColor="rgba(11, 15, 23, 0.78)" />
        </ReactFlow>
      )}

      {!props.loading && props.flowNodes.length > 0 && (
        <TimelineScrubberGizmo timeline={props.timeline} onSelectNode={(id) => props.onSelectNode(id)} />
      )}
    </main>
  );
}
