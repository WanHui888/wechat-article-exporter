import { ref, reactive } from 'vue'
import { getAlbum } from '~/apis'

export interface AlbumArticle {
  title: string
  url: string
  cover_img_1_1: string
  create_time: string
  pos_num?: number
  msgid: string
  itemidx: string
  key: string
}

export interface AlbumBaseInfo {
  title: string
  article_count: number
  description: string
  nickname: string
  brand_icon: string
}

export function useAlbum() {
  const albumArticles = reactive<AlbumArticle[]>([])
  const baseInfo = ref<AlbumBaseInfo | null>(null)
  const loading = ref(false)
  const articleLoading = ref(false)
  const noMoreData = ref(false)
  const isReverse = ref(true)

  function reset() {
    albumArticles.splice(0, albumArticles.length)
    baseInfo.value = null
    noMoreData.value = false
  }

  async function fetchFirstPage(fakeid: string, albumId: string) {
    loading.value = true
    reset()

    try {
      const data = await getAlbum({
        fakeid,
        album_id: albumId,
        is_reverse: isReverse.value ? '1' : '0',
      })

      if (data.base_resp?.ret === 0) {
        baseInfo.value = data.getalbum_resp.base_info
        const list = data.getalbum_resp.article_list
        if (Array.isArray(list)) {
          albumArticles.push(...list)
        } else if (list) {
          albumArticles.push(list)
        }
        noMoreData.value = data.getalbum_resp.continue_flag === '0'
      }
    } finally {
      loading.value = false
    }
  }

  async function loadMore(fakeid: string, albumId: string) {
    if (noMoreData.value || articleLoading.value) return

    articleLoading.value = true
    const lastArticle = albumArticles[albumArticles.length - 1]

    try {
      const data = await getAlbum({
        fakeid,
        album_id: albumId,
        is_reverse: isReverse.value ? '1' : '0',
        begin_msgid: lastArticle?.msgid,
        begin_itemidx: lastArticle?.itemidx,
      })

      if (data.base_resp?.ret === 0) {
        const list = data.getalbum_resp.article_list
        if (Array.isArray(list)) {
          albumArticles.push(...list)
        } else if (list) {
          albumArticles.push(list)
        }
        noMoreData.value = data.getalbum_resp.continue_flag === '0'
      }
    } finally {
      articleLoading.value = false
    }
  }

  async function fetchAll(fakeid: string, albumId: string) {
    while (!noMoreData.value) {
      await loadMore(fakeid, albumId)
      await new Promise(r => setTimeout(r, 500))
    }
  }

  function toggleReverse() {
    isReverse.value = !isReverse.value
  }

  return {
    albumArticles,
    baseInfo,
    loading,
    articleLoading,
    noMoreData,
    isReverse,
    reset,
    fetchFirstPage,
    loadMore,
    fetchAll,
    toggleReverse,
  }
}
