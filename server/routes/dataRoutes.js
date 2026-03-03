import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getChats,
  saveChat,
  deleteChat,
  clearChats,
  getMachines,
  saveMachines,
  getLocations,
  saveLocations,
  getMachineModels,
  trackAnalyticsEvent,
  getAnalyticsOverview
} from '../controllers/dataController.js';

const router = express.Router();

// Roles
router.get('/roles', authenticateToken, getRoles);
router.post('/roles', authenticateToken, requireRole(['admin']), createRole);
router.put('/roles/:id', authenticateToken, requireRole(['admin']), updateRole);
router.delete('/roles/:id', authenticateToken, requireRole(['admin']), deleteRole);

// Users
router.get('/users', authenticateToken, requireRole(['admin']), getUsers);
router.post('/users', authenticateToken, requireRole(['admin']), createUser);
router.put('/users/:username', authenticateToken, requireRole(['admin']), updateUser);
router.delete('/users/:username', authenticateToken, requireRole(['admin']), deleteUser);

// Chats
router.get('/ai/chats', getChats);
router.post('/ai/chats', saveChat);
router.delete('/ai/chats/:id', deleteChat);
router.delete('/ai/chats', clearChats);

// Machines
router.get('/machines', getMachines);
router.post('/machines', saveMachines);

// Locations
router.get('/locations', getLocations);
router.post('/locations', saveLocations);

// Machine Models
router.get('/machine-models', getMachineModels);

// Analytics
router.post('/analytics/track', authenticateToken, trackAnalyticsEvent);
router.get('/analytics/overview', authenticateToken, getAnalyticsOverview);

export default router;
