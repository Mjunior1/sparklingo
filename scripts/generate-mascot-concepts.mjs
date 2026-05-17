import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const outputDir = join(process.cwd(), 'public', 'mascot-concepts')
const apiKey = process.env.POLLINATIONS_KEY

const concepts = [
  {
    filename: 'concept-a-spark.png',
    prompt:
      'SparkLingo mascot concept A, round purple learning creature, premium 3d cartoon game mascot, giant yellow pencil companion, glossy toy-like materials, big expressive eyes, slightly mischievous smile, floating ear-like shapes, centered full body character, soft lavender studio background, vibrant but clean palette, no text, no extra characters',
  },
  {
    filename: 'concept-b-luna-fox.png',
    prompt:
      'SparkLingo mascot concept B, adorable fox learner adventurer, premium 3d cartoon educational game mascot, aviator goggles, soft scarf, tiny satchel, expressive big eyes, heroic playful pose, glossy materials, soft pastel lavender background, centered full body, no text, no extra characters',
  },
  {
    filename: 'concept-c-byte-bird.png',
    prompt:
      'SparkLingo mascot concept C, cute smart blue bird mascot for language app, oversized headphones, tiny backpack, premium 3d cartoon render, glossy materials, expressive face, energetic pose, soft lavender and sky background, centered full body character, no text, no extra characters',
  },
]

await mkdir(outputDir, { recursive: true })

for (const concept of concepts) {
  const url = new URL(`https://gen.pollinations.ai/image/${encodeURIComponent(concept.prompt)}`)

  if (apiKey) {
    url.searchParams.set('key', apiKey)
  }

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(
      `Failed to generate ${concept.filename}: ${response.status} ${response.statusText}. ` +
        'If Pollinations is requiring auth for your session, set POLLINATIONS_KEY with a publishable key.',
    )
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  await writeFile(join(outputDir, concept.filename), bytes)
  console.log(`saved ${concept.filename}`)
}
