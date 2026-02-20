import { storeGet, storePost } from './client'

export interface CommentAsset {
  fakeid: string
  url: string
  title: string
  data: any
}

export async function updateCommentCache(comment: CommentAsset): Promise<boolean> {
  await storePost('comment/put', comment)
  return true
}

export async function getCommentCache(url: string): Promise<CommentAsset | undefined> {
  const result = await storeGet<CommentAsset | null>('comment/get', { url })
  return result ?? undefined
}
