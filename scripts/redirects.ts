import fs from 'fs-extra'

async function run() {
  const manual = await fs.readFile('_redirects', 'utf-8')
  await fs.writeFile('_dist_redirects', manual, 'utf-8')
}

run()
