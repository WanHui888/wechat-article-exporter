export default defineEventHandler(async (event) => {
  const { q, limit = 20, offset = 0 } = getQuery(event) as any

  if (!q) {
    return { success: true, data: { hits: [], estimatedTotalHits: 0 } }
  }

  const config = useRuntimeConfig()
  const meiliHost = config.meiliHost || 'http://localhost:7700'
  const meiliKey = config.meiliKey || ''

  try {
    const response = await fetch(`${meiliHost}/indexes/articles/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(meiliKey ? { Authorization: `Bearer ${meiliKey}` } : {}),
      },
      body: JSON.stringify({
        q,
        limit: parseInt(limit),
        offset: parseInt(offset),
        attributesToHighlight: ['title', 'digest'],
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
      }),
    })

    if (!response.ok) {
      throw new Error(`MeiliSearch returned ${response.status}`)
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error: any) {
    console.error('[Search] MeiliSearch error:', error.message)
    return {
      success: false,
      data: { hits: [], estimatedTotalHits: 0 },
      error: 'Search service unavailable',
    }
  }
})
