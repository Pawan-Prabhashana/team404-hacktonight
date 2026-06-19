/**
 * scripts/hash-demo-passwords.ts
 *
 * Generates bcrypt hashes for Serandib Bank demo credentials and prints
 * SQL-safe INSERT statements for db/seed.sql.
 *
 * Run with:
 *   npx tsx scripts/hash-demo-passwords.ts
 *   bun scripts/hash-demo-passwords.ts
 *
 * IMPORTANT: Demo/local use only. Never use these in a production database.
 */
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

const demoUsers = [
  {
    email: 'customer@serandib.test',
    password: 'SerandibUser123',
    role: 'customer',
    fullName: 'Demo Customer'
  },
  {
    email: 'admin@serandib.test',
    password: 'SerandibAdmin123',
    role: 'admin',
    fullName: 'Platform Administrator'
  }
]

async function main() {
  console.log(
    'Generating bcrypt hashes (12 rounds) — this may take a moment...\n'
  )

  for (const user of demoUsers) {
    const hash = await bcrypt.hash(user.password, SALT_ROUNDS)
    console.log(`-- ${user.role}: ${user.email} / ${user.password}`)
    console.log(`-- Hash: ${hash}`)
    console.log()
  }

  console.log('Copy the hashes above into db/seed.sql and lib/platform-db.ts.')
  console.log('\nQuick SQL snippet:')
  for (const user of demoUsers) {
    const hash = await bcrypt.hash(user.password, SALT_ROUNDS)
    console.log(
      `  ('${user.email}', '${hash}', '${user.role}', '${user.fullName}'),`
    )
  }
}

main().catch(console.error)
