import { AISettingsPanel } from './AISettingsPanel';
import { McpInspectorPanel } from './McpInspectorPanel';

export function SettingsWorkspace() {
  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-[#0B0F17] p-6">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <AISettingsPanel />
        <McpInspectorPanel />
      </div>
    </main>
  );
}
