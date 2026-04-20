import { NextRequest, NextResponse } from 'next/server'

const API_ID = process.env.DMM_API_ID
const AFFILIATE_ID = process.env.DMM_AFFILIATE_ID

// 人気女優の静的データ（APIに依存しない）
const FEATURED_ACTRESSES = [
  { id: '1044864', name: '河北彩伽', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/kawakita_saika.jpg' },
  { id: '1088602', name: '逢沢みゆ', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/aizawa_miyu.jpg' },
  { id: '1090453', name: '北岡果林', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/kitaoka_karin.jpg' },
  { id: '1099472', name: '瀬戸環奈', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/seto_kanna.jpg' },
  { id: '1096329', name: '乙アリス', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/otsu_arisu.jpg' },
  { id: '1093490', name: '美園和花', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/misono_waka.jpg' },
  { id: '1085615', name: '松本いちか', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/matumoto_itika.jpg' },
  { id: '1086599', name: '神木麗', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/kamiki_rei.jpg' },
  { id: '1092609', name: '花守夏歩', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/hanamori_naho.jpg' },
  { id: '1089591', name: '北野未奈', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/kitano_mina.jpg' },
  { id: '1091699', name: '七沢みあ', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/nanasawa_mia.jpg' },
  { id: '1079980', name: 'MINAMO', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/minamo.jpg' },
  { id: '1033976', name: '波多野結衣', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/hatano_yui.jpg' },
  { id: '1094738', name: '九井スナオ', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/kokonoi_sunao.jpg' },
  { id: '1087271', name: '青空ひかり', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/aozora_hikari.jpg' },
  { id: '1095398', name: '羽月乃蒼', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/hazuki_noa.jpg' },
  { id: '1092345', name: '柏木こなつ', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/kasiwagi_konatsu.jpg' },
  { id: '1074485', name: '森沢かな', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/morisawa_kana.jpg' },
  { id: '1093304', name: '天馬ゆい', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/tenma_yui.jpg' },
  { id: '1090371', name: '皆月ひかる', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/minazuki_hikaru.jpg' },
  { id: '1088475', name: '月野かすみ', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/tukino_kasumi.jpg' },
  { id: '1091234', name: '宮島めい', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/miyazima_mei.jpg' },
  { id: '1085302', name: '神宮寺ナオ', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/jingujitemple_nao.jpg' },
  { id: '1094521', name: '美咲かんな', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/misaki_kanna.jpg' },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('mode') ?? 'normal'

  if (mode === 'featured') {
    // 静的データを返す（APIリクエスト不要）
    return NextResponse.json({ result: { actress: FEATURED_ACTRESSES } })
  }

  // 通常検索モード
  const keyword = searchParams.get('keyword') ?? ''
  const actressId = searchParams.get('actress_id') ?? ''
  const hits = searchParams.get('hits') ?? '20'
  const offset = searchParams.get('offset') ?? '1'
  const sort = searchParams.get('sort') ?? 'name'
  const initial = searchParams.get('initial') ?? ''

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
  if (initial) params.set('initial', initial)

  const url = `https://api.dmm.com/affiliate/v3/ActressSearch?${params.toString()}`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    })
    const data = await res.json()
    const actresses = (data.result?.actress ?? []).map((a: any) => ({
      id: String(a.id),
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
