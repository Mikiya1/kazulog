import { NextRequest, NextResponse } from 'next/server'

const API_ID = process.env.DMM_API_ID
const AFFILIATE_ID = process.env.DMM_AFFILIATE_ID
const SITE_AFFILIATE_ID = process.env.DMM_SITE_AFFILIATE_ID

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const keyword = searchParams.get('keyword') ?? ''
  const actress = searchParams.get('actress') ?? ''
  const actressId = searchParams.get('actress_id') ?? ''
  const genre = searchParams.get('genre') ?? ''
  const sort = searchParams.get('sort') ?? 'rank'
  const hits = searchParams.get('hits') ?? '10'
  const offset = searchParams.get('offset') ?? '1'

  const params = new URLSearchParams({
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

  if (keyword) params.set('keyword', keyword)
  if (actress) params.set('keyword', actress)
  if (actressId) {
    params.set('article', 'actress')
    params.set('article_id', actressId)
  }
  if (genre) params.set('genre', genre)

  const url = `https://api.dmm.com/affiliate/v3/ItemList?${params.toString()}`

  try {
    const res = await fetch(url)
    const data = await res.json()

    // affiliateURLをサイト用IDに差し替え
    if (data.result?.items) {
      data.result.items = data.result.items.map((item: { affiliateURL?: string }) => ({
        ...item,
        affiliateURL: item.affiliateURL?.replace(AFFILIATE_ID!, SITE_AFFILIATE_ID!) ?? item.affiliateURL,
      }))
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'API fetch failed' }, { status: 500 })
  }
}
