import { useCallback, useState } from 'react';
import { TopNav, type WorkspaceTab } from './ui/components/TopNav';
import { ChatTimelineWorkspace } from './ui/components/chat/ChatTimelineWorkspace';
import { IndexerWorkspace } from './ui/components/indexer/IndexerWorkspace';
import { MermaidModal } from './ui/components/indexer/MermaidModal';
import { SettingsWorkspace } from './ui/components/settings/SettingsWorkspace';
import { useChatGraph } from './ui/hooks/useChatGraph';
import { useFileGraph } from './ui/hooks/useFileGraph';
import { useLiveActivity } from './ui/hooks/useLiveActivity';
import { useWebSocketSync } from './ui/hooks/useWebSocketSync';
import type { WsServerEvent } from './types/protocol';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('indexer');
  const [mermaidOpen, setMermaidOpen] = useState(false);
  const [mermaidRootId, setMermaidRootId] = useState<string | undefined>(undefined);

  const liveActivity = useLiveActivity();
  const fileGraph = useFileGraph({
    activeNodeActivities: liveActivity.activeNodeMap,
    liveTransfers: liveActivity.liveTransfers,
  });
  const chatGraph = useChatGraph();

  const handleWsEvent = useCallback(
    (event: WsServerEvent) => {
      liveActivity.ingestWsEvent(event);
      if (event.type === 'graph:delta' || event.type === 'workspace:updated') {
        void fileGraph.fetchGraph(fileGraph.activeWorkspaceId);
      } else if (event.type === 'chat:updated') {
        chatGraph.applyLiveUpdate(event.nodes, event.edges);
      }
    },
    [liveActivity, fileGraph, chatGraph]
  );

  useWebSocketSync(handleWsEvent);

  const openMermaidForNode = (nodeId?: string) => {
    setMermaidRootId(nodeId);
    setMermaidOpen(true);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0B0F17] text-slate-100 overflow-hidden">
      <TopNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenMermaid={() => openMermaidForNode(fileGraph.selectedNodeId ?? undefined)}
      />

      {activeTab === 'indexer' && (
        <IndexerWorkspace
          workspaces={fileGraph.workspaces}
          rawNodes={fileGraph.rawNodes}
          flowNodes={fileGraph.flowNodes}
          flowEdges={fileGraph.flowEdges}
          activeWorkspaceId={fileGraph.activeWorkspaceId}
          onSelectWorkspace={fileGraph.setActiveWorkspaceId}
          onAddWorkspace={fileGraph.addWorkspace}
          onRescanWorkspace={fileGraph.rescanWorkspace}
          onRemoveWorkspace={fileGraph.removeWorkspace}
          displayMode={fileGraph.displayMode}
          onDisplayModeChange={fileGraph.setDisplayMode}
          showSymbols={fileGraph.showSymbols}
          onToggleSymbols={() => fileGraph.setShowSymbols((v) => !v)}
          showImportEdges={fileGraph.showImportEdges}
          onToggleImportEdges={() => fileGraph.setShowImportEdges((v) => !v)}
          onCollapseAll={fileGraph.collapseAllFolders}
          onExpandAll={fileGraph.expandAllNodes}
          onToggleCollapse={fileGraph.toggleNodeCollapse}
          onNodesChange={fileGraph.onNodesChange}
          onResetPositions={fileGraph.resetNodePositions}
          hasCustomPositions={fileGraph.hasCustomPositions}
          selectedNode={fileGraph.selectedNode}
          onSelectNode={fileGraph.setSelectedNodeId}
          searchQuery={fileGraph.searchQuery}
          onSearchChange={fileGraph.setSearchQuery}
          highlightedCount={fileGraph.highlightedCount}
          loading={fileGraph.loading}
          error={fileGraph.error}
          onExportSubgraph={(nodeId) => openMermaidForNode(nodeId)}
          onCopyCompactContext={fileGraph.copyCompactContext}
          recentActivities={liveActivity.recentActivities}
          totalTokensSaved={liveActivity.totalTokensSaved}
          activePulseCount={liveActivity.activeNodeMap.size}
        />
      )}

      {activeTab === 'chat' && (
        <ChatTimelineWorkspace
          topics={chatGraph.topics}
          flowNodes={chatGraph.flowNodes}
          flowEdges={chatGraph.flowEdges}
          onNodesChange={chatGraph.onNodesChange}
          filterMode={chatGraph.filterMode}
          onFilterModeChange={chatGraph.setFilterMode}
          topicFilter={chatGraph.topicFilter}
          onTopicFilterChange={chatGraph.setTopicFilter}
          searchQuery={chatGraph.searchQuery}
          onSearchChange={chatGraph.setSearchQuery}
          expandAll={chatGraph.expandAll}
          onToggleExpandAll={() => chatGraph.setExpandAll((v) => !v)}
          selectedChatNode={chatGraph.selectedChatNode}
          onSelectChatNode={chatGraph.setSelectedChatId}
          onAddMessage={chatGraph.addMessage}
          onDeleteMessage={chatGraph.deleteMessage}
          loading={chatGraph.loading}
        />
      )}

      {activeTab === 'settings' && <SettingsWorkspace />}

      <MermaidModal
        open={mermaidOpen}
        rootNodeId={mermaidRootId}
        workspaceId={fileGraph.activeWorkspaceId}
        onClose={() => setMermaidOpen(false)}
      />
    </div>
  );
}
