import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = parseInt(new URL(request.url).searchParams.get('limit') ?? '200')
  const minWorks = parseInt(new URL(request.url).searchParams.get('min_works') ?? '50')

  // DB内の作品数が多い順で、かつ作品数がまだ少ない女優を取得
  // min_works以上の作品数がDBに既にある女優はスキップ
  const { data } = await supabase.rpc('get_actresses_by_work_count', { p_limit: limit * 3 })

  if (!data) {
    return NextResponse.json({ actresses: [] })
  }

  // 作品数がmin_works未満の女優のみ返す（まだ取得が足りない女優）
  const filtered = (data as { id: string; name: string; work_count: number }[])
    .filter(a => a.work_count < minWorks)
    .slice(0, limit)

  return NextResponse.json({ actresses: filtered, total: filtered.length })
}
