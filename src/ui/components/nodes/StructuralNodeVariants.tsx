import { type CSSProperties, type ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock, FileText, Folder } from 'lucide-react';
import type { FileNodeRecord } from '../../../types/indexer';
import { buildNodeDateTooltip, formatCompactBadgeTime } from '../../utils/dateFormat';

interface VariantProps {
  record: FileNodeRecord;
  accent: string;
  ringClass: string;
  opacityClass: string;
  inlineStyle?: CSSProperties;
  pulseDot: ReactNode;
  toggleBadge: ReactNode;
  childCount: number;
  importCount: number;
  symbolCount: number;
}

export function StructuralNodeCapsule(props: VariantProps) {
  const { record, accent, ringClass, opacityClass, inlineStyle, pulseDot, toggleBadge, childCount } = props;
  const isFolder = record.type === 'folder';
  const widthClass = isFolder ? 'w-[154px]' : 'w-[176px]';
  const metric = isFolder ? `${childCount}` : `${record.metadata.lines ?? 0}L`;
  const modifiedTs = record.metadata.modifiedAt ?? record.updatedAt;
  const tooltip = buildNodeDateTooltip(record.name, modifiedTs, record.metadata.createdAt);

  return (
    <div
      aria-label={`${isFolder ? 'Carpeta' : 'Archivo'} ${record.name}`}
      title={tooltip}
      style={inlineStyle}
      className={`relative ${widthClass} h-[38px] rounded-full border px-3.5 flex items-center justify-between gap-2 transition-opacity ${ringClass} ${opacityClass}`}
    >
      {pulseDot}
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-slate-400 !border !border-[#0B0F17]" />
      <div className="flex items-center gap-2 min-w-0">
        {isFolder ? (
          <Folder className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" />
        ) : (
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: accent }} aria-hidden="true" />
        )}
        <span className="font-display text-xs font-medium text-slate-100 truncate">{record.name}</span>
      </div>
      <span className="text-xs font-mono tabular-nums text-slate-400 shrink-0">{metric}</span>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-slate-400 !border !border-[#0B0F17]" />
      {toggleBadge}
    </div>
  );
}

export function StructuralNodeCard(props: VariantProps) {
  const { record, accent, ringClass, opacityClass, inlineStyle, pulseDot, toggleBadge, childCount, importCount, symbolCount } = props;
  const isFolder = record.type === 'folder';
  const widthClass = isFolder ? 'w-[196px]' : 'w-[224px]';
  const modifiedTs = record.metadata.modifiedAt ?? record.updatedAt;
  const createdTs = record.metadata.createdAt;
  const modLabel = formatCompactBadgeTime(modifiedTs);
  const creLabel = createdTs ? formatCompactBadgeTime(createdTs) : null;
  const tooltip = buildNodeDateTooltip(record.name, modifiedTs, createdTs);

  return (
    <div
      aria-label={`${isFolder ? 'Carpeta' : 'Archivo'} ${record.name}`}
      title={tooltip}
      style={inlineStyle}
      className={`relative ${widthClass} rounded-lg border px-3.5 py-2.5 transition-opacity ${ringClass} ${opacityClass}`}
    >
      {pulseDot}
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-slate-400 !border !border-[#0B0F17]" />
      <div className="flex items-center gap-2 min-w-0">
        {isFolder ? <Folder className="w-4 h-4 text-sky-400 shrink-0" aria-hidden="true" /> : <FileText className="w-4 h-4 shrink-0" style={{ color: accent }} aria-hidden="true" />}
        <span className="font-display text-[13px] font-semibold text-slate-100 truncate">{record.name}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-xs font-mono text-slate-400 truncate">
        {isFolder ? (
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
      <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-slate-400 truncate">
        <Clock className="w-3 h-3 text-slate-500 shrink-0" aria-hidden="true" />
        <span>mod {modLabel}</span>
        {creLabel && (
          <>
            <span aria-hidden="true">·</span>
            <span>cre {creLabel}</span>
          </>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-slate-400 !border !border-[#0B0F17]" />
      {toggleBadge}
    </div>
  );
}
