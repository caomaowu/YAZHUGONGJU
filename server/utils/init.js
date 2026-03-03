import fs from 'fs-extra';
import { 
  DATA_FILE, 
  LOCATIONS_FILE, 
  USERS_FILE, 
  ROLES_FILE, 
  CHATS_FILE, 
  ANALYTICS_EVENTS_FILE,
  LIBRARY_FILE, 
  LIBRARY_UPLOAD_DIR,
  LIBRARY_INDEX_DIR
} from '../config/index.js';

export const initializeData = async () => {
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

  // Ensure analytics events file exists
  if (!fs.existsSync(ANALYTICS_EVENTS_FILE)) {
    fs.writeJsonSync(ANALYTICS_EVENTS_FILE, [], { spaces: 2 });
  }
  
  // Ensure library file exists
  if (!fs.existsSync(LIBRARY_FILE)) {
    fs.writeJsonSync(LIBRARY_FILE, [], { spaces: 2 });
  }
  
  // Ensure library upload dir exists
  fs.ensureDirSync(LIBRARY_UPLOAD_DIR);
  fs.ensureDirSync(LIBRARY_INDEX_DIR);

  // Migration: Ensure library search metadata exists
  try {
    const items = fs.readJsonSync(LIBRARY_FILE);
    if (Array.isArray(items)) {
      let changed = false;
      const next = items.map((it) => {
        if (!it || typeof it !== 'object') return it;
        const currentStatus = String(it.searchStatus || '').trim();
        const status = ['pending', 'processing', 'ready', 'failed'].includes(currentStatus)
          ? (currentStatus === 'processing' ? 'pending' : currentStatus)
          : 'pending';
        const normalized = {
          ...it,
          searchStatus: status,
          searchUpdatedAt: it.searchUpdatedAt || it.uploadedAt || new Date().toISOString(),
          searchError: typeof it.searchError === 'string' ? it.searchError : '',
          searchVersion: Number(it.searchVersion) > 0 ? Number(it.searchVersion) : 1,
        };
        if (
          normalized.searchStatus !== it.searchStatus ||
          normalized.searchUpdatedAt !== it.searchUpdatedAt ||
          normalized.searchError !== it.searchError ||
          normalized.searchVersion !== it.searchVersion
        ) {
          changed = true;
        }
        return normalized;
      });
      if (changed) {
        fs.writeJsonSync(LIBRARY_FILE, next, { spaces: 2 });
      }
    }
  } catch {}

  // Migration: Ensure permissions
  try {
    const roles = fs.readJsonSync(ROLES_FILE);
    if (Array.isArray(roles)) {
      const ensurePerm = (roleId, perm) => {
        const role = roles.find((r) => r && r.id === roleId);
        if (!role || !Array.isArray(role.permissions)) return;
        if (!role.permissions.includes(perm)) role.permissions.push(perm);
      };
      ensurePerm('engineer', 'knowledge-base');
      ensurePerm('viewer', 'knowledge-base');
      fs.writeJsonSync(ROLES_FILE, roles, { spaces: 2 });
    }
  } catch {}
};
