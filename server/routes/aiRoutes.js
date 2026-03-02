import express from 'express';
import {
  getConfig,
  updateConfig,
  listFiles,
  uploadDocument,
  chat,
  proxy
} from '../controllers/aiController.js';

const router = express.Router();

// Config
router.get('/bailian/config', getConfig);
router.post('/bailian/config', updateConfig);

// Files
router.get('/bailian/files', listFiles);
router.post('/bailian/documents/upload', uploadDocument);

// Chat
router.post('/bailian/chat', chat);
router.post('/ai/proxy', proxy);

export default router;
