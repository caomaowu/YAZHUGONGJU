import fs from 'fs-extra';
import path from 'path';
import bcrypt from 'bcryptjs';
import { 
  DATA_FILE, 
  LOCATIONS_FILE, 
  MODELS_FILE, 
  USERS_FILE, 
  ROLES_FILE, 
  CHATS_FILE,
  ANALYTICS_EVENTS_FILE
} from '../config/index.js';
import { readJsonWithDefault } from '../utils/helpers.js';

const ANALYTICS_MAX_EVENTS = 100000;
const ANALYTICS_MAX_DAYS = 90;

function toIsoDay(input) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function getRecentIsoDays(days) {
  const count = Math.min(Math.max(Number(days) || 7, 1), ANALYTICS_MAX_DAYS);
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const list = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    list.push(d.toISOString().slice(0, 10));
  }
  return list;
}

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
    let { id, name, description, permissions, canEdit, canDelete } = req.body;
    if (!id || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    id = String(id).trim();
    name = String(name).trim();

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
    let { name, description, permissions, canEdit, canDelete } = req.body;
    
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
    if (name) role.name = String(name).trim();
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
    let { username, password, role, name } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    username = String(username).trim();
    name = name ? String(name).trim() : username;

    const users = await fs.readJson(USERS_FILE);
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { username, password: hashedPassword, role, name };
    
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
    let { password, role, name } = req.body;
    
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
    if (name) user.name = String(name).trim();

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

// --- Analytics ---
export const trackAnalyticsEvent = async (req, res) => {
  try {
    const payload = req.body || {};
    const eventType = String(payload.eventType || '').trim() || 'page_view';
    const toolId = String(payload.toolId || '').trim().slice(0, 64);
    const route = String(payload.route || '').trim().slice(0, 128);
    const ts = payload.ts ? new Date(payload.ts).toISOString() : new Date().toISOString();
    const username = String(req.user?.username || '').trim();
    const role = String(req.user?.role || '').trim();

    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!toolId && !route) {
      return res.status(400).json({ error: 'Missing toolId or route' });
    }

    const events = await readJsonWithDefault(ANALYTICS_EVENTS_FILE, []);
    const list = Array.isArray(events) ? events : [];
    list.push({
      eventType,
      toolId,
      route,
      username,
      role,
      ts,
      day: toIsoDay(ts),
    });

    const trimmed = list.length > ANALYTICS_MAX_EVENTS ? list.slice(-ANALYTICS_MAX_EVENTS) : list;
    await fs.writeJson(ANALYTICS_EVENTS_FILE, trimmed, { spaces: 2 });
    res.json({ success: true });
  } catch (error) {
    console.error('Track analytics error:', error);
    res.status(500).json({ error: 'Failed to track analytics event' });
  }
};

export const getAnalyticsOverview = async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), ANALYTICS_MAX_DAYS);
    const dayList = getRecentIsoDays(days);
    const daySet = new Set(dayList);
    const today = dayList[dayList.length - 1];

    const raw = await readJsonWithDefault(ANALYTICS_EVENTS_FILE, []);
    const events = (Array.isArray(raw) ? raw : []).filter((it) => daySet.has(String(it?.day || toIsoDay(it?.ts))));

    const trendMap = new Map(dayList.map((d) => [d, { pv: 0, users: new Set() }]));
    const topMap = new Map();
    const totalUsers = new Set();
    const todayUsers = new Set();
    let totalPv = 0;
    let todayPv = 0;

    for (const it of events) {
      const day = String(it?.day || toIsoDay(it?.ts));
      if (!daySet.has(day)) continue;
      const username = String(it?.username || '').trim();
      const toolKey = String(it?.toolId || it?.route || 'unknown').trim() || 'unknown';

      const point = trendMap.get(day);
      if (point) {
        point.pv += 1;
        if (username) point.users.add(username);
      }
      totalPv += 1;
      if (username) totalUsers.add(username);

      if (day === today) {
        todayPv += 1;
        if (username) todayUsers.add(username);
      }

      topMap.set(toolKey, (topMap.get(toolKey) || 0) + 1);
    }

    const trend = dayList.map((day) => {
      const point = trendMap.get(day);
      return {
        day,
        pv: point?.pv || 0,
        uv: point?.users?.size || 0,
      };
    });

    const topTools = Array.from(topMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([toolId, count]) => ({
        toolId,
        count,
        ratio: totalPv > 0 ? Number(((count / totalPv) * 100).toFixed(1)) : 0,
      }));

    res.json({
      days,
      range: {
        start: dayList[0],
        end: dayList[dayList.length - 1],
      },
      totals: {
        pv: totalPv,
        uv: totalUsers.size,
        perUser: totalUsers.size > 0 ? Number((totalPv / totalUsers.size).toFixed(2)) : 0,
      },
      today: {
        day: today,
        pv: todayPv,
        uv: todayUsers.size,
      },
      trend,
      topTools,
    });
  } catch (error) {
    console.error('Get analytics overview error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
};
