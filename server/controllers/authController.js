import fs from 'fs-extra';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { USERS_FILE, SECRET_KEY } from '../config/index.js';

export const login = async (req, res) => {
  let { username, password } = req.body;
  try {
    username = String(username || '').trim();
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
};

export const me = (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json(req.user);
};
