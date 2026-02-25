import { mkdir, readFile, writeFile, access, chmod } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname } from 'node:path';

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function readJson<T>(path: string): Promise<T | null> {
  try {
    const data = await readFile(path, 'utf-8');
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function writeJson(path: string, data: unknown, mode?: number): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  if (mode !== undefined) {
    await chmod(path, mode);
  }
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
