import { storeGet, storePost } from './client'

export interface MpAccount {
  fakeid: string
  completed: boolean
  count: number
  articles: number
  nickname?: string
  round_head_img?: string
  total_count: number
  create_time?: number
  update_time?: number
  last_update_time?: number
}

export async function updateInfoCache(mpAccount: MpAccount): Promise<boolean> {
  await storePost('info/update-cache', mpAccount)
  return true
}

export async function updateLastUpdateTime(fakeid: string): Promise<boolean> {
  await storePost('info/update-last-update-time', { fakeid })
  return true
}

export async function getInfoCache(fakeid: string): Promise<MpAccount | undefined> {
  const result = await storeGet<MpAccount | null>('info/get', { fakeid })
  return result ?? undefined
}

export async function getAllInfo(): Promise<MpAccount[]> {
  return storeGet<MpAccount[]>('info/all')
}

export async function getAccountNameByFakeid(fakeid: string): Promise<string | null> {
  const account = await getInfoCache(fakeid)
  if (!account) return null
  return account.nickname || null
}

export async function importMpAccounts(mpAccounts: MpAccount[]): Promise<void> {
  await storePost('info/import', { accounts: mpAccounts })
}
