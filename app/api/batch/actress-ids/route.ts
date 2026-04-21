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

  // DB内の作品数が多い順に女優を取得（多作女優 = 重要な女優）
  const { data } = await supabase.rpc('get_actresses_by_work_count', { p_limit: limit })

  if (!data) {
    // RPCがない場合のフォールバック
    const { data: fallback } = await supabase
      .from('actresses')
      .select('id, name')
      .not('image_url', 'is', null)
      .order('popular_rank', { ascending: true, nullsFirst: false })
      .limit(limit)
    return NextResponse.json({ actresses: fallback ?? [] })
  }

  return NextResponse.json({ actresses: data })
}
