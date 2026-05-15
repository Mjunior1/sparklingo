import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const outputDir = join(process.cwd(), 'public', 'pollinations')
const apiKey = process.env.POLLINATIONS_KEY

const assets = [
  {
    filename: 'hero-mascot.png',
    prompt:
      'cute purple mascot holding a giant pencil, 3d cartoon character, vibrant educational game art, glossy materials, big expressive eyes, dynamic pose, soft studio lighting, white lavender background, no text',
  },
  {
    filename: 'listening-dog.png',
    prompt:
      'adorable cartoon puppy wearing oversized headphones, vibrant children game style, highly saturated colors, polished 3d illustration, isolated on soft blue background, no text',
  },
  {
    filename: 'mountain-hiker.png',
    prompt:
      'friendly cartoon hiker in front of colorful mountains, premium educational app illustration, playful 3d render look, vivid lighting, isolated composition, no text',
  },
]

await mkdir(outputDir, { recursive: true })

for (const asset of assets) {
  const url = new URL(`https://gen.pollinations.ai/image/${encodeURIComponent(asset.prompt)}`)

  if (apiKey) {
    url.searchParams.set('key', apiKey)
  }

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(
      `Failed to generate ${asset.filename}: ${response.status} ${response.statusText}. ` +
        'If Pollinations is requiring auth for your session, set POLLINATIONS_KEY with a publishable key.',
    )
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  await writeFile(join(outputDir, asset.filename), bytes)
  console.log(`saved ${asset.filename}`)
}
