import { config as BLOG } from '@/lib/server/config'

import { idToUuid, getPageContentBlockIds, getTextContent } from 'notion-utils'
import dayjs from 'dayjs'
import api from '@/lib/server/notion-api'
import getAllPageIds from './getAllPageIds'
import getPageProperties from './getPageProperties'
import filterPublishedPosts from './filterPublishedPosts'

async function getPostSummaryFromContent (pageId, length) {
  const recordMap = await api.getPage(pageId, {
    fetchCollections: false,
    fetchMissingBlocks: false,
    signFileUrls: false,
    chunkLimit: 50
  })

  const contentBlockIds = getPageContentBlockIds(recordMap) || []
  const block = recordMap?.block || {}
  let summary = ''

  for (let i = 0; i < contentBlockIds.length; i++) {
    const blockId = contentBlockIds[i]
    const title = block?.[blockId]?.value?.properties?.title
    const text = getTextContent(title)
    if (text) {
      summary = `${summary} ${text}`
      summary = summary.replace(/\s+/g, ' ').trim()
      if (summary.length >= length) break
    }
  }

  return summary.slice(0, length).trim()
}

/**
 * @param {{ includePages: boolean }} - false: posts only / true: include pages
 */
export async function getAllPosts ({ includePages = false }) {
  const id = idToUuid(process.env.NOTION_PAGE_ID)

  const response = await api.getPage(id)

  const collectionValue = Object.values(response.collection || {})[0]?.value
  const collection = collectionValue?.value || collectionValue
  const collectionQuery = response.collection_query
  const block = response.block
  const schema = collection?.schema

  const blockValue = block[id]?.value
  const rawMetadata = blockValue?.value || blockValue

  if (!collection || !schema) {
    console.log(`pageId "${id}" has no collection or schema.`)
    return []
  }

  // Check Type
  if (
    rawMetadata?.type !== 'collection_view_page' &&
    rawMetadata?.type !== 'collection_view'
  ) {
    console.log(`pageId "${id}" is not a database. Type is: ${rawMetadata?.type}`)
    return []
  } else {
    // Construct Data
    const pageIds = getAllPageIds(collectionQuery)
    const data = []
    for (let i = 0; i < pageIds.length; i++) {
      const id = pageIds[i]
      const properties = (await getPageProperties(id, block, schema)) || null
      
      const pageBlockValue = block[id]?.value
      const pageBlock = pageBlockValue?.value || pageBlockValue

      // Add fullwidth to properties
      properties.fullWidth = pageBlock?.format?.page_full_width ?? false
      // Convert date (with timezone) to unix milliseconds timestamp
      properties.date = (
        properties.date?.start_date
          ? dayjs.tz(properties.date?.start_date)
          : dayjs(pageBlock?.created_time)
      ).valueOf()

      const summaryLength = BLOG.summaryLength || 200
      const summary = (properties.summary || '').trim()
      if (!summary) {
        properties.summary = await getPostSummaryFromContent(id, summaryLength)
      } else if (summary.length > summaryLength) {
        properties.summary = summary.slice(0, summaryLength).trim()
      } else {
        properties.summary = summary
      }

      data.push(properties)
    }

    // remove all the the items doesn't meet requirements
    const posts = filterPublishedPosts({ posts: data, includePages })

    // Sort by date
    if (BLOG.sortByDate) {
      posts.sort((a, b) => b.date - a.date)
    }
    return posts
  }
}
