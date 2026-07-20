import { readdir, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

async function filesUnder(directory) {
  const entries = await readdir(directory)
  const files = []
  for (const entry of entries) {
    const path = resolve(directory, entry)
    if ((await stat(path)).isDirectory()) files.push(...(await filesUnder(path)))
    else files.push(path)
  }
  return files
}

const files = await filesUnder(resolve('dist'))
const secretPrefix = ['sk', 'proj'].join('-')
const forbidden = [new RegExp(`${secretPrefix}-[A-Za-z0-9_-]+`), /OPENAI_API_KEY\s*=/, /location-history\.json/i]
for (const file of files) {
  const text = await readFile(file, 'utf8').catch(() => '')
  for (const pattern of forbidden) {
    if (pattern.test(text)) throw new Error(`Forbidden private value matched ${pattern} in ${file}`)
  }
}
console.log(`Privacy bundle check passed across ${files.length} production files.`)
