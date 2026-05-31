import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

async function loadSummaryModule () {
  const source = await readFile(new URL('../lib/notion/summary.js', import.meta.url), 'utf8')
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
}

test('buildSummaryFromBlocks skips the page title block', async () => {
  const { buildSummaryFromBlocks } = await loadSummaryModule()
  const blockMap = {
    block: {
      page: {
        value: {
          type: 'page',
          properties: { title: [['文章标题']] }
        }
      },
      first: {
        value: {
          type: 'text',
          properties: { title: [['正文第一段']] }
        }
      },
      second: {
        value: {
          type: 'text',
          properties: { title: [['正文第二段']] }
        }
      }
    }
  }

  const summary = buildSummaryFromBlocks({
    blockMap,
    contentBlockIds: ['page', 'first', 'second'],
    length: 50,
    getTextContent: title => title?.map(item => item[0]).join('') || ''
  })

  assert.equal(summary, '正文第一段 正文第二段')
})

test('buildSummaryFromBlocks truncates after skipping title block', async () => {
  const { buildSummaryFromBlocks } = await loadSummaryModule()
  const blockMap = {
    block: {
      page: {
        value: {
          type: 'collection_view_page',
          properties: { title: [['文章标题']] }
        }
      },
      first: {
        value: {
          type: 'text',
          properties: { title: [['这是正文开头']] }
        }
      },
      second: {
        value: {
          type: 'text',
          properties: { title: [['后续内容']] }
        }
      }
    }
  }

  const summary = buildSummaryFromBlocks({
    blockMap,
    contentBlockIds: ['page', 'first', 'second'],
    length: 8,
    getTextContent: title => title?.map(item => item[0]).join('') || ''
  })

  assert.equal(summary, '这是正文开...')
})
