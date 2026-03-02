import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const envLocalPath = path.join(rootDir, '.env.local')

if (!fs.existsSync(envLocalPath)) {
  console.error('Missing .env.local. Run "npm run mode:dev" or "npm run mode:prod" first.')
  process.exit(1)
}

const envContent = fs.readFileSync(envLocalPath, 'utf8')
const modeLine = envContent
  .split(/\r?\n/)
  .map((line) => line.trim())
  .find((line) => line.startsWith('APP_MODE='))

const mode = modeLine ? modeLine.split('=')[1]?.trim() : ''
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const command = mode === 'prod' ? ['run', 'build-and-start'] : ['run', 'dev']

const child = spawn(npmCmd, command, {
  cwd: rootDir,
  stdio: 'inherit',
  shell: false,
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
