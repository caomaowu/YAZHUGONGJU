import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const SECRET_KEY = 'your-secret-key-change-in-production'; // TODO: Use env var

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Allow large payloads for base64 images

// Data file path
const DATA_FILE = path.join(__dirname, 'machines.json');
const LOCATIONS_FILE = path.join(__dirname, 'locations.json');
const MODELS_FILE = path.join(__dirname, 'machine_models.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const ROLES_FILE = path.join(__dirname, 'roles.json');

function nowIso() {
  return new Date().toISOString();
}

async function readJsonWithDefault(file, defaultValue) {
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

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeJsonSync(DATA_FILE, []);
}
if (!fs.existsSync(LOCATIONS_FILE)) {
  fs.writeJsonSync(LOCATIONS_FILE, ["一车间", "二车间", "新厂区"]);
}
// Ensure users file exists with default admin
if (!fs.existsSync(USERS_FILE)) {
  // admin / admin123
  const defaultAdmin = {
    username: 'admin',
    password: '$2b$10$xCogtsvQ99yOzOU.yg94remGkisbTCj4OcLhmr5RgBKmwfXpTLk4y',
    role: 'admin',
    name: 'Administrator'
  };
  fs.writeJsonSync(USERS_FILE, [defaultAdmin], { spaces: 2 });
}
// Ensure roles file exists with default roles
if (!fs.existsSync(ROLES_FILE)) {
  const defaultRoles = [
    { 
      id: "admin", 
      name: "管理员", 
      description: "系统超级管理员，拥有所有权限", 
      permissions: ["*"], 
      canEdit: true, 
      canDelete: true 
    },
    { 
      id: "engineer", 
      name: "工程师", 
      description: "可以管理设备和工艺", 
      permissions: ["dashboard", "machines", "templates", "settings"], 
      canEdit: true, 
      canDelete: false 
    },
    { 
      id: "operator", 
      name: "操作员", 
      description: "仅限使用计算工具", 
      permissions: ["pq2"], 
      canEdit: false, 
      canDelete: false 
    },
    { 
      id: "viewer", 
      name: "访客", 
      description: "只读查看", 
      permissions: ["dashboard", "machines", "pq2", "templates", "settings"], 
      canEdit: false, 
      canDelete: false 
    }
  ];
  fs.writeJsonSync(ROLES_FILE, defaultRoles, { spaces: 2 });
}

try {
  const roles = fs.readJsonSync(ROLES_FILE);
  if (Array.isArray(roles)) {
    const ensurePerm = (roleId, perm) => {
      const role = roles.find((r) => r && r.id === roleId);
      if (!role || !Array.isArray(role.permissions)) return;
      if (!role.permissions.includes(perm)) role.permissions.push(perm);
    };
    fs.writeJsonSync(ROLES_FILE, roles, { spaces: 2 });
  }
} catch {}

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.sendStatus(403);
    }
    next();
  };
};

// Routes

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const users = await fs.readJson(USERS_FILE);
    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { username: user.username, role: user.role, name: user.name },
      SECRET_KEY,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { username: user.username, role: user.role, name: user.name } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});





// Roles Management
app.get('/api/roles', authenticateToken, async (req, res) => {
  try {
    const roles = await fs.readJson(ROLES_FILE);
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

app.post('/api/roles', authenticateToken, requireRole(['admin']), async (req, res) => {
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
});

app.put('/api/roles/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions, canEdit, canDelete } = req.body;
    
    if (id === 'admin') {
      // Prevent modifying critical permissions of admin, but allow name/desc update if needed?
      // Better to lock admin permissions.
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
});

app.delete('/api/roles/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
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
});

// User Management (Admin only)
app.get('/api/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const users = await fs.readJson(USERS_FILE);
    // Return users without passwords
    const safeUsers = users.map(({ password, ...u }) => u);
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', authenticateToken, requireRole(['admin']), async (req, res) => {
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
});

app.put('/api/users/:username', authenticateToken, requireRole(['admin']), async (req, res) => {
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
});

app.delete('/api/users/:username', authenticateToken, requireRole(['admin']), async (req, res) => {
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
});

// Get all machines
app.get('/api/machines', async (req, res) => {
  try {
    const data = await fs.readJson(DATA_FILE);
    res.json(data);
  } catch (error) {
    console.error('Error reading machines:', error);
    res.status(500).json({ error: 'Failed to read machines data' });
  }
});

// Update all machines (overwrite)
app.post('/api/machines', async (req, res) => {
  try {
    const machines = req.body;
    await fs.writeJson(DATA_FILE, machines, { spaces: 2 });
    res.json({ success: true, message: 'Machines saved successfully' });
  } catch (error) {
    console.error('Error saving machines:', error);
    res.status(500).json({ error: 'Failed to save machines data' });
  }
});

// Get locations
app.get('/api/locations', async (req, res) => {
  try {
    const data = await fs.readJson(LOCATIONS_FILE);
    res.json(data);
  } catch (error) {
    console.error('Error reading locations:', error);
    // Return default if error or file missing
    res.json(["一车间", "二车间", "新厂区"]); 
  }
});

// Update locations
app.post('/api/locations', async (req, res) => {
  try {
    const locations = req.body;
    await fs.writeJson(LOCATIONS_FILE, locations, { spaces: 2 });
    res.json({ success: true, message: 'Locations saved successfully' });
  } catch (error) {
    console.error('Error saving locations:', error);
    res.status(500).json({ error: 'Failed to save locations data' });
  }
});

// Get machine models
app.get('/api/machine-models', async (req, res) => {
  try {
    const data = await fs.readJson(MODELS_FILE);
    res.json(data);
  } catch (error) {
    console.error('Error reading machine models:', error);
    res.status(500).json({ error: 'Failed to read machine models data' });
  }
});

// Serve static files from the React app
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // The "catchall" handler: for any request that doesn't
  // match one above, send back React's index.html file.
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Local API Server running at http://localhost:${PORT}`);
});
