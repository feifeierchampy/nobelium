import { config } from '@/lib/server/config'
import { getAllPosts, getAllTagsFromPosts } from '@/lib/notion'

function getSiteUrl () {
  return config.link.replace(/\/$/, '')
}

function escapeXml (value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildUrl (path = '') {
  const siteUrl = getSiteUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${siteUrl}${normalizedPath === '/' ? '' : normalizedPath}`
}

function getLastmod (date) {
  if (!date) return new Date().toISOString()
  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return new Date().toISOString()
  return parsedDate.toISOString()
}

function createUrlEntry ({ loc, lastmod, changefreq = 'weekly', priority = '0.7' }) {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>'
  ].join('\n')
}

function createSitemap (entries) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(createUrlEntry),
    '</urlset>'
  ].join('\n')
}

export async function getServerSideProps ({ res }) {
  const posts = await getAllPosts({ includePages: true })
  const publishedPosts = await getAllPosts({ includePages: false })
  const tags = getAllTagsFromPosts(publishedPosts)
  const totalPages = Math.ceil(publishedPosts.length / config.postsPerPage)
  const now = new Date().toISOString()

  const entries = [
    {
      loc: buildUrl('/'),
      lastmod: now,
      changefreq: 'daily',
      priority: '1.0'
    },
    {
      loc: buildUrl('/search'),
      lastmod: now,
      changefreq: 'weekly',
      priority: '0.5'
    },
    ...Array.from({ length: Math.max(totalPages - 1, 0) }, (_, i) => ({
      loc: buildUrl(`/page/${i + 2}`),
      lastmod: now,
      changefreq: 'daily',
      priority: '0.8'
    })),
    ...Object.keys(tags).map(tag => ({
      loc: buildUrl(`/tag/${encodeURIComponent(tag)}`),
      lastmod: now,
      changefreq: 'weekly',
      priority: '0.6'
    })),
    ...posts.map(post => ({
      loc: buildUrl(`/${post.slug}`),
      lastmod: getLastmod(post.date),
      changefreq: 'monthly',
      priority: '0.8'
    }))
  ]

  res.setHeader('Content-Type', 'text/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=86400')
  res.write(createSitemap(entries))
  res.end()

  return {
    props: {}
  }
}

export default function Sitemap () {
  return null
}
