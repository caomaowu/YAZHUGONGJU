import fs from 'fs-extra';
import path from 'path';
import { randomUUID } from 'crypto';
import { 
  LIBRARY_FILE, 
  LIBRARY_UPLOAD_DIR 
} from '../config/index.js';
import { 
  readJsonWithDefault, 
  nowIso, 
  safeFileExt, 
  normalizeBase64, 
  normalizeStringArray, 
  isAllowedLibraryMime, 
  inferLibraryType, 
  inferMimeFromExt,
  buildContentDisposition 
} from '../utils/helpers.js';

// Helpers
async function readLibrary() {
  const value = await readJsonWithDefault(LIBRARY_FILE, []);
  return Array.isArray(value) ? value : [];
}

async function writeLibrary(items) {
  await fs.writeJson(LIBRARY_FILE, Array.isArray(items) ? items : [], { spaces: 2 });
}

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

// Handlers
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
          if (!tags.map(t => String(t).toLowerCase()).includes(tag)) return false;
        }
        return true;
      })
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
    const maxBytes = 20 * 1024 * 1024;
    if (!buffer.length) return res.status(400).json({ error: 'Empty file' });
    if (buffer.length > maxBytes) return res.status(413).json({ error: 'File too large' });

    const id = randomUUID();
    const ext = safeFileExt(originalName);
    const storedName = `${id}${ext}`;
    const storedPath = path.join(LIBRARY_UPLOAD_DIR, storedName);
    
    // Ensure upload dir exists
    await fs.ensureDir(LIBRARY_UPLOAD_DIR);
    await fs.writeFile(storedPath, buffer);

    const item = {
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
      tags: normalizeStringArray(req.body?.tags)
    };

    const items = await readLibrary();
    items.unshift(item);
    await writeLibrary(items);

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

    const next = items.filter((it) => it && it.id !== item.id);
    await writeLibrary(next);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete file' });
  }
};
