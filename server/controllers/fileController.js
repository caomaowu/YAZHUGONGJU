import fs from 'fs-extra';
import path from 'path';
import { randomUUID } from 'crypto';
import mammoth from 'mammoth';
import { LIBRARY_UPLOAD_DIR, LIBRARY_MAX_FILE_BYTES, LIBRARY_MAX_FILE_MB } from '../config/index.js';
import {
  buildContentDisposition,
  inferLibraryType,
  inferMimeFromExt,
  isAllowedLibraryMime,
  normalizeBase64,
  normalizeStringArray,
  nowIso,
  safeFileExt,
} from '../utils/helpers.js';
import { readLibrary, writeLibrary } from '../services/libraryStore.js';
import {
  enqueueLibraryIndex,
  getLibrarySearchStatus,
  normalizeLibraryItemSearchMeta,
  removeLibraryIndex,
  requestReindex,
  searchLibraryItemContent,
} from '../services/libraryIndexService.js';

async function findLibraryItemOr404(req, res) {
  const id = String(req.params.id || '').trim();
  if (!id) return { ok: false };
  const items = await readLibrary();
  const item = items.find((it) => it && it.id === id);
  if (!item) {
    res.status(404).json({ error: 'File not found' });
    return { ok: false };
  }
  return { ok: true, item, items };
}

export const getLibraryFiles = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const type = String(req.query.type || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim().toLowerCase();
    const tag = String(req.query.tag || '').trim().toLowerCase();

    const items = await readLibrary();
    const filtered = items
      .filter((it) => {
        if (!it) return false;
        if (q) {
          const hay = `${it.originalName || ''} ${it.description || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (type && String(it.type || '').toLowerCase() !== type) return false;
        if (category && String(it.category || '').toLowerCase() !== category) return false;
        if (tag) {
          const tags = Array.isArray(it.tags) ? it.tags : [];
          if (!tags.map((t) => String(t).toLowerCase()).includes(tag)) return false;
        }
        return true;
      })
      .map((it) => normalizeLibraryItemSearchMeta(it))
      .sort((a, b) => String(b.uploadedAt || '').localeCompare(String(a.uploadedAt || '')));

    res.json(filtered);
  } catch {
    res.status(500).json({ error: 'Failed to fetch library files' });
  }
};

export const uploadLibraryFile = async (req, res) => {
  try {
    const { fileName, mimeType, base64, description, category } = req.body || {};
    const originalName = String(fileName || '').trim();
    const mt = String(mimeType || '').toLowerCase().trim() || inferMimeFromExt(originalName);

    if (!originalName) return res.status(400).json({ error: 'Missing fileName' });
    if (!isAllowedLibraryMime(mt)) return res.status(400).json({ error: 'Unsupported file type' });

    const b64 = normalizeBase64(base64);
    if (!b64) return res.status(400).json({ error: 'Missing base64' });

    const buffer = Buffer.from(b64, 'base64');
    if (!buffer.length) return res.status(400).json({ error: 'Empty file' });
    if (buffer.length > LIBRARY_MAX_FILE_BYTES) {
      return res.status(413).json({ error: `File too large, max ${LIBRARY_MAX_FILE_MB}MB` });
    }

    const id = randomUUID();
    const ext = safeFileExt(originalName);
    const storedName = `${id}${ext}`;
    const storedPath = path.join(LIBRARY_UPLOAD_DIR, storedName);

    await fs.ensureDir(LIBRARY_UPLOAD_DIR);
    await fs.writeFile(storedPath, buffer);

    const item = normalizeLibraryItemSearchMeta({
      id,
      originalName,
      storedName,
      mimeType: mt,
      type: inferLibraryType(mt, originalName),
      sizeBytes: buffer.length,
      uploadedAt: nowIso(),
      uploadedBy: req.user?.username || 'unknown',
      description: description === undefined ? '' : String(description).slice(0, 500),
      category: category === undefined ? '' : String(category).slice(0, 80),
      tags: normalizeStringArray(req.body?.tags),
      searchStatus: 'pending',
      searchError: '',
      searchVersion: 1,
      searchUpdatedAt: nowIso(),
    });

    const items = await readLibrary();
    items.unshift(item);
    await writeLibrary(items);

    enqueueLibraryIndex(item.id);
    res.json(item);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
};

export const previewLibraryFile = async (req, res) => {
  try {
    const found = await findLibraryItemOr404(req, res);
    if (!found.ok) return;
    const { item } = found;
    const filePath = path.join(LIBRARY_UPLOAD_DIR, item.storedName);
    if (!(await fs.pathExists(filePath))) return res.status(404).json({ error: 'File not found' });

    const fileType = String(item.type || '').toLowerCase();
    if (fileType === 'docx') {
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', buildContentDisposition('inline', `${item.originalName}.txt`));
        res.send(result.value || '');
      } catch {
        res.status(500).json({ error: 'Failed to preview docx content' });
      }
      return;
    }

    res.setHeader('Content-Type', item.mimeType || inferMimeFromExt(item.originalName));
    res.setHeader('Content-Disposition', buildContentDisposition('inline', item.originalName));
    fs.createReadStream(filePath).pipe(res);
  } catch {
    res.status(500).json({ error: 'Failed to preview file' });
  }
};

export const downloadLibraryFile = async (req, res) => {
  try {
    const found = await findLibraryItemOr404(req, res);
    if (!found.ok) return;
    const { item } = found;
    const filePath = path.join(LIBRARY_UPLOAD_DIR, item.storedName);
    if (!(await fs.pathExists(filePath))) return res.status(404).json({ error: 'File not found' });

    res.setHeader('Content-Type', item.mimeType || inferMimeFromExt(item.originalName));
    res.setHeader('Content-Disposition', buildContentDisposition('attachment', item.originalName));
    fs.createReadStream(filePath).pipe(res);
  } catch {
    res.status(500).json({ error: 'Failed to download file' });
  }
};

export const updateLibraryFile = async (req, res) => {
  try {
    const found = await findLibraryItemOr404(req, res);
    if (!found.ok) return;
    const { item, items } = found;

    const next = { ...item };
    if (req.body?.originalName !== undefined) next.originalName = String(req.body.originalName).trim().slice(0, 200);
    if (req.body?.description !== undefined) next.description = String(req.body.description).slice(0, 500);
    if (req.body?.category !== undefined) next.category = String(req.body.category).slice(0, 80);
    if (req.body?.tags !== undefined) next.tags = normalizeStringArray(req.body.tags);

    if (!next.originalName) return res.status(400).json({ error: 'Invalid originalName' });

    const idx = items.findIndex((it) => it && it.id === item.id);
    if (idx < 0) return res.status(404).json({ error: 'File not found' });
    items[idx] = next;
    await writeLibrary(items);
    res.json(next);
  } catch {
    res.status(500).json({ error: 'Failed to update file metadata' });
  }
};

export const deleteLibraryFile = async (req, res) => {
  try {
    const found = await findLibraryItemOr404(req, res);
    if (!found.ok) return;
    const { item, items } = found;

    const filePath = path.join(LIBRARY_UPLOAD_DIR, item.storedName);
    await fs.remove(filePath);
    await removeLibraryIndex(item.id);

    const next = items.filter((it) => it && it.id !== item.id);
    await writeLibrary(next);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

export const getLibraryFileSearchStatus = async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const status = await getLibrarySearchStatus(id);
    if (!status) return res.status(404).json({ error: 'File not found' });
    res.json(status);
  } catch {
    res.status(500).json({ error: 'Failed to query search status' });
  }
};

export const searchLibraryFileContent = async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const query = String(req.query.q || '');
    const limit = req.query.limit;
    const result = await searchLibraryItemContent(id, query, limit);

    if (result.kind === 'not_found') return res.status(404).json({ error: 'File not found' });
    if (result.kind === 'invalid') return res.status(400).json({ error: result.message });
    if (result.kind === 'processing') return res.status(202).json(result.status);
    if (result.kind === 'failed') return res.status(409).json(result.status);
    return res.json(result.result);
  } catch {
    res.status(500).json({ error: 'Failed to search file content' });
  }
};

export const reindexLibraryFile = async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const status = await requestReindex(id);
    if (!status) return res.status(404).json({ error: 'File not found' });
    res.json(status);
  } catch {
    res.status(500).json({ error: 'Failed to reindex file' });
  }
};
