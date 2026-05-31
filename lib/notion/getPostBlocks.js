import api from '@/lib/server/notion-api'

const postBlocksCache = new Map()

export async function getPostBlocks (id) {
  if (!id) return null
  if (!postBlocksCache.has(id)) {
    postBlocksCache.set(id, api.getPage(id))
  }
  return postBlocksCache.get(id)
}
