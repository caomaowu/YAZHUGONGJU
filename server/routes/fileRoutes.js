import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  getLibraryFiles,
  uploadLibraryFile,
  previewLibraryFile,
  downloadLibraryFile,
  updateLibraryFile,
  deleteLibraryFile
} from '../controllers/fileController.js';

const router = express.Router();

// Library
router.get('/library/files', authenticateToken, getLibraryFiles);
router.post('/library/files', authenticateToken, requireRole(['admin']), uploadLibraryFile);

router.get('/library/files/:id/preview', authenticateToken, previewLibraryFile);
router.get('/library/files/:id/download', authenticateToken, downloadLibraryFile);

router.patch('/library/files/:id', authenticateToken, requireRole(['admin']), updateLibraryFile);
router.delete('/library/files/:id', authenticateToken, requireRole(['admin']), deleteLibraryFile);

export default router;
