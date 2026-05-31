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
            if (map.block[key]?.value && !map.block[key].value.id) {
              map.block[key].value.id = key
            }
          }
        }
        if (map.collection) {
          for (const key in map.collection) {
            if (map.collection[key]?.value?.value) {
              map.collection[key].value = map.collection[key].value.value
            }
            if (map.collection[key]?.value && !map.collection[key].value.id) {
              map.collection[key].value.id = key
            }
          }
        }
      }

      if (res.block) {
        for (const key in res.block) {
          if (res.block[key]?.value?.value) {
            res.block[key].value = res.block[key].value.value
          }
          if (res.block[key]?.value && !res.block[key].value.id) {
            res.block[key].value.id = key
          }
        }
      }
      if (res.collection) {
        for (const key in res.collection) {
          if (res.collection[key]?.value?.value) {
            res.collection[key].value = res.collection[key].value.value
          }
          if (res.collection[key]?.value && !res.collection[key].value.id) {
            res.collection[key].value.id = key
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
    const retryableStatusCodes = new Set([429, 500, 502, 503, 504])
    let currentArgs = args

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return normalize(await super.fetch(currentArgs))
      } catch (err) {
        const code = err?.code
        const statusCode = err?.response?.statusCode
        const isRetryable = retryableCodes.has(code) || retryableStatusCodes.has(statusCode)
        if (!isRetryable) throw err

        const hasLookup = !!currentArgs?.gotOptions?.lookup
        if (code === 'ECONNREFUSED' && !hasLookup) {
          currentArgs = { ...args, gotOptions: { ...(args?.gotOptions || {}), lookup } }
        }

        if (attempt === 2) throw err
        const retryAfter = Number(err?.response?.headers?.['retry-after'])
        const delay = Number.isFinite(retryAfter)
          ? retryAfter * 1000
          : 1000 * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
}

const client = new ExtendedNotionAPI({ authToken: NOTION_ACCESS_TOKEN })

export default client
