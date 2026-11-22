export function getExtensionAccent(ext?: string): string {
  switch (ext) {
    case '.ts':
    case '.tsx':
      return '#38BDF8';
    case '.js':
    case '.jsx':
      return '#FBBF24';
    case '.py':
      return '#34D399';
    case '.md':
    case '.mdx':
      return '#A78BFA';
    case '.json':
      return '#FB923C';
    default:
      return '#94A3B8';
  }
}

export function formatShortTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

import type { ActivityKind } from '../../types/protocol';

const LANE_COLORS = ['#38BDF8', '#34D399', '#A78BFA', '#FB923C', '#F472B6', '#2DD4BF'];

export function getTopicColor(index: number): string {
  return LANE_COLORS[Math.abs(index) % LANE_COLORS.length];
}

export function getActivityNodeClass(action?: ActivityKind): string {
  if (!action) return '';
  if (action === 'edit' || action === 'delete') return 'node-blink-edit border-amber-400';
  if (action === 'create') return 'node-blink-create border-emerald-400';
  if (action === 'move') return 'node-blink-move border-violet-400';
  return 'node-blink-agent border-sky-400';
}

export function getActivityDotClass(action?: ActivityKind): string {
  if (!action) return 'bg-sky-400';
  if (action === 'edit' || action === 'delete') return 'bg-amber-400';
  if (action === 'create') return 'bg-emerald-400';
  if (action === 'move') return 'bg-violet-400';
  return 'bg-sky-400';
}
