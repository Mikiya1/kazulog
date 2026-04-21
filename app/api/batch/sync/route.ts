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

async function saveWorksBulk(items: any[]) {
  if (items.length === 0) return

  // works一括upsert
  const works = items.map(item => ({
    id: item.content_id,
    title: item.title,
    affiliate_url: item.affiliateURL,
    image_large: item.imageURL?.large,
    image_small: item.imageURL?.small,
    volume: item.volume ? parseInt(item.volume) : null,
    date: item.date ? new Date(item.date) : null,
    price: item.prices?.price,
    updated_at: new Date(),
  }))
  await supabase.from('works').upsert(works, { onConflict: 'id' })

  // genres一括upsert
  const genreMap = new Map<string, string>()
  const workGenres: { work_id: string; genre_id: string }[] = []
  items.forEach(item => {
    (item.iteminfo?.genre ?? []).forEach((g: any) => {
      genreMap.set(String(g.id), g.name)
      workGenres.push({ work_id: item.content_id, genre_id: String(g.id) })
    })
  })
  if (genreMap.size > 0) {
    await supabase.from('genres').upsert(
      Array.from(genreMap.entries()).map(([id, name]) => ({ id, name })),
      { onConflict: 'id' }
    )
  }
  if (workGenres.length > 0) {
    await supabase.from('work_genres').upsert(workGenres, { onConflict: 'work_id,genre_id' })
  }

  // actresses一括upsert
  const actressMap = new Map<string, { id: string; name: string; ruby: string }>()
  const workActresses: { work_id: string; actress_id: string }[] = []
  items.forEach(item => {
    (item.iteminfo?.actress ?? []).forEach((a: any) => {
      actressMap.set(String(a.id), { id: String(a.id), name: a.name, ruby: a.ruby })
      workActresses.push({ work_id: item.content_id, actress_id: String(a.id) })
    })
  })
  if (actressMap.size > 0) {
    await supabase.from('actresses').upsert(
      Array.from(actressMap.values()).map(a => ({ ...a, updated_at: new Date() })),
      { onConflict: 'id' }
    )
  }
  if (workActresses.length > 0) {
    await supabase.from('work_actresses').upsert(workActresses, { onConflict: 'work_id,actress_id' })
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const type = url.searchParams.get('type') ?? 'works'
  const sort = url.searchParams.get('sort') ?? 'rank'
  const offset = parseInt(url.searchParams.get('offset') ?? '1')
  const batches = parseInt(url.searchParams.get('batches') ?? '5')
  const hits = 100

  const results: Record<string, any> = {}

  try {
    if (type === 'works') {
      let totalSaved = 0
      for (let i = 0; i < batches; i++) {
        const currentOffset = offset + (i * hits)
        const items = await fetchWorks({ hits: String(hits), sort, offset: String(currentOffset) })
        if (items.length === 0) break
        await saveWorksBulk(items)
        totalSaved += items.length
        await sleep(300)
      }
      results.saved = totalSaved
      results.next_offset = offset + (batches * hits)
    }

    if (type === 'actresses') {
      const { data: actressesWithoutImage } = await supabase
        .from('actresses')
        .select('id, name')
        .is('image_url', null)
        .limit(50)

      let updated = 0
      for (const actress of (actressesWithoutImage ?? [])) {
        await sleep(200)
        const p = new URLSearchParams({
          api_id: DMM_API_ID, affiliate_id: DMM_AFFILIATE_ID,
          output: 'json', hits: '1', keyword: actress.name,
        })
        const res = await fetch(`https://api.dmm.com/affiliate/v3/ActressSearch?${p.toString()}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        })
        const data = await res.json()
        const a = data.result?.actress?.[0]
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

    if (type === 'daily') {
      const items = await fetchWorks({ hits: '100', sort: 'date', offset: '1' })
      await saveWorksBulk(items)
      results.saved = items.length
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
