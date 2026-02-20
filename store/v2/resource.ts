import { base64ToBlob, blobToBase64, storeGet, storePost } from './client'

export interface ResourceAsset {
  fakeid: string
  url: string
  file: Blob
}

export async function updateResourceCache(resource: ResourceAsset): Promise<boolean> {
  const file = await blobToBase64(resource.file)
  await storePost('resource/put', { url: resource.url, fakeid: resource.fakeid, file })
  return true
}

export async function getResourceCache(url: string): Promise<ResourceAsset | undefined> {
  const result = await storeGet<{ url: string; fakeid: string; file: string } | null>('resource/get', { url })
  if (!result) return undefined
  return {
    url: result.url,
    fakeid: result.fakeid,
    file: base64ToBlob(result.file),
  }
}
