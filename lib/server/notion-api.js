import { NotionAPI } from 'notion-client'
import dns from 'dns'

const { NOTION_ACCESS_TOKEN } = process.env
const fallbackNotionIp = process.env.NOTION_FALLBACK_IP || '208.103.161.2'

class ExtendedNotionAPI extends NotionAPI {
  async fetch(args) {
    const normalize = (res) => {
      if (!res) return res

      if (res.recordMap) {
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

      return res
    }

    const lookup = (hostname, options, callback) => {
      if (hostname === 'www.notion.so') {
        if (typeof options === 'function') return options(null, fallbackNotionIp, 4)
        return callback(null, fallbackNotionIp, 4)
      }
      return dns.lookup(hostname, options, callback)
    }

    const retryableCodes = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN'])
    let currentArgs = args

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return normalize(await super.fetch(currentArgs))
      } catch (err) {
        const code = err?.code
        if (!retryableCodes.has(code)) throw err

        const hasLookup = !!currentArgs?.gotOptions?.lookup
        if (code === 'ECONNREFUSED' && !hasLookup) {
          currentArgs = { ...args, gotOptions: { ...(args?.gotOptions || {}), lookup } }
        }

        if (attempt === 2) throw err
        await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)))
      }
    }
  }
}

const client = new ExtendedNotionAPI({ authToken: NOTION_ACCESS_TOKEN })

export default client
