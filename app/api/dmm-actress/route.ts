import { NextRequest, NextResponse } from 'next/server'

const API_ID = process.env.DMM_API_ID
const AFFILIATE_ID = process.env.DMM_AFFILIATE_ID

const FEATURED_NAMES = [
  '河北彩伽', '逢沢みゆ', '北岡果林', '瀬戸環奈', '乙アリス',
  '美園和花', '松本いちか', '神木麗', '花守夏歩', '北野未奈',
  '七沢みあ', 'MINAMO', '波多野結衣', '九井スナオ', '青空ひかり',
  '羽月乃蒼', '柏木こなつ', '森沢かな', '天馬ゆい', '皆月ひかる',
  '月野かすみ', '宮島めい', '神宮寺ナオ', '葛飾めい',
  '美咲かんな', '松井日奈子', '楪カレン', '愛オりあ', '尾崎えりか', '倉木しおり',
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') ?? 'normal'

  if (mode === 'featured') {
    // 並列リクエストで高速化
    const results = await Promise.all(
      FEATURED_NAMES.map(async (name) => {
        const params = new URLSearchParams({
          api_id: API_ID!,
          affiliate_id: AFFILIATE_ID!,
          keyword: name,
          hits: '1',
          output: 'json',
        })
        try {
          const res = await fetch(`https://api.dmm.com/affiliate/v3/ActressSearch?${params.toString()}`)
          const data = await res.json()
          const a = data.result?.actress?.[0]
          if (a && (a.imageURL?.large || a.imageURL?.small)) {
            return {
              id: a.id,
              name: a.name,
              imageUrl: (a.imageURL?.large ?? a.imageURL?.small ?? '').replace('http://', 'https://'),
              tags: [
                a.cup ? `${a.cup}カップ` : null,
                a.height ? `${a.height}cm` : null,
              ].filter(Boolean) as string[],
            }
          }
        } catch {
          console.error(`Failed to fetch: ${name}`)
        }
        return null
      })
    )
    const actresses = results.filter(Boolean)
    return NextResponse.json({ result: { actress: actresses } })
  }

  // 通常検索モード
  const keyword = searchParams.get('keyword') ?? ''
  const actressId = searchParams.get('actress_id') ?? ''
  const hits = searchParams.get('hits') ?? '20'
  const offset = searchParams.get('offset') ?? '1'
  const sort = searchParams.get('sort') ?? 'name'

  const params = new URLSearchParams({
    api_id: API_ID!,
    affiliate_id: AFFILIATE_ID!,
    hits,
    offset,
    sort,
    output: 'json',
  })

  if (keyword) params.set('keyword', keyword)
  if (actressId) params.set('actress_id', actressId)
  if (searchParams.get('initial')) params.set('initial', searchParams.get('initial')!)

  const url = `https://api.dmm.com/affiliate/v3/ActressSearch?${params.toString()}`

  try {
    const res = await fetch(url)
    const data = await res.json()
    const actresses = (data.result?.actress ?? []).map((a: any) => ({
      id: a.id,
      name: a.name,
      imageUrl: (a.imageURL?.large ?? a.imageURL?.small ?? '').replace('http://', 'https://'),
      tags: [
        a.cup ? `${a.cup}カップ` : null,
        a.height ? `${a.height}cm` : null,
      ].filter(Boolean) as string[],
    }))
    return NextResponse.json({
      result: {
        actress: actresses,
        total_count: data.result?.total_count ?? 0,
      }
    })
  } catch {
    return NextResponse.json({ error: 'API fetch failed' }, { status: 500 })
  }
}