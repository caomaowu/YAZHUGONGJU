import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

import { corsMiddleware } from './middleware/cors.js';
import { NODE_ENV, PORT, SECRET_KEY, CORS_ORIGIN } from './config/index.js';
import { initializeData } from './utils/init.js';
import { nowIso } from './utils/helpers.js';
import { bootstrapLibraryIndexing } from './services/libraryIndexService.js';

import authRoutes from './routes/authRoutes.js';
import dataRoutes from './routes/dataRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import fileRoutes from './routes/fileRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

if (!SECRET_KEY) {
  console.error('Missing required env var: JWT_SECRET');
  process.exit(1);
}

if (NODE_ENV === 'production' && !CORS_ORIGIN.trim()) {
  console.error('Missing required env var in production: CORS_ORIGIN');
  process.exit(1);
}

// Middleware
app.use(corsMiddleware);
app.use(bodyParser.json({ limit: '50mb' })); // Allow large payloads for base64 images

// Initialize Data
initializeData();
void bootstrapLibraryIndexing().catch((error) => {
  console.error('Library indexing bootstrap failed:', error);
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    env: NODE_ENV,
    time: nowIso()
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api', dataRoutes); // /api/roles, /api/users, /api/machines, etc.
app.use('/api', aiRoutes);   // /api/bailian/..., /api/ai/...
app.use('/api', fileRoutes); // /api/library/...

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
  console.log(`API Server running in ${NODE_ENV} at http://localhost:${PORT}`);
});
