import { storeGet, storePost } from './client'

export interface ResourceMapAsset {
  fakeid: string
  url: string
  resources: string[]
}

export async function updateResourceMapCache(resourceMap: ResourceMapAsset): Promise<boolean> {
  await storePost('resource-map/put', resourceMap)
  return true
}

export async function getResourceMapCache(url: string): Promise<ResourceMapAsset | undefined> {
  const result = await storeGet<ResourceMapAsset | null>('resource-map/get', { url })
  return result ?? undefined
}
