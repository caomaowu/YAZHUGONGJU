import fs from 'fs-extra';
import path from 'path';
import { LIBRARY_ALLOWED_MIME_PREFIX, LIBRARY_ALLOWED_MIME_EXACT } from '../config/index.js';

export function nowIso() {
  return new Date().toISOString();
}

export function safeFileExt(originalName) {
  const ext = path.extname(String(originalName || '')).toLowerCase();
  if (!ext || ext.length > 12) return '';
  if (!/^\.[a-z0-9]+$/.test(ext)) return '';
  return ext;
}

export async function readJsonWithDefault(file, defaultValue) {
  try {
    if (!(await fs.pathExists(file))) {
      await fs.writeJson(file, defaultValue, { spaces: 2 });
      return defaultValue;
    }
    return await fs.readJson(file);
  } catch {
    await fs.writeJson(file, defaultValue, { spaces: 2 });
    return defaultValue;
  }
}

export function maskSensitive(str, visibleChars = 8) {
    if (!str || str.length <= visibleChars) return str;
    return str.slice(0, visibleChars) + '******';
}

export function isMasked(str) {
    return str && str.includes('******');
}

export function buildContentDisposition(disposition, filename) {
  const name = String(filename || 'file');
  const asciiFallback = name.replace(/[^\x20-\x7E]+/g, '_');
  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export function normalizeBase64(input) {
  const value = String(input || '');
  const idx = value.indexOf('base64,');
  return idx >= 0 ? value.slice(idx + 'base64,'.length) : value;
}

export function normalizeStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map(s => s.trim()).filter(Boolean).slice(0, 20);
  return String(value)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function isAllowedLibraryMime(mimeType) {
  const mt = String(mimeType || '').toLowerCase();
  if (!mt) return false;
  if (LIBRARY_ALLOWED_MIME_EXACT.includes(mt)) return true;
  return LIBRARY_ALLOWED_MIME_PREFIX.some(prefix => mt.startsWith(prefix));
}

export function inferLibraryType(mimeType, originalName) {
  const mt = String(mimeType || '').toLowerCase();
  if (mt.startsWith('image/')) return 'image';
  if (mt === 'application/pdf') return 'pdf';
  if (mt === 'text/markdown' || mt === 'text/x-markdown') return 'markdown';
  if (mt.startsWith('text/')) return 'text';
  const ext = safeFileExt(originalName);
  if (ext === '.pdf') return 'pdf';
  if (ext === '.md' || ext === '.markdown') return 'markdown';
  if (ext === '.txt') return 'text';
  if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) return 'image';
  return 'file';
}

export function inferMimeFromExt(originalName) {
  const ext = safeFileExt(originalName);
  if (ext === '.pdf') return 'application/pdf';
  if (ext === '.md' || ext === '.markdown') return 'text/markdown';
  if (ext === '.txt') return 'text/plain';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'application/octet-stream';
}
