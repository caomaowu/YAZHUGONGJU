import fs from 'fs-extra';
import { LIBRARY_FILE } from '../config/index.js';
import { readJsonWithDefault } from '../utils/helpers.js';

export async function readLibrary() {
  const value = await readJsonWithDefault(LIBRARY_FILE, []);
  return Array.isArray(value) ? value : [];
}

export async function writeLibrary(items) {
  await fs.writeJson(LIBRARY_FILE, Array.isArray(items) ? items : [], { spaces: 2 });
}

export async function updateLibraryItemById(id, updater) {
  const fileId = String(id || '').trim();
  if (!fileId) return null;
  const items = await readLibrary();
  const idx = items.findIndex((it) => it && it.id === fileId);
  if (idx < 0) return null;
  const current = items[idx];
  const next = typeof updater === 'function' ? updater(current) : current;
  if (!next) return null;
  items[idx] = next;
  await writeLibrary(items);
  return next;
}

export async function findLibraryItemById(id) {
  const fileId = String(id || '').trim();
  if (!fileId) return null;
  const items = await readLibrary();
  return items.find((it) => it && it.id === fileId) || null;
}
