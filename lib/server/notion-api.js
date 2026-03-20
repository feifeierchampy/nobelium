import { NotionAPI } from 'notion-client'

const { NOTION_ACCESS_TOKEN } = process.env

class ExtendedNotionAPI extends NotionAPI {
  async fetch(args) {
    const res = await super.fetch(args)
    
    // Normalize nested block and collection values (fix for Notion API change)
    if (res) {
      if (res.recordMap) {
        // Handle syncRecordValues or other APIs that return recordMap
        const map = res.recordMap
        if (map.block) {
          for (const key in map.block) {
            if (map.block[key]?.value?.value) {
              map.block[key].value = map.block[key].value.value
            }
          }
        }
        if (map.collection) {
          for (const key in map.collection) {
            if (map.collection[key]?.value?.value) {
              map.collection[key].value = map.collection[key].value.value
            }
          }
        }
      }
      
      // Handle standard getPageRaw responses
      if (res.block) {
        for (const key in res.block) {
          if (res.block[key]?.value?.value) {
            res.block[key].value = res.block[key].value.value
          }
        }
      }
      if (res.collection) {
        for (const key in res.collection) {
          if (res.collection[key]?.value?.value) {
            res.collection[key].value = res.collection[key].value.value
          }
        }
      }
    }
    
    return res
  }
}

const client = new ExtendedNotionAPI({ authToken: NOTION_ACCESS_TOKEN })

export default client