import { AISettingsPanel } from './AISettingsPanel';
import { HarnessConnectorPanel } from './HarnessConnectorPanel';
import { McpInspectorPanel } from './McpInspectorPanel';

export function SettingsWorkspace() {
  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-[#0B0F17] p-4 sm:p-6">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <HarnessConnectorPanel />
        <AISettingsPanel />
        <McpInspectorPanel />
      </div>
    </main>
  );
}
