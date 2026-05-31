import { config } from '@/lib/server/config'

export async function getServerSideProps ({ res }) {
  const siteUrl = config.link.replace(/\/$/, '')
  const robots = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`
  ].join('\n')

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.write(robots)
  res.end()

  return {
    props: {}
  }
}

export default function Robots () {
  return null
}
