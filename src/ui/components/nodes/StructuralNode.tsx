import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Folder } from 'lucide-react';
import type { StructuralFlowNodeData } from '../../../core/layout/dagreLayout';
import { buildNodeDateTooltip } from '../../utils/dateFormat';
import { getActivityDotClass, getActivityNodeClass, getExtensionAccent } from '../../utils/graphStyles';
import { getThemeInlineStyle, getThemeSurfaceClass } from '../../utils/nodeThemes';
import { CollapseToggleBadge } from './CollapseToggleBadge';
import { StructuralNodeCapsule, StructuralNodeCard } from './StructuralNodeVariants';

type StructuralNodeType = Node<StructuralFlowNodeData, 'structuralNode'>;

export function StructuralNode({ data }: NodeProps<StructuralNodeType>) {
  const {
    record,
    displayMode,
    nodeTheme = 'classic',
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
  const themeSurface = getThemeSurfaceClass(nodeTheme);
  const hasOverrideState = Boolean(activityKind || isSelected || isHighlighted || isRelatedToSelected);
  const inlineStyle = getThemeInlineStyle(nodeTheme, record.type === 'folder' ? '#38BDF8' : accent, hasOverrideState);

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
        : `${themeSurface} ${pulseClass}`;

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

  const modifiedTs = record.metadata.modifiedAt ?? record.updatedAt;
  const dateTooltip = buildNodeDateTooltip(record.name, modifiedTs, record.metadata.createdAt);

  if (record.type === 'symbol') {
    const showLabel = Boolean(data.isSymbolExpanded) || displayMode === 'detailed' || isSelected || isHighlighted || isRelatedToSelected;
    const dotSize = displayMode === 'minimal' ? 'w-2.5 h-2.5' : 'w-3 h-3';
    return (
      <div className={`relative transition-opacity ${opacityClass}`} aria-label={`Símbolo ${record.name}`} title={dateTooltip}>
        <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !bg-slate-400 !border-0" />
        {showLabel ? (
          <div style={inlineStyle} className={`px-2 py-0.5 rounded border text-[10px] font-mono text-slate-200 truncate w-[132px] ${ringClass}`}>{record.name}</div>
        ) : (
          <div title={`${record.name} (${record.metadata.symbolKind ?? 'symbol'})`} className={`${dotSize} rounded-full border border-slate-900 ${activityKind ? getActivityDotClass(activityKind) : isRelatedToSelected ? 'bg-sky-400' : nodeTheme === 'neon' ? 'bg-cyan-300' : 'bg-slate-300/85'}`} />
        )}
      </div>
    );
  }

  const isMinimal = displayMode === 'minimal' && !isSelected && !isHighlighted;
  if (record.type === 'folder' && record.metadata.isRoot) {
    const rootBox = isMinimal ? 'w-[96px] h-[96px]' : 'w-[116px] h-[116px]';
    return (
      <div aria-label={`Raíz ${record.name}`} title={dateTooltip} style={inlineStyle} className={`relative ${rootBox} flex flex-col items-center justify-center rounded-full border-2 text-center p-2.5 transition-opacity ${ringClass} ${opacityClass}`}>
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

  if (displayMode === 'capsules' && !isSelected && !isHighlighted) {
    return <StructuralNodeCapsule record={record} accent={accent} ringClass={ringClass} opacityClass={opacityClass} inlineStyle={inlineStyle} pulseDot={pulseDot} toggleBadge={toggleBadge} childCount={childCount} importCount={importCount} symbolCount={symbolCount} />;
  }

  const showCard = displayMode === 'detailed' || isSelected || isHighlighted;
  if (!showCard) {
    if (record.type === 'folder') {
      const folderCircle = isMinimal ? 'w-[58px] h-[58px]' : 'w-[70px] h-[70px]';
      return (
        <div aria-label={`Carpeta ${record.name}`} title={dateTooltip} style={inlineStyle} className={`relative ${folderCircle} flex flex-col items-center justify-center rounded-full border text-center p-1.5 ${ringClass} ${opacityClass}`}>
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
      <div aria-label={`Archivo ${record.name}`} className={`relative flex flex-col items-center pb-1 ${isMinimal ? 'w-[76px]' : 'w-[96px]'} ${opacityClass}`} title={dateTooltip}>
        {pulseDot}
        <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-slate-400 !border !border-[#0B0F17]" />
        <div className={`${fileDot} rounded-full flex items-center justify-center border-2 ${ringClass}`} style={inlineStyle ?? { borderColor: hasOverrideState ? undefined : accent }} />
        <span className={`mt-1 px-1 rounded bg-[#0B0F17]/95 font-mono text-slate-200 truncate ${fileLabel}`}>{record.name}</span>
        <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-slate-400 !border !border-[#0B0F17]" />
        {toggleBadge}
      </div>
    );
  }

  return <StructuralNodeCard record={record} accent={accent} ringClass={ringClass} opacityClass={opacityClass} inlineStyle={inlineStyle} pulseDot={pulseDot} toggleBadge={toggleBadge} childCount={childCount} importCount={importCount} symbolCount={symbolCount} />;
}
