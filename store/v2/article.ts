import type { AppMsgExWithFakeID, PublishPage } from '~/types/types'
import type { MpAccount } from './info'
import { storeGet, storePost } from './client'

export type ArticleAsset = AppMsgExWithFakeID

export async function updateArticleCache(account: MpAccount, publish_page: PublishPage): Promise<void> {
  await storePost('article/update-cache', { account, publish_page })
}

export async function hitCache(fakeid: string, create_time: number): Promise<boolean> {
  const result = await storeGet<{ hit: boolean }>('article/hit-cache', { fakeid, create_time })
  return result.hit
}

export async function getArticleCache(fakeid: string, create_time: number): Promise<AppMsgExWithFakeID[]> {
  return storeGet<AppMsgExWithFakeID[]>('article/cache', { fakeid, create_time })
}

export async function getArticleByLink(url: string): Promise<AppMsgExWithFakeID> {
  const article = await storeGet<AppMsgExWithFakeID | null>('article/by-link', { link: url })
  if (!article) {
    throw new Error(`Article(${url}) does not exist`)
  }
  return article
}

export async function getSingleArticleByLink(url: string): Promise<AppMsgExWithFakeID> {
  const article = await storeGet<AppMsgExWithFakeID | null>('article/by-link-single', { link: url })
  if (!article) {
    throw new Error(`Article(${url}) does not exist`)
  }
  return article
}

export async function articleDeleted(url: string, is_deleted = true): Promise<void> {
  await storePost('article/mark-deleted', { url, is_deleted })
}

export async function updateArticleStatus(url: string, status: string): Promise<void> {
  await storePost('article/update-status', { url, status })
}

export async function updateArticleFakeid(url: string, fakeid: string): Promise<void> {
  await storePost('article/update-fakeid', { url, fakeid })
}

export async function putArticle(key: string, article: AppMsgExWithFakeID): Promise<void> {
  await storePost('article/put', { key, article })
}

export async function deleteArticle(key: string): Promise<void> {
  await storePost('article/delete', { key })
}
