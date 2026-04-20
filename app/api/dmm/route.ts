import { NextRequest, NextResponse } from 'next/server'

const API_ID = process.env.DMM_API_ID
const AFFILIATE_ID = process.env.DMM_AFFILIATE_ID
const SITE_AFFILIATE_ID = process.env.DMM_SITE_AFFILIATE_ID

// メモリキャッシュ（Vercelのサーバーレス環境でも同一インスタンス内で有効）
const cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5分

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const keyword = searchParams.get('keyword') ?? ''
  const actress = searchParams.get('actress') ?? ''
  const actressId = searchParams.get('actress_id') ?? ''
  const genre = searchParams.get('genre') ?? ''
  const sort = searchParams.get('sort') ?? 'rank'
  const hits = searchParams.get('hits') ?? '10'
  const offset = searchParams.get('offset') ?? '1'

  const articles: { type: string; id: string }[] = []
  if (actressId) articles.push({ type: 'actress', id: actressId })
  if (genre) articles.push({ type: 'genre', id: genre })

  const articleStr = articles.map((a, i) =>
    `article[${i}]=${encodeURIComponent(a.type)}&article_id[${i}]=${encodeURIComponent(a.id)}`
  ).join('&')

  const baseParams = new URLSearchParams({
    api_id: API_ID!,
    affiliate_id: AFFILIATE_ID!,
    site: 'FANZA',
    service: 'digital',
    floor: 'videoa',
    hits,
    offset,
    sort,
    output: 'json',
  })

  if (keyword) baseParams.set('keyword', keyword)
  if (actress) baseParams.set('keyword', actress)

  const url = `https://api.dmm.com/affiliate/v3/ItemList?${baseParams.toString()}${articleStr ? '&' + articleStr : ''}`

  // キャッシュチェック
  const cacheKey = url
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { 'X-Cache': 'HIT' },
    })
  }

  try {
    const res = await fetch(url, {
      // Next.jsのfetchキャッシュも活用
      next: { revalidate: 300 }, // 5分
    })
    const data = await res.json()

    if (data.result?.items) {
      data.result.items = data.result.items.map((item: { affiliateURL?: string }) => ({
        ...item,
        affiliateURL: item.affiliateURL?.replace(AFFILIATE_ID!, SITE_AFFILIATE_ID!) ?? item.affiliateURL,
      }))
    }

    // キャッシュに保存
    cache.set(cacheKey, { data, ts: Date.now() })
    // キャッシュが大きくなりすぎたら古いものを削除
    if (cache.size > 500) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
      cache.delete(oldest[0])
    }

    return NextResponse.json(data, {
      headers: { 'X-Cache': 'MISS' },
    })
  } catch {
    return NextResponse.json({ error: 'API fetch failed' }, { status: 500 })
  }
}
