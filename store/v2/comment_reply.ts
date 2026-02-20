import { storeGet, storePost } from './client'

export interface CommentReplyAsset {
  fakeid: string
  url: string
  title: string
  data: any
  contentID: string
}

export async function updateCommentReplyCache(reply: CommentReplyAsset): Promise<boolean> {
  await storePost('comment-reply/put', reply)
  return true
}

export async function getCommentReplyCache(url: string, contentID: string): Promise<CommentReplyAsset | undefined> {
  const result = await storeGet<CommentReplyAsset | null>('comment-reply/get', { url, contentID })
  return result ?? undefined
}
