import type { CSSProperties } from 'react';
import type { NodeVisualTheme } from '../../types/indexer';

export const NODE_THEME_OPTIONS: Array<{
  id: NodeVisualTheme;
  label: string;
  swatchClass: string;
}> = [
  { id: 'classic', label: 'Clásico', swatchClass: 'bg-slate-600 border-slate-400' },
  { id: 'glass', label: 'Cristal', swatchClass: 'bg-sky-300/30 border-white/60' },
  { id: 'neon', label: 'Neón', swatchClass: 'bg-cyan-400 border-cyan-200 shadow-[0_0_8px_#22d3ee]' },
  { id: 'blueprint', label: 'Blueprint', swatchClass: 'bg-[#0B0F17] border-dashed border-sky-400' },
  { id: 'gradient', label: 'Gradiente', swatchClass: 'bg-gradient-to-br from-indigo-500 to-cyan-400 border-indigo-300' },
];

export function getThemeSurfaceClass(theme: NodeVisualTheme = 'classic'): string {
  switch (theme) {
    case 'glass':
      return 'bg-slate-900/55 backdrop-blur-md border-white/20 shadow-[0_8px_22px_rgba(0,0,0,0.45)]';
    case 'neon':
      return 'bg-[#070B14] border-cyan-400/60';
    case 'blueprint':
      return 'bg-[#0B0F17]/95 border-dashed border-sky-400/45';
    case 'gradient':
      return 'bg-gradient-to-br from-[#1E293B] via-[#151F34] to-[#0E1525] border-indigo-400/35 shadow-md';
    case 'classic':
    default:
      return 'bg-[#161E2E] border-white/[0.14]';
  }
}

export function getThemeInlineStyle(
  theme: NodeVisualTheme = 'classic',
  accent: string,
  hasOverrideState: boolean
): CSSProperties | undefined {
  if (hasOverrideState) return undefined;
  if (theme === 'neon') {
    return {
      borderColor: accent,
      boxShadow: `0 0 14px ${accent}38, inset 0 0 8px ${accent}18`,
    };
  }
  if (theme === 'gradient') {
    return {
      borderColor: `${accent}70`,
    };
  }
  if (theme === 'blueprint') {
    return {
      borderColor: `${accent}88`,
    };
  }
  return undefined;
}
