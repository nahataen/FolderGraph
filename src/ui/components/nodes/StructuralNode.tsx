import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { FileText, Folder } from 'lucide-react';
import type { StructuralFlowNodeData } from '../../../core/layout/dagreLayout';
import { getActivityDotClass, getActivityNodeClass, getExtensionAccent } from '../../utils/graphStyles';
import { CollapseToggleBadge } from './CollapseToggleBadge';

type StructuralNodeType = Node<StructuralFlowNodeData, 'structuralNode'>;

export function StructuralNode({ data }: NodeProps<StructuralNodeType>) {
  const {
    record,
    displayMode,
    isHighlighted,
    isDimmed,
    isSelected,
    isRelatedToSelected,
    activityKind,
    isCollapsed,
    childCount,
    hiddenDescendantCount,
    importCount,
    symbolCount,
    onToggleCollapse,
  } = data;

  const accent = getExtensionAccent(record.metadata.extension);
  const opacityClass = isDimmed ? 'opacity-20' : 'opacity-100';
  const pulseClass = getActivityNodeClass(activityKind);
  const pulseDot = activityKind ? (
    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 z-20 pointer-events-none">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getActivityDotClass(activityKind)}`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${getActivityDotClass(activityKind)}`} />
    </span>
  ) : null;

  const ringClass = isSelected
    ? `ring-2 ring-sky-400 border-sky-400 bg-[#1B263B] ${pulseClass}`
    : isRelatedToSelected
      ? `ring-1 ring-sky-400/70 border-sky-400/60 bg-[#182235] ${pulseClass}`
      : isHighlighted
        ? `ring-2 ring-amber-400 border-amber-400 ${pulseClass}`
        : `border-white/[0.14] bg-[#161E2E] ${pulseClass}`;

  const toggleBadge = (
    <CollapseToggleBadge
      nodeId={record.id}
      nodeName={record.name}
      isCollapsed={isCollapsed}
      childCount={childCount}
      hiddenDescendantCount={hiddenDescendantCount}
      onToggleCollapse={onToggleCollapse}
    />
  );

  if (record.type === 'symbol') {
    const showLabel = Boolean(data.isSymbolExpanded) || displayMode === 'detailed' || isSelected || isHighlighted || isRelatedToSelected;
    const dotSize = displayMode === 'minimal' ? 'w-2.5 h-2.5' : 'w-3 h-3';
    return (
      <div className={`relative transition-opacity ${opacityClass}`} aria-label={`Símbolo ${record.name}`}>
        <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-slate-400 !border-0" />
        {showLabel ? (
          <div className={`px-2 py-0.5 rounded border text-[10px] font-mono text-slate-200 truncate w-[132px] ${ringClass}`}>{record.name}</div>
        ) : (
          <div title={`${record.name} (${record.metadata.symbolKind ?? 'symbol'})`} className={`${dotSize} rounded-full border border-slate-900 ${activityKind ? getActivityDotClass(activityKind) : isRelatedToSelected ? 'bg-sky-400' : 'bg-slate-300/85'}`} />
        )}
      </div>
    );
  }

  const isMinimal = displayMode === 'minimal' && !isSelected && !isHighlighted;

  if (record.type === 'folder' && record.metadata.isRoot) {
    const rootBox = isMinimal ? 'w-[96px] h-[96px]' : 'w-[116px] h-[116px]';
    return (
      <div aria-label={`Raíz ${record.name}`} className={`relative ${rootBox} flex flex-col items-center justify-center rounded-full border-2 text-center p-2.5 transition-opacity ${ringClass} ${opacityClass}`}>
        {pulseDot}
        <Handle type="target" position={Position.Top} className="!opacity-0" />
        <Folder className="w-5 h-5 text-sky-400 mb-1 shrink-0" aria-hidden="true" />
        <span className="text-xs font-bold text-slate-100 truncate max-w-[82px]">{record.name}</span>
        <span className="text-[10px] font-mono text-slate-400 mt-0.5">raíz</span>
        <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-sky-400 !border !border-[#0B0F17]" />
        {toggleBadge}
      </div>
    );
  }

  const showCard = displayMode === 'detailed' || isSelected || isHighlighted;

  if (!showCard) {
    if (record.type === 'folder') {
      const folderCircle = isMinimal ? 'w-[58px] h-[58px]' : 'w-[70px] h-[70px]';
      return (
        <div aria-label={`Carpeta ${record.name}`} className={`relative ${folderCircle} flex flex-col items-center justify-center rounded-full border text-center p-1.5 ${ringClass} ${opacityClass}`}>
          {pulseDot}
          <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-slate-400 !border !border-[#0B0F17]" />
          <Folder className="w-3.5 h-3.5 text-sky-400 mb-0.5 shrink-0" aria-hidden="true" />
          <span className="text-[10px] font-medium text-slate-200 truncate max-w-[48px]">{record.name}</span>
          <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-slate-400 !border !border-[#0B0F17]" />
          {toggleBadge}
        </div>
      );
    }

    const fileDot = isMinimal ? 'w-6 h-6' : 'w-8 h-8';
    const fileLabel = isMinimal ? 'max-w-[76px] text-[10px]' : 'max-w-[96px] text-[11px]';
    return (
      <div aria-label={`Archivo ${record.name}`} className={`relative flex flex-col items-center ${isMinimal ? 'w-[76px]' : 'w-[96px]'} ${opacityClass}`} title={record.name}>
        {pulseDot}
        <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-slate-400 !border !border-[#0B0F17]" />
        <div className={`${fileDot} rounded-full flex items-center justify-center border-2 ${ringClass}`} style={{ borderColor: activityKind || isSelected || isHighlighted || isRelatedToSelected ? undefined : accent }} />
        <span className={`mt-1 font-mono text-slate-300 truncate ${fileLabel}`}>{record.name}</span>
        <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-slate-400 !border !border-[#0B0F17]" />
        {toggleBadge}
      </div>
    );
  }

  const widthClass = record.type === 'folder' ? 'w-[176px]' : 'w-[204px]';
  return (
    <div aria-label={`${record.type === 'folder' ? 'Carpeta' : 'Archivo'} ${record.name}`} className={`relative ${widthClass} rounded-lg border px-3 py-2.5 transition-opacity ${ringClass} ${opacityClass}`}>
      {pulseDot}
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-slate-400 !border !border-[#0B0F17]" />
      <div className="flex items-center gap-2 min-w-0">
        {record.type === 'folder' ? <Folder className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" /> : <FileText className="w-4 h-4 shrink-0" style={{ color: accent }} aria-hidden="true" />}
        <span className="text-xs font-semibold text-slate-100 truncate">{record.name}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono text-slate-400 truncate">
        {record.type === 'folder' ? (
          <span>carpeta · {childCount} hijos</span>
        ) : (
          <>
            <span>{record.metadata.lines ?? 0} lín</span>
            <span aria-hidden="true">·</span>
            <span>{importCount} imp</span>
            {symbolCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{symbolCount} símb</span>
              </>
            )}
          </>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-slate-400 !border !border-[#0B0F17]" />
      {toggleBadge}
    </div>
  );
}
