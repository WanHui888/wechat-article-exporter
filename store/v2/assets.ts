import { base64ToBlob, blobToBase64, storeGet, storePost } from './client'

export interface Asset {
  url: string
  file: Blob
  fakeid: string
}

export async function updateAssetCache(asset: Asset): Promise<boolean> {
  const file = await blobToBase64(asset.file)
  await storePost('asset/put', { url: asset.url, fakeid: asset.fakeid, file })
  return true
}

export async function getAssetCache(url: string): Promise<Asset | undefined> {
  const result = await storeGet<{ url: string; fakeid: string; file: string } | null>('asset/get', { url })
  if (!result) return undefined
  return {
    url: result.url,
    fakeid: result.fakeid,
    file: base64ToBlob(result.file),
  }
}
