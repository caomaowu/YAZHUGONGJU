import jwt from 'jsonwebtoken';
import fs from 'fs-extra';
import { SECRET_KEY, ROLES_FILE } from '../config/index.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.sendStatus(403);
    }
    next();
  };
};

export const requireCapability = (capability) => {
  return async (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.sendStatus(403);
    }

    // Always allow admin
    if (req.user.role === 'admin') {
      return next();
    }

    try {
      const roles = await fs.readJson(ROLES_FILE);
      const userRole = roles.find(r => r.id === req.user.role);

      if (!userRole) {
        return res.sendStatus(403);
      }

      // Check capabilities
      if (capability === 'edit' && userRole.canEdit) return next();
      if (capability === 'delete' && userRole.canDelete) return next();

      // Also check specific permissions list
      if (userRole.permissions && (userRole.permissions.includes('*') || userRole.permissions.includes(capability))) {
        return next();
      }

      return res.sendStatus(403);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.sendStatus(500);
    }
  };
};
