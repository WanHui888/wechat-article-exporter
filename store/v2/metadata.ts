import type { ArticleMetadata } from '~/utils/download/types'
import { storeGet, storePost } from './client'

export type Metadata = ArticleMetadata & {
  fakeid: string
  url: string
  title: string
}

export async function updateMetadataCache(metadata: Metadata): Promise<boolean> {
  await storePost('metadata/put', metadata)
  return true
}

export async function getMetadataCache(url: string): Promise<Metadata | undefined> {
  const result = await storeGet<Metadata | null>('metadata/get', { url })
  return result ?? undefined
}
