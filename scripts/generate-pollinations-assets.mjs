import { spawnSync } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join, parse } from 'node:path'

const outputDir = join(process.cwd(), 'public', 'pollinations')
const styles = {
  heroScene:
    'premium educational game hero scene, glossy 3d toy-like render, high relief, cinematic depth, whimsical sparkles, harmonious lavender and lilac environment, no text, no frame, no border',
  isolatedMascot:
    'premium educational game art, glossy 3d toy render, isolated character only, centered composition, clean silhouette, no floor, no scene, no frame, no border, plain light background for easy background removal',
  supportBuddy:
    'premium educational game art, glossy 3d toy render, tiny helper character, clean silhouette, centered composition, no floor, no scene, no frame, no border, plain light background for easy background removal',
}

const assets = [
  {
    filename: 'hero-scene.png',
    prompt:
      `editorial hero illustration for a premium english learning game, adorable purple mascot holding a giant pencil, full scene already integrated, character on the right side, generous quiet space on the left for interface overlays, soft lavender floor, subtle spotlight, playful depth, dreamy sparkles, no separate frame inside the image, no text, no border, ${styles.heroScene}`,
  },
  {
    filename: 'hero-mascot.png',
    prompt:
      `adorable purple mascot holding a giant pencil, full body, joyful expression, slightly dynamic pose leaning forward, ${styles.isolatedMascot}`,
    removeBackground: true,
  },
  {
    filename: 'hero-sidekick.png',
    prompt:
      `small floating star companion in the same SparkLingo universe, soft purple and golden accents, expressive eyes, supportive sidekick energy, ${styles.supportBuddy}`,
    removeBackground: true,
  },
  {
    filename: 'sidebar-mascot.png',
    prompt:
      `adorable purple mascot holding a giant pencil, full body, cute expressive eyes, waving, ${styles.isolatedMascot}`,
    removeBackground: true,
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

  if (asset.removeBackground) {
    const { name } = parse(asset.filename)
    const tempInput = join(outputDir, `${name}.source.jpg`)
    const outputFile = join(outputDir, asset.filename)
    await writeFile(tempInput, bytes)

    const result = spawnSync(
      'python',
      ['scripts/remove_background.py', tempInput, outputFile],
      { cwd: process.cwd(), stdio: 'inherit' },
    )

    if (result.status !== 0) {
      throw new Error(`rembg failed for ${asset.filename}`)
    }

    await rm(tempInput, { force: true })
  }

  await sleep(6000)
}
