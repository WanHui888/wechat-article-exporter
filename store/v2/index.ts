import { storePost } from './client'

export async function deleteAccountData(ids: string[]): Promise<void> {
  await storePost('delete-account', { ids })
}
