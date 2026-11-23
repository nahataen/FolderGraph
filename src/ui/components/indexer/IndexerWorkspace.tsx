import { useEffect, useState } from 'react';
import type { Edge, Node, OnNodesChange } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { StructuralFlowNodeData } from '../../../core/layout/dagreLayout';
import type { FileNodeRecord, NodeDisplayMode, NodeVisualTheme, WorkspaceRecord } from '../../../types/indexer';
import type { AgentActivityEvent } from '../../../types/protocol';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import type { TimelineScrubberController } from '../../hooks/useTimelineScrubber';
import { IndexerCanvas } from './IndexerCanvas';
import { NodeInspector } from './NodeInspector';
import { WorkspaceSidebar } from './WorkspaceSidebar';

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
  nodeTheme: NodeVisualTheme;
  onNodeThemeChange: (theme: NodeVisualTheme) => void;
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
  canArrangeSubtree: boolean;
  onArrangeSubtree: () => void;
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
  timeline: TimelineScrubberController;
}

export function IndexerWorkspace(props: IndexerWorkspaceProps) {
  const { isMobile, isCompact } = useBreakpoint();
  const [leftOpen, setLeftOpen] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 768));
  const [rightOpen, setRightOpen] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 1180));

  useEffect(() => {
    if (isMobile) {
      setLeftOpen(false);
      setRightOpen(false);
    } else if (isCompact) {
      setRightOpen(false);
    }
  }, [isMobile, isCompact]);

  const showBackdrop = (isMobile && leftOpen) || (isCompact && rightOpen);

  return (
    <div className="relative flex-1 min-h-0 flex overflow-hidden">
      {showBackdrop && (
        <div
          aria-hidden="true"
          onClick={() => {
            if (isMobile) setLeftOpen(false);
            setRightOpen(false);
          }}
          className="absolute inset-0 z-30 bg-black/50 backdrop-blur-[1px]"
        />
      )}

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
          nodeTheme={props.nodeTheme}
          onNodeThemeChange={props.onNodeThemeChange}
          showSymbols={props.showSymbols}
          onToggleSymbols={props.onToggleSymbols}
          showImportEdges={props.showImportEdges}
          onToggleImportEdges={props.onToggleImportEdges}
          onCollapseAll={props.onCollapseAll}
          onExpandAll={props.onExpandAll}
          onResetPositions={props.onResetPositions}
          hasCustomPositions={props.hasCustomPositions}
          onHidePanel={() => setLeftOpen(false)}
          overlayMode={isMobile}
        />
      )}

      <IndexerCanvas
        flowNodes={props.flowNodes}
        flowEdges={props.flowEdges}
        onNodesChange={props.onNodesChange}
        onSelectNode={props.onSelectNode}
        onToggleCollapse={props.onToggleCollapse}
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        onShowLeft={() => setLeftOpen(true)}
        onShowRight={() => setRightOpen(true)}
        loading={props.loading}
        error={props.error}
        recentActivities={props.recentActivities}
        totalTokensSaved={props.totalTokensSaved}
        activePulseCount={props.activePulseCount}
        onCopyCompactContext={props.onCopyCompactContext}
        canArrangeSubtree={props.canArrangeSubtree}
        onArrangeSubtree={props.onArrangeSubtree}
        timeline={props.timeline}
      />

      {rightOpen && (
        <NodeInspector
          node={props.selectedNode}
          allNodes={props.rawNodes}
          onClose={() => props.onSelectNode(null)}
          onHidePanel={() => setRightOpen(false)}
          onExportSubgraph={props.onExportSubgraph}
          onCopyCompactContext={props.onCopyCompactContext}
          canArrangeSubtree={props.canArrangeSubtree}
          onArrangeSubtree={props.onArrangeSubtree}
          overlayMode={isCompact}
        />
      )}
    </div>
  );
}
