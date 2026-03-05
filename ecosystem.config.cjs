const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '.env.prod')
const parsedEnv = {}

if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index <= 0) continue
    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim()
    parsedEnv[key] = value
  }
}

module.exports = {
  apps: [
    {
      name: 'diecasting-app',
      script: 'server/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '500M',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        ...parsedEnv,
        NODE_ENV: 'production',
      },
    },
  ],
}
