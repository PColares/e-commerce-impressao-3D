import { execSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export const ADMIN_FILE = 'test-results/.e2e-admin.json'
export const E2E_PASSWORD = 'senha12345'
const API = 'http://localhost:3333/api'

// Um admin por execução da suíte. Promover um admin por teste chamava o pnpm
// várias vezes em paralelo, e no Windows isso falhava de vez em quando.
export default async function globalSetup() {
  if (process.env.E2E_BASE_URL) return

  const email = `admin-${Date.now()}@e2e.com`
  const response = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: E2E_PASSWORD, name: 'Admin E2E' }),
  })
  if (!response.ok) throw new Error(`global-setup: cadastro do admin falhou (${response.status})`)

  // O e-mail é gerado aqui mesmo, então montar a linha de comando é seguro.
  execSync(`pnpm --filter api admin:promote ${email}`, { cwd: '../..', stdio: 'pipe' })

  mkdirSync(dirname(ADMIN_FILE), { recursive: true })
  writeFileSync(ADMIN_FILE, JSON.stringify({ email }))
}
