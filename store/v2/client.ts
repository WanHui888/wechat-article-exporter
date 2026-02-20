export async function storePost<T = unknown>(path: string, body: unknown): Promise<T> {
  return $fetch<T>(`/api/store/${path}`, {
    method: 'POST',
    body,
  })
}

export async function storeGet<T = unknown>(
  path: string,
  params?: Record<string, string | number | boolean>,
): Promise<T> {
  return $fetch<T>(`/api/store/${path}`, { params })
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function base64ToBlob(base64: string, mimeType = 'application/octet-stream'): Blob {
  const bytes = atob(base64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i)
  }
  return new Blob([arr], { type: mimeType })
}
