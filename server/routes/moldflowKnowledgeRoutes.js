import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  getMoldflowKnowledgeConfig,
  updateMoldflowKnowledgeConfig,
} from '../controllers/moldflowKnowledgeController.js';

const router = express.Router();

router.get('/config', authenticateToken, getMoldflowKnowledgeConfig);
router.post('/config', authenticateToken, requireRole(['admin']), updateMoldflowKnowledgeConfig);

export default router;
