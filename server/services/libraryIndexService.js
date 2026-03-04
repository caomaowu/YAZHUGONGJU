import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';
import { LIBRARY_INDEX_DIR, LIBRARY_INDEX_TIMEOUT_SEC, LIBRARY_UPLOAD_DIR } from '../config/index.js';
import { nowIso } from '../utils/helpers.js';
import { findLibraryItemById, readLibrary, updateLibraryItemById, writeLibrary } from './libraryStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PYTHON_SCRIPT = path.resolve(__dirname, '../python/extract_text.py');

const SEARCH_VERSION = 1;
const SEARCH_STATUS_SET = new Set(['pending', 'processing', 'ready', 'failed']);
const MAX_HITS_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const DOCX_CHUNK_CHARS = 1800;
const PYTHON_TIMEOUT_MS = LIBRARY_INDEX_TIMEOUT_SEC * 1000;

const queue = [];
const queued = new Map();
let isProcessing = false;

function toValidStatus(input) {
  const value = String(input || '').trim();
  return SEARCH_STATUS_SET.has(value) ? value : 'pending';
}

function withSearchMeta(item) {
  if (!item || typeof item !== 'object') return item;
  const status = toValidStatus(item.searchStatus);
  return {
    ...item,
    searchStatus: status,
    searchUpdatedAt: item.searchUpdatedAt || item.uploadedAt || nowIso(),
    searchError: typeof item.searchError === 'string' ? item.searchError : '',
    searchVersion: Number(item.searchVersion) > 0 ? Number(item.searchVersion) : SEARCH_VERSION,
  };
}

function buildIndexPath(fileId) {
  return path.join(LIBRARY_INDEX_DIR, `${fileId}.index.json`);
}

function normalizePages(pages) {
  const list = Array.isArray(pages) ? pages : [];
  const normalized = list
    .map((it, idx) => ({
      page: Number(it?.page) > 0 ? Number(it.page) : idx + 1,
      text: String(it?.text || ''),
      source: it?.source === 'ocr' ? 'ocr' : 'native',
    }))
    .filter((it) => it.text.trim().length > 0);

  if (normalized.length > 0) return normalized;
  return [{ page: 1, text: '', source: 'native' }];
}

function splitTextToPages(text, chunkChars = DOCX_CHUNK_CHARS) {
  const normalized = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return [{ page: 1, text: '', source: 'native' }];

  const blocks = normalized.split(/\n{2,}/).map((it) => it.trim()).filter(Boolean);
  const pages = [];
  let current = '';
  for (const block of blocks) {
    const next = current ? `${current}\n\n${block}` : block;
    if (next.length > chunkChars && current) {
      pages.push(current);
      current = block;
      continue;
    }
    current = next;
  }
  if (current) pages.push(current);

  return pages.map((it, idx) => ({ page: idx + 1, text: it, source: 'native' }));
}

async function runPythonExtract(filePath, type) {
  const args = ['-X', 'utf8', PYTHON_SCRIPT, '--file', filePath, '--type', type];
  return new Promise((resolve, reject) => {
    const child = spawn('python', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
      },
    });
    let stdout = '';
    let stderr = '';
    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill('SIGKILL');
      reject(new Error('Text extraction timed out'));
    }, PYTHON_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk || '');
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
    });
    child.on('error', (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (code !== 0) {
        const msg = stderr.trim() || stdout.trim() || `Python exited with code ${code}`;
        reject(new Error(msg));
        return;
      }
      try {
        const parsed = JSON.parse(String(stdout || '{}'));
        resolve(parsed);
      } catch {
        reject(new Error('Invalid extractor response'));
      }
    });
  });
}

async function extractPages(item, filePath) {
  const type = String(item?.type || '').toLowerCase();
  if (type === 'text' || type === 'markdown') {
    const text = await fs.readFile(filePath, 'utf8');
    return [{ page: 1, text, source: 'native' }];
  }
  if (type === 'docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return splitTextToPages(result.value || '');
  }
  if (type === 'pdf' || type === 'image') {
    const parsed = await runPythonExtract(filePath, type);
    return normalizePages(parsed?.pages);
  }
  return [{ page: 1, text: '', source: 'native' }];
}

async function writeIndex(fileId, itemType, pages) {
  const normalized = normalizePages(pages);
  const stats = normalized.reduce(
    (acc, it) => {
      acc.charCount += it.text.length;
      if (it.source === 'ocr') acc.ocrPageCount += 1;
      return acc;
    },
    { pageCount: normalized.length, charCount: 0, ocrPageCount: 0 }
  );
  await fs.ensureDir(LIBRARY_INDEX_DIR);
  await fs.writeJson(
    buildIndexPath(fileId),
    {
      fileId,
      version: SEARCH_VERSION,
      type: itemType,
      pages: normalized,
      stats,
      generatedAt: nowIso(),
    },
    { spaces: 2 }
  );
}

async function patchItemSearch(fileId, patch) {
  return updateLibraryItemById(fileId, (current) => {
    if (!current) return current;
    return {
      ...current,
      ...patch,
      searchUpdatedAt: nowIso(),
      searchVersion: SEARCH_VERSION,
    };
  });
}

async function processTask(task) {
  const fileId = String(task?.id || '').trim();
  if (!fileId) return;
  const item = await findLibraryItemById(fileId);
  if (!item) return;

  const fullPath = path.join(LIBRARY_UPLOAD_DIR, item.storedName || '');
  if (!(await fs.pathExists(fullPath))) {
    await patchItemSearch(fileId, { searchStatus: 'failed', searchError: 'Source file not found' });
    return;
  }

  const indexPath = buildIndexPath(fileId);
  if (!task.force && item.searchStatus === 'ready' && (await fs.pathExists(indexPath))) {
    return;
  }

  await patchItemSearch(fileId, { searchStatus: 'processing', searchError: '' });
  try {
    const pages = await extractPages(item, fullPath);
    await writeIndex(fileId, item.type, pages);
    await patchItemSearch(fileId, { searchStatus: 'ready', searchError: '' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown index error';
    await patchItemSearch(fileId, { searchStatus: 'failed', searchError: message.slice(0, 1000) });
  }
}

async function drainQueue() {
  if (isProcessing) return;
  isProcessing = true;
  try {
    while (queue.length > 0) {
      const task = queue.shift();
      if (!task?.id) continue;
      queued.delete(task.id);
      await processTask(task);
    }
  } finally {
    isProcessing = false;
  }
}

export function enqueueLibraryIndex(fileId, options = {}) {
  const id = String(fileId || '').trim();
  if (!id) return;
  const force = Boolean(options.force);
  const previous = queued.get(id);
  if (previous !== undefined) {
    if (force && !previous) {
      queued.set(id, true);
      const task = queue.find((it) => it.id === id);
      if (task) task.force = true;
    }
    return;
  }
  queued.set(id, force);
  queue.push({ id, force });
  void drainQueue();
}

export async function bootstrapLibraryIndexing() {
  await fs.ensureDir(LIBRARY_INDEX_DIR);
  const items = await readLibrary();
  let changed = false;
  const next = items.map((item) => {
    const normalized = withSearchMeta(item);
    if (normalized?.searchStatus === 'processing') {
      normalized.searchStatus = 'pending';
    }
    if (JSON.stringify(normalized) !== JSON.stringify(item)) changed = true;
    return normalized;
  });
  if (changed) {
    await writeLibrary(next);
  }

  for (const item of next) {
    if (!item?.id) continue;
    const indexExists = await fs.pathExists(buildIndexPath(item.id));
    if (item.searchStatus === 'pending' || (item.searchStatus === 'ready' && !indexExists)) {
      enqueueLibraryIndex(item.id);
    }
  }
}

export async function removeLibraryIndex(fileId) {
  const id = String(fileId || '').trim();
  if (!id) return;
  await fs.remove(buildIndexPath(id));
}

export async function getLibrarySearchStatus(fileId) {
  const item = await findLibraryItemById(fileId);
  if (!item) return null;
  const normalized = withSearchMeta(item);
  return {
    id: normalized.id,
    searchStatus: normalized.searchStatus,
    searchUpdatedAt: normalized.searchUpdatedAt,
    searchError: normalized.searchError || '',
    searchVersion: normalized.searchVersion,
  };
}

function buildSnippet(text, start, length) {
  const src = String(text || '');
  const qLen = Math.max(1, length);
  const begin = Math.max(0, start - 30);
  const end = Math.min(src.length, start + qLen + 70);
  const head = begin > 0 ? '...' : '';
  const tail = end < src.length ? '...' : '';
  const snippet = src.slice(begin, end).replace(/\s+/g, ' ').trim();
  return `${head}${snippet}${tail}`;
}

export async function searchLibraryItemContent(fileId, rawQuery, rawLimit) {
  const query = String(rawQuery || '').trim();
  if (!query) return { kind: 'invalid', message: 'Missing query' };
  const status = await getLibrarySearchStatus(fileId);
  if (!status) return { kind: 'not_found' };
  if (status.searchStatus === 'pending' || status.searchStatus === 'processing') {
    return { kind: 'processing', status };
  }
  if (status.searchStatus === 'failed') {
    return { kind: 'failed', status };
  }

  const indexPath = buildIndexPath(fileId);
  if (!(await fs.pathExists(indexPath))) {
    await patchItemSearch(fileId, { searchStatus: 'pending', searchError: '' });
    enqueueLibraryIndex(fileId);
    return { kind: 'processing', status: await getLibrarySearchStatus(fileId) };
  }

  const index = await fs.readJson(indexPath);
  const pages = Array.isArray(index?.pages) ? index.pages : [];
  const needle = query.toLowerCase();
  const maxHits = Math.max(1, Math.min(Number(rawLimit) || DEFAULT_LIMIT, MAX_HITS_LIMIT));
  const hits = [];
  let totalHits = 0;

  for (const page of pages) {
    const text = String(page?.text || '');
    const lower = text.toLowerCase();
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(needle, from);
      if (idx < 0) break;
      totalHits += 1;
      if (hits.length < maxHits) {
        hits.push({
          page: Number(page?.page) > 0 ? Number(page.page) : 1,
          snippet: buildSnippet(text, idx, needle.length),
          source: page?.source === 'ocr' ? 'ocr' : 'native',
          indexInPage: idx,
        });
      }
      from = idx + Math.max(1, needle.length);
    }
  }

  return {
    kind: 'ready',
    status,
    result: {
      query,
      totalHits,
      hits,
      truncated: hits.length < totalHits,
    },
  };
}

export async function requestReindex(fileId) {
  const item = await findLibraryItemById(fileId);
  if (!item) return null;
  await patchItemSearch(fileId, { searchStatus: 'pending', searchError: '' });
  enqueueLibraryIndex(fileId, { force: true });
  return getLibrarySearchStatus(fileId);
}

export function normalizeLibraryItemSearchMeta(item) {
  return withSearchMeta(item);
}
