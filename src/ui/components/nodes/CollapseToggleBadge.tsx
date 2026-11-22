import { Minus, Plus } from 'lucide-react';

interface CollapseToggleBadgeProps {
  nodeId: string;
  nodeName: string;
  isCollapsed: boolean;
  childCount: number;
  hiddenDescendantCount: number;
  onToggleCollapse?: (id: string) => void;
}

export function CollapseToggleBadge({
  nodeId,
  nodeName,
  isCollapsed,
  childCount,
  hiddenDescendantCount,
  onToggleCollapse,
}: CollapseToggleBadgeProps) {
  if (childCount <= 0 || !onToggleCollapse) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggleCollapse(nodeId);
      }}
      aria-label={
        isCollapsed
          ? `Expandir ${hiddenDescendantCount} elementos de ${nodeName}`
          : `Colapsar ${nodeName}`
      }
      className={`nodrag nopan absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 h-5 px-1.5 rounded-full border text-[10px] font-mono flex items-center gap-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
        isCollapsed
          ? 'bg-sky-400 text-slate-950 border-sky-300 font-semibold'
          : 'bg-[#0F172A] text-slate-300 border-slate-600 hover:border-sky-400 hover:text-sky-300'
      }`}
    >
      {isCollapsed ? (
        <>
          <Plus className="w-2.5 h-2.5" aria-hidden="true" />
          <span>{hiddenDescendantCount}</span>
        </>
      ) : (
        <Minus className="w-2.5 h-2.5" aria-hidden="true" />
      )}
    </button>
  );
}
