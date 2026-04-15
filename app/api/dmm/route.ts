import { NextRequest, NextResponse } from 'next/server'

const API_ID = process.env.DMM_API_ID
const AFFILIATE_ID = process.env.DMM_AFFILIATE_ID

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const keyword = searchParams.get('keyword') ?? ''
  const actress = searchParams.get('actress') ?? ''
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

  const url = `https://api.dmm.com/affiliate/v3/ItemList?${params.toString()}`

  try {
    const res = await fetch(url)
    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'API fetch failed' }, { status: 500 })
  }
}