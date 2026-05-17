import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const outputDir = join(process.cwd(), 'public', 'pollinations')

const assets = [
  {
    filename: 'hero-scene.png',
    prompt:
      'premium educational game hero scene, adorable purple mascot holding a giant pencil, glossy 3d toy-like render, high relief, character on the right side, empty breathing room on the left for interface overlays, harmonious lavender and lilac environment, soft floor shadow, cinematic depth, whimsical sparkles, no text, no frame, no border',
  },
  {
    filename: 'sidebar-mascot.png',
    prompt:
      'adorable purple mascot holding a giant pencil, full body, glossy 3d toy-like render, cute expressive eyes, premium children learning game art, centered composition, soft purple gradient background, subtle floor shadow, no text, no frame, no border',
  },
  {
    filename: 'airport-card.png',
    prompt:
      'stylized airport vocabulary illustration for a premium english learning game, toy-like 3d render, soft blue terminal shapes, runway marker, suitcase and travel objects, friendly rounded forms, high relief, harmonious pastel lighting, no text, no frame, no border',
  },
  {
    filename: 'grammar-card.png',
    prompt:
      'grammar lesson illustration for a premium english learning game, glossy 3d toy-like render, floating worksheet and chunky pencil, educational objects with depth and soft shadows, lilac pastel environment, high relief, no text, no frame, no border',
  },
  {
    filename: 'listening-card.png',
    prompt:
      'listening lesson illustration for a premium english learning game, glossy 3d toy-like render, oversized rounded headphones with sound waves, playful shapes, blue pastel environment, high relief, no text, no frame, no border',
  },
  {
    filename: 'mountain-card.png',
    prompt:
      'mountain vocabulary illustration for a premium english learning game, toy-like 3d render, colorful mountains and sunny sky, rounded playful landscape, high relief, soft pastel palette, no text, no frame, no border',
  },
  {
    filename: 'dog-card.png',
    prompt:
      'adorable cartoon puppy wearing oversized headphones, vibrant children game style, highly saturated colors, polished 3d illustration, isolated on soft blue background, no text',
  },
  {
    filename: 'storm-card.png',
    prompt:
      'weather storm illustration for a premium english learning game, glossy 3d toy-like render, rounded rain cloud with lightning and raindrops, high relief, soft purple and blue palette, no text, no frame, no border',
  },
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

await mkdir(outputDir, { recursive: true })

for (const asset of assets) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(asset.prompt)}`

  let response
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    response = await fetch(url)

    if (response.ok) {
      break
    }

    if (response.status === 402 || response.status === 429) {
      const backoffMs = attempt * 12000
      console.warn(`retrying ${asset.filename} after ${response.status} in ${backoffMs}ms`)
      await sleep(backoffMs)
      continue
    }

    throw new Error(`Failed to generate ${asset.filename}: ${response.status} ${response.statusText}.`)
  }

  if (!response?.ok) {
    throw new Error(`Failed to generate ${asset.filename}: ${response?.status} ${response?.statusText}.`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  await writeFile(join(outputDir, asset.filename), bytes)
  console.log(`saved ${asset.filename}`)
  await sleep(6000)
}
