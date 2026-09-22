import { execSync } from 'node:child_process'

// Remove do banco local o que a suíte criou (ver apps/api/prisma/e2e-cleanup.ts).
export default async function globalTeardown() {
  if (process.env.E2E_BASE_URL) return
  execSync('pnpm --filter api e2e:cleanup', { cwd: '../..', stdio: 'inherit' })
}
