import fs from 'fs-extra';
import path from 'path';
import bcrypt from 'bcryptjs';
import { 
  DATA_FILE, 
  LOCATIONS_FILE, 
  MODELS_FILE, 
  USERS_FILE, 
  ROLES_FILE, 
  CHATS_FILE 
} from '../config/index.js';
import { readJsonWithDefault } from '../utils/helpers.js';

// --- Roles ---
export const getRoles = async (req, res) => {
  try {
    const roles = await fs.readJson(ROLES_FILE);
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

export const createRole = async (req, res) => {
  try {
    const { id, name, description, permissions, canEdit, canDelete } = req.body;
    if (!id || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const roles = await fs.readJson(ROLES_FILE);
    if (roles.find(r => r.id === id)) {
      return res.status(400).json({ error: 'Role ID already exists' });
    }

    const newRole = { id, name, description, permissions: permissions || [], canEdit: !!canEdit, canDelete: !!canDelete };
    roles.push(newRole);
    await fs.writeJson(ROLES_FILE, roles, { spaces: 2 });
    
    res.json(newRole);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create role' });
  }
};

export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions, canEdit, canDelete } = req.body;
    
    if (id === 'admin') {
      if (permissions && !permissions.includes('*')) {
         return res.status(400).json({ error: 'Cannot revoke admin permissions' });
      }
    }

    const roles = await fs.readJson(ROLES_FILE);
    const roleIndex = roles.findIndex(r => r.id === id);
    
    if (roleIndex === -1) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const role = roles[roleIndex];
    if (name) role.name = name;
    if (description !== undefined) role.description = description;
    if (permissions) role.permissions = permissions;
    if (canEdit !== undefined) role.canEdit = canEdit;
    if (canDelete !== undefined) role.canDelete = canDelete;

    roles[roleIndex] = role;
    await fs.writeJson(ROLES_FILE, roles, { spaces: 2 });

    res.json(role);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
};

export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    if (['admin', 'engineer', 'operator', 'viewer'].includes(id)) {
      return res.status(400).json({ error: 'Cannot delete system roles' });
    }

    const roles = await fs.readJson(ROLES_FILE);
    const newRoles = roles.filter(r => r.id !== id);
    
    if (roles.length === newRoles.length) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Check if any user is using this role
    const users = await fs.readJson(USERS_FILE);
    if (users.some(u => u.role === id)) {
      return res.status(400).json({ error: 'Cannot delete role assigned to users' });
    }

    await fs.writeJson(ROLES_FILE, newRoles, { spaces: 2 });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete role' });
  }
};

// --- Users ---
export const getUsers = async (req, res) => {
  try {
    const users = await fs.readJson(USERS_FILE);
    const safeUsers = users.map(({ password, ...u }) => u);
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const createUser = async (req, res) => {
  try {
    const { username, password, role, name } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const users = await fs.readJson(USERS_FILE);
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { username, password: hashedPassword, role, name: name || username };
    
    users.push(newUser);
    await fs.writeJson(USERS_FILE, users, { spaces: 2 });
    
    const { password: _, ...safeUser } = newUser;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { username } = req.params;
    const { password, role, name } = req.body;
    
    const users = await fs.readJson(USERS_FILE);
    const userIndex = users.findIndex(u => u.username === username);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[userIndex];
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    if (role) user.role = role;
    if (name) user.name = name;

    users[userIndex] = user;
    await fs.writeJson(USERS_FILE, users, { spaces: 2 });

    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { username } = req.params;
    if (username === 'admin') {
      return res.status(400).json({ error: 'Cannot delete default admin' });
    }

    const users = await fs.readJson(USERS_FILE);
    const newUsers = users.filter(u => u.username !== username);
    
    if (users.length === newUsers.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    await fs.writeJson(USERS_FILE, newUsers, { spaces: 2 });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// --- Chats ---
export const getChats = async (req, res) => {
  try {
    const chats = await readJsonWithDefault(CHATS_FILE, []);
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

export const saveChat = async (req, res) => {
  try {
    const session = req.body;
    if (!session || !session.id) {
      return res.status(400).json({ error: 'Invalid session data' });
    }

    const chats = await readJsonWithDefault(CHATS_FILE, []);
    const index = chats.findIndex(c => c.id === session.id);
    
    if (index !== -1) {
      chats[index] = session;
    } else {
      chats.unshift(session);
    }

    await fs.writeJson(CHATS_FILE, chats, { spaces: 2 });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save chat' });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const { id } = req.params;
    const chats = await readJsonWithDefault(CHATS_FILE, []);
    const newChats = chats.filter(c => c.id !== id);
    
    await fs.writeJson(CHATS_FILE, newChats, { spaces: 2 });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete chat' });
  }
};

export const clearChats = async (req, res) => {
  try {
    await fs.writeJson(CHATS_FILE, [], { spaces: 2 });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear chats' });
  }
};

// --- Machines ---
export const getMachines = async (req, res) => {
  try {
    const data = await fs.readJson(DATA_FILE);
    res.json(data);
  } catch (error) {
    console.error('Error reading machines:', error);
    res.status(500).json({ error: 'Failed to read machines data' });
  }
};

export const saveMachines = async (req, res) => {
  try {
    const machines = req.body;
    await fs.writeJson(DATA_FILE, machines, { spaces: 2 });
    res.json({ success: true, message: 'Machines saved successfully' });
  } catch (error) {
    console.error('Error saving machines:', error);
    res.status(500).json({ error: 'Failed to save machines data' });
  }
};

// --- Locations ---
export const getLocations = async (req, res) => {
  try {
    const data = await fs.readJson(LOCATIONS_FILE);
    res.json(data);
  } catch (error) {
    console.error('Error reading locations:', error);
    res.json(["一车间", "二车间", "新厂区"]); 
  }
};

export const saveLocations = async (req, res) => {
  try {
    const locations = req.body;
    await fs.writeJson(LOCATIONS_FILE, locations, { spaces: 2 });
    res.json({ success: true, message: 'Locations saved successfully' });
  } catch (error) {
    console.error('Error saving locations:', error);
    res.status(500).json({ error: 'Failed to save locations data' });
  }
};

// --- Machine Models ---
export const getMachineModels = async (req, res) => {
  try {
    const data = await fs.readJson(MODELS_FILE);
    res.json(data);
  } catch (error) {
    console.error('Error reading machine models:', error);
    res.status(500).json({ error: 'Failed to read machine models data' });
  }
};
