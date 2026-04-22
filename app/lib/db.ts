import { supabase } from './supabase'

export type WorkFromDB = {
  id: string
  title: string
  affiliate_url: string
  image_large: string
  image_small: string
  volume: number | null
  date: string | null
  price: string | null
  actresses: { id: string; name: string; image_url: string | null }[]
  genres: { id: string; name: string }[]
}

// 女優IDから作品を取得
export async function getWorksByActressId(
  actressId: string,
  sort: 'date' | 'rank' = 'rank',
  limit = 20,
  offset = 0
): Promise<WorkFromDB[]> {
  // work_actressesから作品IDを取得
  const { data: workIds } = await supabase
    .from('work_actresses')
    .select('work_id')
    .eq('actress_id', actressId)

  if (!workIds || workIds.length === 0) return []

  const ids = workIds.map(w => w.work_id)

  let query = supabase
    .from('works')
    .select(`
      id, title, affiliate_url, image_large, image_small, volume, date, price,
      work_actresses(actresses(id, name, image_url)),
      work_genres(genres(id, name))
    `)
    .in('id', ids)
    .range(offset, offset + limit - 1)

  if (sort === 'date') {
    query = query.order('date', { ascending: false })
  } else {
    query = query.order('id', { ascending: false })
  }

  const { data } = await query

  return (data ?? []).map(formatWork)
}

// ジャンルIDから作品を取得
export async function getWorksByGenreId(
  genreId: string,
  sort: 'date' | 'rank' = 'rank',
  limit = 20,
  offset = 0
): Promise<{ works: WorkFromDB[]; total: number }> {
  // 総件数取得
  const { count } = await supabase
    .from('work_genres')
    .select('work_id', { count: 'exact', head: true })
    .eq('genre_id', genreId)

  const { data: workIds } = await supabase
    .from('work_genres')
    .select('work_id')
    .eq('genre_id', genreId)
    .range(offset, offset + limit - 1)

  if (!workIds || workIds.length === 0) return { works: [], total: count ?? 0 }

  const ids = workIds.map(w => w.work_id)

  let query = supabase
    .from('works')
    .select(`
      id, title, affiliate_url, image_large, image_small, volume, date, price,
      work_actresses(actresses(id, name, image_url)),
      work_genres(genres(id, name))
    `)
    .in('id', ids)

  if (sort === 'date') {
    query = query.order('date', { ascending: false })
  }

  const { data } = await query
  return { works: (data ?? []).map(formatWork), total: count ?? 0 }
}

// 女優IDリスト × ジャンルIDリストでAND検索（RPC版）
export async function getWorksByActressIdsAndGenreIds(
  actressIds: string[],
  genreIds: string[],
  sort: 'date' | 'rank' = 'date',
  limit = 20,
  offset = 0
): Promise<{ works: WorkFromDB[]; total: number }> {
  const { data, error } = await supabase.rpc('get_works_by_actresses_and_genres', {
    p_actress_ids: actressIds,
    p_genre_ids: genreIds,
    p_sort: sort,
    p_limit: limit,
    p_offset: offset,
  })

  if (error || !data || data.length === 0) return { works: [], total: 0 }

  const total = Number(data[0].total_count)

  // RPCの結果からidリストを取得して、関連データ込みで再取得
  const ids = data.map((r: any) => r.id)
  const { data: works } = await supabase
    .from('works')
    .select(`
      id, title, affiliate_url, image_large, image_small, volume, date, price,
      work_actresses(actresses(id, name, image_url)),
      work_genres(genres(id, name))
    `)
    .in('id', ids)
    .order(sort === 'date' ? 'date' : 'id', { ascending: false })

  return { works: (works ?? []).map(formatWork), total }
}

// 人気作品を取得
export async function getPopularWorks(limit = 20, offset = 0): Promise<WorkFromDB[]> {
  const { data } = await supabase
    .from('works')
    .select(`
      id, title, affiliate_url, image_large, image_small, volume, date, price,
      work_actresses(actresses(id, name, image_url)),
      work_genres(genres(id, name))
    `)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1)

  return (data ?? []).map(formatWork)
}

// 人気女優を取得
export async function getPopularActresses(limit = 30): Promise<{ id: string; name: string; image_url: string | null; tags: string[] | null; debut_year: number | null }[]> {
  const { data } = await supabase
    .from('actresses')
    .select('id, name, image_url, tags, debut_year')
    .not('image_url', 'is', null)
    .not('popular_rank', 'is', null)
    .order('popular_rank', { ascending: true })
    .limit(limit)

  return data ?? []
}

// 女優一覧を取得（50音順）
export async function getActressesByInitial(
  initial: string,
  limit = 100,
  offset = 0
): Promise<{ actresses: { id: string; name: string; ruby: string | null; image_url: string | null; tags: string[] | null; debut_year: number | null }[]; total: number }> {
  const rubyMap: Record<string, [string, string]> = {
    'あ': ['あ', 'お'],
    'か': ['か', 'こ'],
    'さ': ['さ', 'そ'],
    'た': ['た', 'と'],
    'な': ['な', 'の'],
    'は': ['は', 'ほ'],
    'ま': ['ま', 'も'],
    'や': ['や', 'よ'],
    'ら': ['ら', 'ろ'],
    'わ': ['わ', 'ん'],
  }

  const range = rubyMap[initial]
  if (!range) return { actresses: [], total: 0 }

  const { data, count } = await supabase
    .from('actresses')
    .select('id, name, ruby, image_url, tags, debut_year', { count: 'exact' })
    .gte('ruby', range[0])
    .lte('ruby', range[1] + 'ん')
    .not('image_url', 'is', null)
    .order('ruby', { ascending: true })
    .range(offset, offset + limit - 1)

  return { actresses: data ?? [], total: count ?? 0 }
}

function formatWork(item: any): WorkFromDB {
  return {
    id: item.id,
    title: item.title,
    affiliate_url: item.affiliate_url,
    image_large: item.image_large,
    image_small: item.image_small,
    volume: item.volume,
    date: item.date,
    price: item.price,
    actresses: (item.work_actresses ?? [])
      .map((wa: any) => wa.actresses)
      .filter(Boolean),
    genres: (item.work_genres ?? [])
      .map((wg: any) => wg.genres)
      .filter(Boolean),
  }
}
