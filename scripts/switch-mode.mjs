import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const mode = process.argv[2]
const envMap = {
  dev: '.env.dev',
  prod: '.env.prod',
}

if (!mode || !envMap[mode]) {
  console.error('Usage: node scripts/switch-mode.mjs <dev|prod>')
  process.exit(1)
}

const sourcePath = path.join(rootDir, envMap[mode])
const targetPath = path.join(rootDir, '.env.local')

if (!fs.existsSync(sourcePath)) {
  console.error(`Mode file not found: ${sourcePath}`)
  process.exit(1)
}

const content = fs.readFileSync(sourcePath, 'utf8')
fs.writeFileSync(targetPath, content, 'utf8')

console.log(`Switched mode to "${mode}" -> .env.local`)
