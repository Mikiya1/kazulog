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
      // 画像URLがない女優を取得して更新
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
