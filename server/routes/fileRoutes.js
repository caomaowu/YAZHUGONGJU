import express from 'express';
import { authenticateToken, requireCapability } from '../middleware/auth.js';
import {
  getLibraryFiles,
  uploadLibraryFile,
  previewLibraryFile,
  downloadLibraryFile,
  updateLibraryFile,
  deleteLibraryFile,
  getLibraryFileSearchStatus,
  searchLibraryFileContent,
  reindexLibraryFile
} from '../controllers/fileController.js';

const router = express.Router();

// Library
router.get('/library/files', authenticateToken, getLibraryFiles);
router.post('/library/files', authenticateToken, requireCapability('edit'), uploadLibraryFile);

router.get('/library/files/:id/preview', authenticateToken, previewLibraryFile);
router.get('/library/files/:id/download', authenticateToken, downloadLibraryFile);
router.get('/library/files/:id/search-status', authenticateToken, getLibraryFileSearchStatus);
router.get('/library/files/:id/search', authenticateToken, searchLibraryFileContent);
router.post('/library/files/:id/reindex', authenticateToken, requireCapability('edit'), reindexLibraryFile);

router.patch('/library/files/:id', authenticateToken, requireCapability('edit'), updateLibraryFile);
router.delete('/library/files/:id', authenticateToken, requireCapability('delete'), deleteLibraryFile);

export default router;
