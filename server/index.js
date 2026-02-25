import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Allow large payloads for base64 images

// Data file path
const DATA_FILE = path.join(__dirname, 'machines.json');
const LOCATIONS_FILE = path.join(__dirname, 'locations.json');
const MODELS_FILE = path.join(__dirname, 'machine_models.json');

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
  fs.writeJsonSync(DATA_FILE, []);
}
if (!fs.existsSync(LOCATIONS_FILE)) {
  fs.writeJsonSync(LOCATIONS_FILE, ["一车间", "二车间", "新厂区"]);
}

// Routes
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

app.listen(PORT, () => {
  console.log(`Local API Server running at http://localhost:${PORT}`);
});
