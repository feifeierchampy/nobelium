import { NotionAPI } from 'notion-client'

const { NOTION_ACCESS_TOKEN } = process.env

class ExtendedNotionAPI extends NotionAPI {
  async getPage(pageId, options) {
    const res = await super.getPage(pageId, options)
    
    // Normalize nested block values (fix for Notion API change)
    if (res && res.block) {
      for (const key in res.block) {
        if (res.block[key]?.value?.value) {
          res.block[key].value = res.block[key].value.value
        }
      }
    }
    
    return res
  }
}

const client = new ExtendedNotionAPI({ authToken: NOTION_ACCESS_TOKEN })

export default client
