import fs from 'node:fs';

export interface FsTimestamps {
  createdAt: number;
  modifiedAt: number;
}

export function readFsTimestamps(targetPath: string, previousCreatedAt?: number): FsTimestamps {
  const now = Date.now();
  try {
    const stat = fs.statSync(targetPath);
    const modifiedAt = Math.round(stat.mtimeMs > 0 ? stat.mtimeMs : now);
    const rawBirth =
      stat.birthtimeMs && stat.birthtimeMs > 0
        ? stat.birthtimeMs
        : stat.ctimeMs && stat.ctimeMs > 0
          ? Math.min(stat.ctimeMs, modifiedAt)
          : modifiedAt;
    const birthRounded = Math.round(rawBirth);
    const createdAt =
      previousCreatedAt && previousCreatedAt > 0
        ? Math.min(previousCreatedAt, birthRounded)
        : birthRounded;
    return { createdAt, modifiedAt };
  } catch {
    const createdAt = previousCreatedAt && previousCreatedAt > 0 ? previousCreatedAt : now;
    return { createdAt, modifiedAt: now };
  }
}
