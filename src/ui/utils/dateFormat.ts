export function formatShortDateTime(ts?: number): string {
  if (!ts || !Number.isFinite(ts)) return '—';
  return new Date(ts).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFullDateTime(ts?: number): string {
  if (!ts || !Number.isFinite(ts)) return 'Sin fecha';
  return new Date(ts).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatRelativeTime(ts?: number, now = Date.now()): string {
  if (!ts || !Number.isFinite(ts)) return 'sin fecha';
  const diffMs = Math.max(0, now - ts);
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 45) return 'ahora';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) return `hace ${diffDays} d`;
  return formatShortDateTime(ts);
}

export function formatCompactBadgeTime(ts?: number, now = Date.now()): string {
  if (!ts || !Number.isFinite(ts)) return '—';
  const diffMs = Math.max(0, now - ts);
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) return `hace ${diffDays}d`;
  return new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

export function buildNodeDateTooltip(
  name: string,
  modifiedAt?: number,
  createdAt?: number
): string {
  const parts = [name];
  if (modifiedAt) parts.push(`Última mod.: ${formatFullDateTime(modifiedAt)}`);
  if (createdAt) parts.push(`Creado: ${formatFullDateTime(createdAt)}`);
  return parts.join('\n');
}
