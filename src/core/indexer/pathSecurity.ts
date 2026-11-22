import fs from 'node:fs';
import path from 'node:path';

const FORBIDDEN_PREFIXES = ['/etc', '/proc', '/sys', '/dev', '/bin', '/sbin', '/boot', '/root'];

export function isInsideDirectory(targetPath: string, baseDirectory: string): boolean {
  const resolvedTarget = path.resolve(targetPath);
  const resolvedBase = path.resolve(baseDirectory);
  if (resolvedTarget === resolvedBase) {
    return true;
  }
  return resolvedTarget.startsWith(resolvedBase + path.sep);
}

export function validateWorkspaceDirectory(rawPath: string): { ok: true; resolvedPath: string } | { ok: false; error: string } {
  const trimmed = rawPath.trim();
  if (!trimmed) {
    return { ok: false, error: 'La ruta de la carpeta no puede estar vacía.' };
  }

  const resolved = path.resolve(trimmed);
  if (resolved === '/' || FORBIDDEN_PREFIXES.some((prefix) => resolved === prefix || resolved.startsWith(prefix + path.sep))) {
    return { ok: false, error: 'Ruta del sistema restringida por seguridad.' };
  }

  if (!fs.existsSync(resolved)) {
    return { ok: false, error: `La ruta no existe: ${resolved}` };
  }

  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) {
    return { ok: false, error: 'La ruta seleccionada debe ser una carpeta.' };
  }

  return { ok: true, resolvedPath: resolved };
}
