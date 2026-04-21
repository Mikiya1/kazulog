import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DMM_API_ID = process.env.DMM_API_ID!
const DMM_AFFILIATE_ID = process.env.DMM_AFFILIATE_ID!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function fetchWorks(params: Record<string, string>) {
  const p = new URLSearchParams({
    api_id: DMM_API_ID,
    affiliate_id: DMM_AFFILIATE_ID,
    site: 'FANZA',
    service: 'digital',
    floor: 'videoa',
    output: 'json',
    ...params,
  })
  const res = await fetch(`https://api.dmm.com/affiliate/v3/ItemList?${p.toString()}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  })
  const data = await res.json()
  return data.result?.items ?? []
}

async function fetchActressByName(name: string) {
  const p = new URLSearchParams({
    api_id: DMM_API_ID,
    affiliate_id: DMM_AFFILIATE_ID,
    output: 'json',
    hits: '1',
    keyword: name,
  })
  const res = await fetch(`https://api.dmm.com/affiliate/v3/ActressSearch?${p.toString()}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  })
  const data = await res.json()
  return data.result?.actress?.[0] ?? null
}

async function saveWorks(items: any[]) {
  for (const item of items) {
    await supabase.from('works').upsert({
      id: item.content_id,
      title: item.title,
      affiliate_url: item.affiliateURL,
      image_large: item.imageURL?.large,
      image_small: item.imageURL?.small,
      volume: item.volume ? parseInt(item.volume) : null,
      date: item.date ? new Date(item.date) : null,
      price: item.prices?.price,
      updated_at: new Date(),
    }, { onConflict: 'id' })

    const genres = item.iteminfo?.genre ?? []
    for (const g of genres) {
      await supabase.from('genres').upsert({ id: String(g.id), name: g.name }, { onConflict: 'id' })
      await supabase.from('work_genres').upsert({ work_id: item.content_id, genre_id: String(g.id) }, { onConflict: 'work_id,genre_id' })
    }

    const actresses = item.iteminfo?.actress ?? []
    for (const a of actresses) {
      await supabase.from('actresses').upsert({
        id: String(a.id),
        name: a.name,
        ruby: a.ruby,
        updated_at: new Date(),
      }, { onConflict: 'id' })
      await supabase.from('work_actresses').upsert({ work_id: item.content_id, actress_id: String(a.id) }, { onConflict: 'work_id,actress_id' })
    }
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const type = new URL(request.url).searchParams.get('type') ?? 'all'
  const results: Record<string, number> = {}

  try {
    if (type === 'all' || type === 'works') {
      // 人気作品TOP200
      for (let offset = 1; offset <= 200; offset += 100) {
        const items = await fetchWorks({ hits: '100', sort: 'rank', offset: String(offset) })
        await saveWorks(items)
        await sleep(500)
      }
      // 最新作品200件
      for (let offset = 1; offset <= 200; offset += 100) {
        const items = await fetchWorks({ hits: '100', sort: 'date', offset: String(offset) })
        await saveWorks(items)
        await sleep(500)
      }
      results.works = 400
    }

    if (type === 'all' || type === 'actresses') {
      // 人気女優を取得してpopular_rankを保存
      const p1 = new URLSearchParams({
        api_id: DMM_API_ID, affiliate_id: DMM_AFFILIATE_ID,
        hits: '100', sort: 'popular', offset: '1', output: 'json',
      })
      await sleep(300)
      const p2 = new URLSearchParams({
        api_id: DMM_API_ID, affiliate_id: DMM_AFFILIATE_ID,
        hits: '100', sort: 'popular', offset: '101', output: 'json',
      })

      const [res1, res2] = await Promise.all([
        fetch(`https://api.dmm.com/affiliate/v3/ActressSearch?${p1.toString()}`, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.json()),
        fetch(`https://api.dmm.com/affiliate/v3/ActressSearch?${p2.toString()}`, { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => r.json()),
      ])

      const popularActresses = [...(res1.result?.actress ?? []), ...(res2.result?.actress ?? [])]
      for (let i = 0; i < popularActresses.length; i++) {
        const a = popularActresses[i]
        await supabase.from('actresses').upsert({
          id: String(a.id),
          name: a.name,
          ruby: a.ruby,
          image_url: (a.imageURL?.large ?? a.imageURL?.small ?? '').replace('http://', 'https://') || null,
          bust: a.bust ? parseInt(a.bust) : null,
          waist: a.waist ? parseInt(a.waist) : null,
          hip: a.hip ? parseInt(a.hip) : null,
          height: a.height ? parseInt(a.height) : null,
          cup: a.cup,
          popular_rank: i + 1,
          updated_at: new Date(),
        }, { onConflict: 'id' })
      }
      results.actresses_popular = popularActresses.length

      // 画像URLがない女優を追加で更新
      const { data: actressesWithoutImage } = await supabase
        .from('actresses')
        .select('id, name')
        .is('image_url', null)
        .limit(50)

      let updated = 0
      for (const actress of (actressesWithoutImage ?? [])) {
        await sleep(300)
        const a = await fetchActressByName(actress.name)
        if (a && (a.imageURL?.large || a.imageURL?.small)) {
          await supabase.from('actresses').update({
            image_url: (a.imageURL?.large ?? a.imageURL?.small ?? '').replace('http://', 'https://'),
            bust: a.bust ? parseInt(a.bust) : null,
            waist: a.waist ? parseInt(a.waist) : null,
            hip: a.hip ? parseInt(a.hip) : null,
            height: a.height ? parseInt(a.height) : null,
            cup: a.cup,
            updated_at: new Date(),
          }).eq('id', actress.id)
          updated++
        }
      }
      results.actresses_updated = updated
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
