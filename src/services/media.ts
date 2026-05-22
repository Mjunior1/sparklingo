import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { requireFirebase } from '../lib/firebase'
import type { LessonTone } from './catalog'

export type GeneratedMediaAsset = {
  id: string
  label: string
  path: string
  tone: LessonTone
}

type GenerateMediaOptions = {
  prompt: string
  scope: 'lesson' | 'quiz' | 'question'
  style: 'cartoon' | '3D' | 'pastel' | 'kawaii' | 'cinematic'
  label: string
  tone: LessonTone
  count?: number
}

const MAX_ATTEMPTS = 3

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'asset'

const buildPollinationsUrl = (prompt: string, seed: string) => {
  const params = new URLSearchParams({
    width: '1024',
    height: '1024',
    nologo: 'true',
    seed,
  })

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`
}

const extractExtension = (contentType: string | null) => {
  if (!contentType) return 'jpg'
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  return 'jpg'
}

const mapStorageError = (error: unknown) => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes('unauthorized') || message.includes('storage/unauthorized')) {
      return new Error('Firebase Storage recusou o upload. Publique as storage rules e confirme que o usuário autenticado pode gravar em generated-media/.')
    }
    if (message.includes('bucket')) {
      return new Error('O bucket do Firebase Storage não está configurado corretamente nas variáveis VITE_FIREBASE_* ou no projeto Firebase.')
    }
    return error
  }

  return new Error('Não foi possível gerar a mídia com IA.')
}

export const generateMediaToStorage = async ({
  prompt,
  scope,
  style,
  label,
  tone,
  count = 3,
}: GenerateMediaOptions): Promise<GeneratedMediaAsset[]> => {
  const { storage } = requireFirebase()
  const baseSlug = slugify(label)
  const total = Math.max(1, Math.min(3, count))
  const results: GeneratedMediaAsset[] = []
  const errors: Error[] = []

  for (let index = 0; index < total; index += 1) {
    const seed = `${Date.now()}-${index}-${Math.round(Math.random() * 9999)}`
    const pollinationsUrl = buildPollinationsUrl(`${prompt}. visual style ${style}.`, seed)

    let uploaded = false

    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !uploaded; attempt += 1) {
      try {
        const response = await fetch(pollinationsUrl, {
          method: 'GET',
          headers: {
            Accept: 'image/*',
          },
        })

        if (!response.ok) {
          throw new Error(`Pollinations respondeu ${response.status}.`)
        }

        const blob = await response.blob()
        const extension = extractExtension(response.headers.get('content-type'))
        const storageRef = ref(storage, `generated-media/${scope}/${baseSlug}-${seed}.${extension}`)

        await uploadBytes(storageRef, blob, {
          contentType: blob.type || `image/${extension}`,
          customMetadata: {
            label,
            prompt,
            scope,
            style,
            tone,
          },
        })

        const downloadUrl = await getDownloadURL(storageRef)

        results.push({
          id: `${scope}-${seed}`,
          label: `${label} ${index + 1}`,
          path: downloadUrl,
          tone,
        })

        uploaded = true
      } catch (error) {
        errors.push(mapStorageError(error))
        if (attempt === MAX_ATTEMPTS) {
          uploaded = false
        }
      }
    }
  }

  if (results.length) return results

  throw errors[0] ?? new Error('Falha ao gerar uma variação do Pollinations.')
}
