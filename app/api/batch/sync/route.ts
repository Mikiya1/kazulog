import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const DMM_API_ID = process.env.DMM_API_ID!
const DMM_AFFILIATE_ID = process.env.DMM_AFFILIATE_ID!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// DMM APIから作品を取得
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

// DMM APIから女優を取得
async function fetchActresses(params: Record<string, string>) {
  const p = new URLSearchParams({
    api_id: DMM_API_ID,
    affiliate_id: DMM_AFFILIATE_ID,
    output: 'json',
    ...params,
  })
  const res = await fetch(`https://api.dmm.com/affiliate/v3/ActressSearch?${p.toString()}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  })
  const data = await res.json()
  return { actresses: data.result?.actress ?? [], total: Number(data.result?.total_count ?? 0) }
}

// 作品データをSupabaseに保存
async function saveWorks(items: any[]) {
  for (const item of items) {
    // 作品保存
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

    // ジャンル保存
    const genres = item.iteminfo?.genre ?? []
    for (const g of genres) {
      await supabase.from('genres').upsert({ id: String(g.id), name: g.name }, { onConflict: 'id' })
      await supabase.from('work_genres').upsert({ work_id: item.content_id, genre_id: String(g.id) }, { onConflict: 'work_id,genre_id' })
    }

    // 女優保存
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
  // セキュリティ: Vercel Cron JobsからのリクエストかAPIキーを確認
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, number> = {}

  try {
    console.log('Starting batch sync...')

    // 1. 人気作品（売れ筋TOP200）
    console.log('Fetching popular works...')
    for (let offset = 1; offset <= 200; offset += 100) {
      const items = await fetchWorks({ hits: '100', sort: 'rank', offset: String(offset) })
      await saveWorks(items)
      await sleep(500)
    }
    results.popular = 200

    // 2. 最新作品（直近200件）
    console.log('Fetching latest works...')
    for (let offset = 1; offset <= 200; offset += 100) {
      const items = await fetchWorks({ hits: '100', sort: 'date', offset: String(offset) })
      await saveWorks(items)
      await sleep(500)
    }
    results.latest = 200

    // 3. 人気女優（人気順200人）
    console.log('Fetching popular actresses...')
    const { actresses: popularActresses } = await fetchActresses({ hits: '100', sort: 'popular', offset: '1' })
    await sleep(300)
    const { actresses: popularActresses2 } = await fetchActresses({ hits: '100', sort: 'popular', offset: '101' })

    for (const a of [...popularActresses, ...popularActresses2]) {
      await supabase.from('actresses').upsert({
        id: String(a.id),
        name: a.name,
        ruby: a.ruby,
        image_url: (a.imageURL?.large ?? a.imageURL?.small ?? '').replace('http://', 'https://'),
        bust: a.bust ? parseInt(a.bust) : null,
        waist: a.waist ? parseInt(a.waist) : null,
        hip: a.hip ? parseInt(a.hip) : null,
        height: a.height ? parseInt(a.height) : null,
        cup: a.cup,
        updated_at: new Date(),
      }, { onConflict: 'id' })
    }
    results.actresses = popularActresses.length + popularActresses2.length

    console.log('Batch sync completed!', results)
    return NextResponse.json({ success: true, results })

  } catch (error) {
    console.error('Batch sync error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
