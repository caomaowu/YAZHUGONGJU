import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_ROOT = path.resolve(__dirname, '..');

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = Number(process.env.PORT || 3001);
export const SECRET_KEY = process.env.JWT_SECRET;
export const CORS_ORIGIN = process.env.CORS_ORIGIN || '';

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export const LIBRARY_MAX_FILE_MB = toPositiveInt(process.env.LIBRARY_MAX_FILE_MB, 150);
export const LIBRARY_MAX_FILE_BYTES = LIBRARY_MAX_FILE_MB * 1024 * 1024;
export const LIBRARY_TOTAL_MAX_MB = toPositiveInt(process.env.LIBRARY_TOTAL_MAX_MB, 2048);
export const LIBRARY_TOTAL_MAX_BYTES = LIBRARY_TOTAL_MAX_MB * 1024 * 1024;
export const LIBRARY_INDEX_TIMEOUT_SEC = toPositiveInt(process.env.LIBRARY_INDEX_TIMEOUT_SEC, 1800);
export const LIBRARY_UPLOAD_BODY_LIMIT_MB = Math.max(10, Math.ceil(LIBRARY_MAX_FILE_MB * 1.5));
export const LIBRARY_UPLOAD_BODY_LIMIT = `${LIBRARY_UPLOAD_BODY_LIMIT_MB}mb`;

// Data file paths
export const DATA_FILE = path.join(SERVER_ROOT, 'machines.json');
export const LOCATIONS_FILE = path.join(SERVER_ROOT, 'locations.json');
export const MODELS_FILE = path.join(SERVER_ROOT, 'machine_models.json');
export const USERS_FILE = path.join(SERVER_ROOT, 'users.json');
export const ROLES_FILE = path.join(SERVER_ROOT, 'roles.json');
export const CHATS_FILE = path.join(SERVER_ROOT, 'chats.json');
export const ANALYTICS_EVENTS_FILE = path.join(SERVER_ROOT, 'analytics_events.json');
export const BAILIAN_CONFIG_FILE = path.join(SERVER_ROOT, 'bailian_config.json');
export const LIBRARY_FILE = path.join(SERVER_ROOT, 'library.json');
export const LIBRARY_UPLOAD_DIR = path.join(SERVER_ROOT, 'uploads', 'library');
export const LIBRARY_INDEX_DIR = path.join(SERVER_ROOT, 'indexes', 'library');

export const LIBRARY_ALLOWED_MIME_PREFIX = ['image/'];
export const LIBRARY_ALLOWED_MIME_EXACT = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/x-markdown'
];
