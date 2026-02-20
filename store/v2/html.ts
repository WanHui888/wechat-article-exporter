import { base64ToBlob, blobToBase64, storeGet, storePost } from './client'

export interface HtmlAsset {
  fakeid: string
  url: string
  file: Blob
  title: string
  commentID: string | null
}

export async function updateHtmlCache(html: HtmlAsset): Promise<boolean> {
  const file = await blobToBase64(html.file)
  await storePost('html/put', {
    url: html.url,
    fakeid: html.fakeid,
    title: html.title,
    commentID: html.commentID,
    file,
  })
  return true
}

export async function getHtmlCache(url: string): Promise<HtmlAsset | undefined> {
  const result = await storeGet<{ url: string; fakeid: string; title: string; commentID: string | null; file: string } | null>('html/get', { url })
  if (!result) return undefined
  return {
    url: result.url,
    fakeid: result.fakeid,
    title: result.title,
    commentID: result.commentID,
    file: base64ToBlob(result.file, 'text/html'),
  }
}
