import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVER_ROOT = path.resolve(__dirname, '..');

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = Number(process.env.PORT || 3001);
export const SECRET_KEY = process.env.JWT_SECRET;
export const CORS_ORIGIN = process.env.CORS_ORIGIN || '';

// Data file paths
export const DATA_FILE = path.join(SERVER_ROOT, 'machines.json');
export const LOCATIONS_FILE = path.join(SERVER_ROOT, 'locations.json');
export const MODELS_FILE = path.join(SERVER_ROOT, 'machine_models.json');
export const USERS_FILE = path.join(SERVER_ROOT, 'users.json');
export const ROLES_FILE = path.join(SERVER_ROOT, 'roles.json');
export const CHATS_FILE = path.join(SERVER_ROOT, 'chats.json');
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
