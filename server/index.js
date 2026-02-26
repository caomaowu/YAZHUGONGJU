import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { createRequire } from 'module';
import fetch from 'node-fetch'; // Need node-fetch for file upload if environment is Node < 18 or specific needs

const require = createRequire(import.meta.url);
const BailianSDK = require('@alicloud/bailian20231229');
// Handle CJS export structure
const Client = BailianSDK.default || BailianSDK;
const { ApplyFileUploadLeaseRequest, AddFileRequest, ListFileRequest, CompletionRequest, RetrieveRequest } = BailianSDK;

const OpenApiClient = require('@alicloud/openapi-client');
const Config = OpenApiClient.Config || OpenApiClient.default?.Config;

const TeaUtil = require('@alicloud/tea-util');
const RuntimeOptions = TeaUtil.RuntimeOptions || TeaUtil.default?.RuntimeOptions;

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
const CHATS_FILE = path.join(__dirname, 'chats.json');
const BAILIAN_CONFIG_FILE = path.join(__dirname, 'bailian_config.json');

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
// Ensure chats file exists
if (!fs.existsSync(CHATS_FILE)) {
  fs.writeJsonSync(CHATS_FILE, [], { spaces: 2 });
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

// AI Proxy
app.post('/api/ai/proxy', async (req, res) => {
  try {
    const { apiKey, baseUrl, model, messages, temperature } = req.body;

    if (!apiKey || !baseUrl || !messages) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await client.chat.completions.create({
      model,
      messages,
      temperature: temperature || 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('AI Proxy Error:', error);
    // If headers already sent (streaming started), we can't send JSON error
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: error.message || 'AI Proxy Error' });
    }
  }
});

// Chat History Persistence
app.get('/api/ai/chats', async (req, res) => {
  try {
    const chats = await readJsonWithDefault(CHATS_FILE, []);
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

app.post('/api/ai/chats', async (req, res) => {
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
});

app.delete('/api/ai/chats/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const chats = await readJsonWithDefault(CHATS_FILE, []);
    const newChats = chats.filter(c => c.id !== id);
    
    await fs.writeJson(CHATS_FILE, newChats, { spaces: 2 });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

// Clear all chats
app.delete('/api/ai/chats', async (req, res) => {
  try {
    await fs.writeJson(CHATS_FILE, [], { spaces: 2 });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear chats' });
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

// --- Aliyun Bailian Integration ---

const getBailianConfig = async () => {
  const config = await readJsonWithDefault(BAILIAN_CONFIG_FILE, {
    accessKeyId: '',
    accessKeySecret: '',
    workspaceId: '',
    appId: '', // Default App ID
    apiKey: '', // Default API Key
    knowledgeBaseId: ''
  });

  const decode = (str) => {
    if (!str || typeof str !== 'string') return str;
    
    const trimmed = str.trim();
    if (trimmed.startsWith('ENC_')) {
      try {
        const payload = trimmed.slice(4);
        const decoded = Buffer.from(payload, 'base64').toString('utf-8');
        
        // Smart Detection:
        // 1. If decoded value looks like a valid AccessKey (starts with LTAI or STS), use it.
        if (decoded.startsWith('LTAI') || decoded.startsWith('STS')) {
            return decoded;
        }
        
        // 2. If payload (original string without prefix) starts with LTAI, 
        // it means user added ENC_ prefix but didn't base64 encode it.
        if (payload.startsWith('LTAI') || payload.startsWith('STS')) {
            return payload;
        }

        return decoded;
      } catch (e) {
        console.warn('Failed to decode config value:', e);
        return str;
      }
    }
    return str;
  };

  return {
    ...config,
    accessKeyId: decode(config.accessKeyId),
    accessKeySecret: decode(config.accessKeySecret),
    apiKey: decode(config.apiKey)
  };
};

const maskSensitive = (str, visibleChars = 8) => {
    if (!str || str.length <= visibleChars) return str;
    return str.slice(0, visibleChars) + '******';
};

const isMasked = (str) => {
    return str && str.includes('******');
};

const createBailianClient = async () => {
  const config = await getBailianConfig();
  if (!config.accessKeyId || !config.accessKeySecret) {
    throw new Error('Missing Bailian credentials');
  }
  const clientConfig = new Config({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    endpoint: 'bailian.cn-beijing.aliyuncs.com'
  });
  return new Client(clientConfig);
};

// Get Config
app.get('/api/bailian/config', async (req, res) => {
  try {
    const config = await getBailianConfig();
    // Hide secret and mask IDs
    const safeConfig = { 
        ...config, 
        accessKeyId: maskSensitive(config.accessKeyId),
        workspaceId: maskSensitive(config.workspaceId),
        appId: maskSensitive(config.appId),
        knowledgeBaseId: maskSensitive(config.knowledgeBaseId),
        accessKeySecret: config.accessKeySecret ? '******' : '',
        apiKey: config.apiKey ? '******' : '' 
    };
    res.json(safeConfig);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get config' });
  }
});

// Update Config
app.post('/api/bailian/config', async (req, res) => {
  try {
    const { accessKeyId, accessKeySecret, workspaceId, appId, apiKey, knowledgeBaseId } = req.body;
    const currentConfig = await getBailianConfig();
    
    const newConfig = { ...currentConfig };

    // Update fields only if they are not masked
    if (accessKeyId && !isMasked(accessKeyId)) newConfig.accessKeyId = accessKeyId;
    if (workspaceId && !isMasked(workspaceId)) newConfig.workspaceId = workspaceId;
    if (appId && !isMasked(appId)) newConfig.appId = appId;
    if (knowledgeBaseId && !isMasked(knowledgeBaseId)) newConfig.knowledgeBaseId = knowledgeBaseId;
    
    // Only update secret if provided and not masked
    if (accessKeySecret && accessKeySecret !== '******') {
      newConfig.accessKeySecret = accessKeySecret;
    }
    
    // Only update apiKey if provided and not masked
    if (apiKey && apiKey !== '******') {
      newConfig.apiKey = apiKey;
    }

    await fs.writeJson(BAILIAN_CONFIG_FILE, newConfig, { spaces: 2 });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// List Files
app.get('/api/bailian/files', async (req, res) => {
    try {
        const config = await getBailianConfig();
        if (!config.workspaceId) {
             return res.json([]); // Return empty if no workspace configured
        }
        
        const client = await createBailianClient();
        // const { ListFileRequest } = await import('@alicloud/bailian20231229');
        
        const request = new ListFileRequest({
            categoryId: 'default',
            limit: 20,
            offset: 0
        });
        
        const response = await client.listFile(config.workspaceId, request);
        
        if (!response.body.success) {
            throw new Error(response.body.message || 'Failed to list files');
        }
        
        res.json(response.body.data.fileList || []);
    } catch (error) {
        console.error('Bailian List Files Error:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

// Upload Document (Step 1: Get Lease & Upload & Add)
app.post('/api/bailian/documents/upload', async (req, res) => {
  try {
    const { fileName, fileContentBase64, categoryId } = req.body; // fileContentBase64: base64 string
    if (!fileName || !fileContentBase64) {
      return res.status(400).json({ error: 'Missing file data' });
    }

    const config = await getBailianConfig();
    if (!config.workspaceId) return res.status(400).json({ error: 'Missing Workspace ID' });

    const client = await createBailianClient();
    const buffer = Buffer.from(fileContentBase64, 'base64');
    
    // 1. Apply Lease
    // MD5 calc
    const crypto = await import('crypto');
    const md5 = crypto.createHash('md5').update(buffer).digest('hex');
    
    const leaseRequest = new ApplyFileUploadLeaseRequest({
      fileName,
      md5,
      sizeInBytes: buffer.length.toString(),
    });

    const leaseResponse = await client.applyFileUploadLease(categoryId || 'default', config.workspaceId, leaseRequest);
    const leaseData = leaseResponse.body;
    
    if (!leaseData.param) {
      throw new Error('Failed to get upload parameters');
    }

    // 2. Upload to OSS
    // Headers need to be constructed from leaseData.param.headers
    const headers = {};
    // headers is object
    // leaseData.param.headers is map? or object? SDK returns object usually.
    // Let's assume object.
    
    // The SDK documentation or example implies standard HTTP PUT usually.
    // Wait, the example link says: use requests.put(url, data=content, headers=headers)
    
    const uploadUrl = leaseData.param.url;
    const uploadHeaders = leaseData.param.headers; // This is map<string, any>

    // node-fetch
    const fetchHeaders = {};
    if (uploadHeaders) {
        // Need to iterate if it's not a plain object
        Object.keys(uploadHeaders).forEach(key => {
            fetchHeaders[key] = uploadHeaders[key];
        });
    }
    fetchHeaders['Content-Type'] = ''; // Ensure content type is handled if needed, usually determined by OSS

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: fetchHeaders,
      body: buffer
    });

    if (!uploadRes.ok) {
       const text = await uploadRes.text();
       throw new Error(`OSS Upload failed: ${uploadRes.status} ${text}`);
    }

    // 3. Add File to Knowledge Base
    // Note: Use 'AddFile' but we need to create Index first? 
    // Wait, Bailian 'AddFile' adds to Data Center. 
    // To make it searchable, we need to add it to an Index (Knowledge Base).
    // The previous implementation 'AddFile' only adds to Data Center category.
    // User needs to manually add to knowledge base in console or we use CreateIndex/SubmitIndexJob.
    // But 'Retrieve' API works on Knowledge Base Index ID, not App ID.
    
    // Let's keep it simple: Just upload for now. 
    // If we want RAG, we need Index ID.
    
    const addFileRequest = new AddFileRequest({
      leaseId: leaseData.data.fileUploadLeaseId,
      parser: 'DAS', // Default parsing
      categoryId: categoryId || 'default',
    });

    const addFileResponse = await client.addFile(config.workspaceId, addFileRequest);

    res.json({ 
      success: true, 
      fileId: addFileResponse.body.data.fileId,
      message: 'File uploaded. Please add it to your Knowledge Base Index in Bailian Console.'
    });

  } catch (error) {
    console.error('Bailian Upload Error:', error);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

// Chat with Bailian App
app.post('/api/bailian/chat', async (req, res) => {
  try {
    const { messages, appId } = req.body; // messages: [{role, content}]
    const config = await getBailianConfig();
    const targetAppId = appId || config.appId;

    if (!targetAppId) {
      return res.status(400).json({ error: 'App ID is not configured' });
    }
    
    // Use OpenAI compatible client for Bailian App (DashScope)
    // If user wants to use 3rd party model, we need to retrieve knowledge first, then call 3rd party.
    // BUT Bailian App API encapsulates RAG.
    
    // If user wants custom model + Bailian Knowledge Base:
    // 1. Retrieve knowledge from Bailian (Need Index ID)
    // 2. Construct prompt with knowledge
    // 3. Call 3rd party model (OpenAI/DeepSeek)
    
    // However, user provided App ID. Bailian App IS the model + knowledge.
    // If user says "I don't want Bailian Model", they mean they want to use their OWN model (e.g. DeepSeek) but with Bailian's Knowledge Base.
    
    // Let's support a "Hybrid RAG" mode.
    // We need "Index ID" (Knowledge Base ID) instead of "App ID" for retrieval.
    // But currently UI only asks for App ID.
    // Bailian Retrieve API needs IndexId.
    
    // Hack: If appId starts with 'idx-', treat it as Index ID for Retrieval?
    // Or add a new field in config?
    // Let's assume the user configures the Knowledge Base ID in 'appId' field if they want to use external model?
    // No, that's confusing.
    
    // Better: Add 'knowledgeBaseId' to config.
    // But for now, let's assume if user is using "Knowledge Base Mode" in UI, and we have a flag 'useExternalModel' (passed from client?), we do retrieval.
    
    // Client sends: { messages, useExternalModel: true, externalModelConfig: { ... } }
    // But currently client sends { messages, appId }.
    
    // Let's just use the DashScope API if it's a Bailian App ID.
    // If user wants to use own model, they should not use this route? 
    // OR, we modify this route to support retrieval.
    
    // Let's try to interpret the request.
    // If the user wants to use their own model, they are likely calling /api/ai/proxy but with RAG enabled?
    // The frontend calls /api/bailian/chat when RAG is enabled.
    
    // Let's change /api/bailian/chat to support "Retrieve Only" or "Retrieve + External Generation".
    // But we need Knowledge Base ID.
    
    // Let's look at Bailian Retrieve API.
    // It requires IndexId.
    
    // If user insists on using their own model, we must use Retrieve API.
    // We need to ask user for Knowledge Base ID (Index ID).
    // App ID is for Bailian App (which includes Model).
    
    // Let's add knowledgeBaseId to config.
    // For now, let's check if we can retrieve using App ID? No.
    
    // Let's assume for this turn, we stick to Bailian App (which uses Qwen).
    // If user wants "Third Party Model", we need to implement RAG manually:
    // 1. Search Knowledge Base
    // 2. Call Third Party
    
    // User said: "I cannot use my own configured third party model? Must I use Aliyun's?"
    // Answer: Yes, currently this route uses Aliyun's App.
    // To support user's model, we need to change architecture.
    
    // Plan:
    // 1. Add `knowledgeBaseId` to Bailian Config.
    // 2. In /api/bailian/chat:
    //    If `knowledgeBaseId` is present:
    //       a. Call Bailian Retrieve API to get chunks.
    //       b. Construct prompt: "Context: \n ... \n Question: ..."
    //       c. Call User's Configured Provider (DeepSeek/OpenAI) via the same logic as /api/ai/proxy.
    //    Else:
    //       Call Bailian App (existing logic).

    const { knowledgeBaseId, provider } = req.body; // provider config passed from frontend?
    // We need to read provider config from request or utilize existing settings.
    // Frontend `useAIChat` has settings. It should pass the provider config if we want to use it.
    
    // Let's check if we can get knowledgeBaseId from config.
    const kbId = config.knowledgeBaseId;
    
    if (kbId && req.body.useExternalModel) {
        // --- Hybrid RAG Mode ---
        
        // 1. Retrieve
        // const { RetrieveRequest } = await import('@alicloud/bailian20231229');
        const client = await createBailianClient();
        
        const query = messages[messages.length - 1].content;
        
        const retrieveReq = new RetrieveRequest({
            indexId: kbId,
            query: query,
            limit: 5, // Top 5 chunks
        });
        
        let context = "";
        try {
            console.log(`[RAG] Retrieving from Index ID: ${kbId} for query: ${query}`);
            const retrieveResp = await client.retrieve(config.workspaceId, retrieveReq);
            console.log('[RAG] Retrieve Response:', JSON.stringify(retrieveResp.body, null, 2));
            
            if (retrieveResp.body.success && retrieveResp.body.data && retrieveResp.body.data.nodes) {
                context = retrieveResp.body.data.nodes.map(n => {
                    let text = n.text;
                    // Check if there are images in the node metadata or content?
                    // Bailian API might return images differently. 
                    // Usually images are not directly in 'text' unless it's a markdown link.
                    // But if the parser extracted images, they might be in a separate field or embedded.
                    // Let's check if 'n' has image info. 
                    // If not available in this SDK response structure, we can only rely on text.
                    // However, if the text contains image references like [image](url), they will be passed.
                    
                    // If the user wants images, the document must be parsed with image support.
                    // And the retrieval result must contain image URLs.
                    
                    // Let's log the node structure to debug image availability
                    // console.log('Node:', JSON.stringify(n, null, 2));
                    
                    return text;
                }).join("\n\n");
                
                // Add instructions to include images if they exist in context
                if (context.includes('http') && (context.includes('.png') || context.includes('.jpg') || context.includes('.jpeg'))) {
                     context += "\n\n[System Note: The context above contains image URLs. Please display them in your response using Markdown image syntax: ![description](url)]";
                }
                
                console.log(`[RAG] Retrieved ${retrieveResp.body.data.nodes.length} chunks. Context length: ${context.length}`);
            } else {
                console.warn('[RAG] No nodes found or request failed');
            }
        } catch (e) {
            console.error("Retrieval failed", e);
            if (e.code === 'InvalidAccessKeyId.NotFound') {
                 console.error("CRITICAL: AccessKey ID is invalid. It should start with 'LTAI'. User provided:", config.accessKeyId.slice(0, 4) + '...');
                 context = `[System Error: Knowledge Retrieval Failed. Cause: Invalid AccessKey ID. Please check your Bailian Config. AccessKey ID should start with 'LTAI'.]\n\n`;
            } else if (e.code === 'Index.NoWorkspacePermissions' || e.statusCode === 403) {
                 console.error("CRITICAL: Permission Denied. The RAM user does not have permission for this workspace.");
                 context = `[System Error: Knowledge Retrieval Failed. Cause: Permission Denied (403). The RAM user (AccessKey) is not a member of the Workspace or lacks permission. Please go to Bailian Console -> Workspace Management and add this user as a member.]\n\n`;
            } else {
                 context = `[System Error: Knowledge Retrieval Failed. Cause: ${e.message || 'Unknown Error'}]\n\n`;
            }
        }
        
        // 2. Construct System Prompt
        const systemPrompt = `You are a helpful assistant. Use the following context to answer the user's question.
        
Context:
${context}

If the answer is not in the context, say so, but try to be helpful.`;

        // 3. Call External Model (Reuse Proxy Logic)
        const providerConfig = req.body.providerConfig; // { apiKey, baseUrl, model, ... }
        if (!providerConfig) {
             throw new Error("External provider config missing");
        }
        
        const openai = new OpenAI({
            apiKey: providerConfig.apiKey,
            baseURL: providerConfig.baseUrl,
        });
        
        const newMessages = [
            { role: 'system', content: systemPrompt },
            ...messages
        ];
        
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const stream = await openai.chat.completions.create({
            model: providerConfig.model,
            messages: newMessages,
            temperature: providerConfig.temperature || 0.7,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
        }
        res.write('data: [DONE]\n\n');
        res.end();
        return;
    }

    // --- Original Bailian App Mode ---
    
    // Check if API Key is configured
    if (!config.apiKey) {
         return res.status(400).json({ error: 'API Key is not configured. Please set API Key in Bailian settings.' });
    }

    // Use OpenAI compatible client for Bailian App (DashScope)
    // Endpoint: https://dashscope.aliyuncs.com/compatible-mode/v1
    
    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await client.chat.completions.create({
      model: targetAppId,
      messages: messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Bailian Chat Error:', error);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: error.message });
    }
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
