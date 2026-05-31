function normalizeSummaryText (text) {
  return (text || '').replace(/\s+/g, ' ').trim()
}

export function truncateWithEllipsis (text, length) {
  const normalized = normalizeSummaryText(text)
  if (!normalized) return ''
  if (normalized.length <= length) return normalized
  if (length <= 3) return normalized.slice(0, length).trim()
  return `${normalized.slice(0, length - 3).trimEnd()}...`
}

function shouldSkipSummaryBlock (block) {
  return block?.type === 'page' || block?.type === 'collection_view_page'
}

export function buildSummaryFromBlocks ({
  blockMap,
  contentBlockIds,
  length,
  getTextContent
}) {
  const block = blockMap?.block || {}
  let summary = ''
  let reachedLimit = false

  for (let i = 0; i < contentBlockIds.length; i++) {
    const blockId = contentBlockIds[i]
    const value = block?.[blockId]?.value
    if (shouldSkipSummaryBlock(value)) continue

    const title = value?.properties?.title
    const text = getTextContent(title)
    if (text) {
      summary = normalizeSummaryText(`${summary} ${text}`)
      if (summary.length >= length) {
        reachedLimit = i < contentBlockIds.length - 1 || summary.length > length
        break
      }
    }
  }

  if (reachedLimit) return truncateWithEllipsis(summary, length)
  return summary
}
