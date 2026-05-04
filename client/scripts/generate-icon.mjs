/**
 * Generates resources/icon.ico from resources/icon.svg using sharp.
 * Run once: npm run generate-icon
 */
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svg = readFileSync(join(__dirname, '../resources/icon.svg'))

const SIZES = [16, 24, 32, 48, 64, 128, 256]

async function main() {
  const pngs = await Promise.all(
    SIZES.map(s => sharp(svg).resize(s, s).png().toBuffer())
  )

  // Assemble PNG-inside-ICO (Vista+ format)
  const count = SIZES.length
  let offset = 6 + count * 16

  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(count, 4)

  const dirs = pngs.map((png, i) => {
    const s = SIZES[i]
    const entry = Buffer.alloc(16)
    entry.writeUInt8(s >= 256 ? 0 : s, 0)
    entry.writeUInt8(s >= 256 ? 0 : s, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })

  writeFileSync(
    join(__dirname, '../resources/icon.ico'),
    Buffer.concat([header, ...dirs, ...pngs])
  )
  console.log('✓ resources/icon.ico generated at sizes:', SIZES.join(', '))
}

main().catch(err => { console.error(err); process.exit(1) })
