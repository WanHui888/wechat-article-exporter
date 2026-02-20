import { base64ToBlob, blobToBase64, storeGet, storePost } from './client'

export interface DebugAsset {
  type: string
  url: string
  file: Blob
  title: string
  fakeid: string
}

export async function updateDebugCache(debug: DebugAsset): Promise<boolean> {
  const file = await blobToBase64(debug.file)
  await storePost('debug/put', { url: debug.url, fakeid: debug.fakeid, type: debug.type, title: debug.title, file })
  return true
}

export async function getDebugCache(url: string): Promise<DebugAsset | undefined> {
  const result = await storeGet<{ url: string; fakeid: string; type: string; title: string; file: string } | null>('debug/get', { url })
  if (!result) return undefined
  return {
    url: result.url,
    fakeid: result.fakeid,
    type: result.type,
    title: result.title,
    file: base64ToBlob(result.file),
  }
}

export async function getDebugInfo(): Promise<DebugAsset[]> {
  const results = await storeGet<{ url: string; fakeid: string; type: string; title: string; file: string }[]>('debug/all')
  return results.map(r => ({
    url: r.url,
    fakeid: r.fakeid,
    type: r.type,
    title: r.title,
    file: base64ToBlob(r.file),
  }))
}
