import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { requireFirebase } from '../lib/firebase'
import type { LessonTone } from './catalog'

export type GeneratedMediaAsset = {
  id: string
  label: string
  path: string
  tone: LessonTone
  scope: 'lesson' | 'quiz' | 'question'
  style: 'cartoon' | '3D' | 'pastel' | 'kawaii' | 'cinematic'
  targetId: string
  prompt: string
  source: 'pollinations'
}

type GenerateMediaOptions = {
  prompt: string
  scope: 'lesson' | 'quiz' | 'question'
  targetId: string
  style: 'cartoon' | '3D' | 'pastel' | 'kawaii' | 'cinematic'
  label: string
  tone: LessonTone
  count?: number
}

type ApplyUsage = {
  scope: 'lesson' | 'quiz' | 'question'
  targetId: string
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

const mapMediaError = (error: unknown) => {
  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('pollinations')) return error
    return new Error(error.message)
  }

  return new Error('Não foi possível gerar a mídia com IA.')
}

export const getGeneratedMediaCatalog = async (): Promise<GeneratedMediaAsset[]> => {
  const { db } = requireFirebase()
  const snapshot = await getDocs(query(collection(db, 'generatedMedia'), orderBy('createdAt', 'desc'), limit(36)))

  return snapshot.docs.map((item) => {
    const data = item.data() as Record<string, unknown>
    const tone: LessonTone = data.tone === 'sky' || data.tone === 'mint' || data.tone === 'violet' ? data.tone : 'violet'
    const scope: GeneratedMediaAsset['scope'] = data.scope === 'lesson' || data.scope === 'quiz' || data.scope === 'question' ? data.scope : 'question'
    const style: GeneratedMediaAsset['style'] =
      data.style === 'cartoon' || data.style === '3D' || data.style === 'pastel' || data.style === 'kawaii' || data.style === 'cinematic'
        ? data.style
        : '3D'
    const source: GeneratedMediaAsset['source'] = 'pollinations'

    return {
      id: item.id,
      label: typeof data.label === 'string' ? data.label : item.id,
      path: typeof data.imageUrl === 'string' ? data.imageUrl : '',
      tone,
      scope,
      style,
      targetId: typeof data.targetId === 'string' ? data.targetId : '',
      prompt: typeof data.prompt === 'string' ? data.prompt : '',
      source,
    }
  }).filter((asset) => asset.path)
}

export const generateMediaToFirestore = async ({
  prompt,
  scope,
  targetId,
  style,
  label,
  tone,
  count = 3,
}: GenerateMediaOptions): Promise<GeneratedMediaAsset[]> => {
  const { db, auth } = requireFirebase()
  const total = Math.max(1, Math.min(3, count))
  const baseSlug = slugify(label)
  const results: GeneratedMediaAsset[] = []
  const errors: Error[] = []

  for (let index = 0; index < total; index += 1) {
    const seed = `${Date.now()}-${index}-${Math.round(Math.random() * 9999)}`
    const fullPrompt = `${prompt}. visual style ${style}.`
    const imageUrl = buildPollinationsUrl(fullPrompt, seed)
    let ready = false

    for (let attempt = 1; attempt <= MAX_ATTEMPTS && !ready; attempt += 1) {
      try {
        const response = await fetch(imageUrl, {
          method: 'GET',
          headers: { Accept: 'image/*' },
        })

        if (!response.ok) {
          throw new Error(`Pollinations respondeu ${response.status}.`)
        }

        const docId = `GM-${Date.now()}-${index + 1}`
        const asset: GeneratedMediaAsset = {
          id: docId,
          label: `${label} ${index + 1}`,
          path: imageUrl,
          tone,
          scope,
          style,
          targetId,
          prompt: fullPrompt,
          source: 'pollinations',
        }

        await setDoc(doc(db, 'generatedMedia', docId), {
          label: asset.label,
          imageUrl: asset.path,
          tone: asset.tone,
          scope: asset.scope,
          style: asset.style,
          targetId: asset.targetId,
          prompt: asset.prompt,
          source: asset.source,
          seed,
          slug: baseSlug,
          createdBy: auth.currentUser?.uid ?? null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true })

        results.push(asset)
        ready = true
      } catch (error) {
        errors.push(mapMediaError(error))
      }
    }
  }

  if (results.length) return results

  throw errors[0] ?? new Error('Falha ao carregar uma variação do Pollinations.')
}

export const markGeneratedMediaApplied = async (assetId: string, appliedTo: ApplyUsage) => {
  const { db, auth } = requireFirebase()
  await updateDoc(doc(db, 'generatedMedia', assetId), {
    appliedTo,
    appliedBy: auth.currentUser?.uid ?? null,
    appliedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}
