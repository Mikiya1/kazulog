'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '../lib/supabase'

type Favorite = {
  actress_id: string
  actress_name: string
  actress_image: string
}

type ActressInfo = {
  id: string
  name: string
  imageUrl: string
  matchedGenres: string[]
  reason: string
}

type Work = {
  iteminfo?: {
    actress?: { id: number; name: string; ruby?: string }[]
    genre?: { id: number; name: string }[]
  }
}

const WORKS_PER_ACTRESS = 10
const TOP_GENRES_COUNT = 5
const RECOMMEND_PER_GENRE = 6
const MAX_DISPLAY = 12

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export default function RecommendedActresses({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [recommended, setRecommended] = useState<ActressInfo[]>([])
  const [topGenres, setTopGenres] = useState<{ name: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])

  // お気に入り取得
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (!u) { setLoading(false); return }
      supabase
        .from('favorites')
        .select('actress_id, actress_name, actress_image')
        .eq('user_id', u.id)
        .then(({ data }) => {
          const favs = data ?? []
          setFavorites(favs)
          setFavoriteIds(favs.map(f => f.actress_id))
          if (favs.length === 0) setLoading(false)
        })
    })
  }, [])

  // おすすめ女優取得
  useEffect(() => {
    if (favorites.length === 0) return
    setLoading(true)

    const run = async () => {
      // 1. お気に入り女優の作品を順番に取得（レート制限対策）
      const allWorks: Work[][] = []
      for (const fav of favorites) {
        const works = await fetch(`/api/dmm?actress=${encodeURIComponent(fav.actress_name)}&hits=${WORKS_PER_ACTRESS}&sort=rank&offset=1`)
          .then(r => r.json())
          .then(d => (d.result?.items ?? []) as Work[])
          .catch(() => [] as Work[])
        allWorks.push(works)
        await sleep(300)
      }

      // 2. ジャンル出現回数を集計
      const genreCount = new Map<string, number>()
      allWorks.flat().forEach(work => {
        work.iteminfo?.genre?.forEach(g => {
          // 不要なジャンル（画質・配信形式など）を除外
          const excludeIds = new Set([6533, 79015, 6548, 6179, 6012, 6566, 6925, 307935, 6793, 4110, 6014, 6170, 617, 6671])
          if (excludeIds.has(g.id)) return
          genreCount.set(g.name, (genreCount.get(g.name) ?? 0) + 1)
        })
      })

      // 3. TOP5ジャンル抽出
      const topGenresArr = [...genreCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_GENRES_COUNT)
        .map(([name, count]) => ({ name, count }))
      setTopGenres(topGenresArr)

      if (topGenresArr.length === 0) {
        setLoading(false)
        return
      }

      // 4. 各ジャンルで人気作品を取得して女優を抽出
      const favNamesSet = new Set(favorites.map(f => f.actress_name))
      const actressMap = new Map<string, ActressInfo>()

      const genreResults: { genre: string; items: Work[] }[] = []
      for (const g of topGenresArr) {
        await sleep(300)
        const res = await fetch(`/api/dmm?keyword=${encodeURIComponent(g.name)}&hits=${RECOMMEND_PER_GENRE * 4}&sort=rank&offset=1`)
        const data = await res.json()
        genreResults.push({ genre: g.name, items: (data.result?.items ?? []) as Work[] })
      }

      // 5. 各作品から女優を抽出（お気に入り女優は除外）
      genreResults.forEach(({ genre, items }) => {
        items.forEach(work => {
          work.iteminfo?.actress?.forEach(a => {
            if (favNamesSet.has(a.name)) return
            const id = String(a.id)
            if (actressMap.has(id)) {
              const existing = actressMap.get(id)!
              if (!existing.matchedGenres.includes(genre)) {
                existing.matchedGenres.push(genre)
              }
            } else {
              actressMap.set(id, {
                id,
                name: a.name,
                imageUrl: '', // 後で取得
                matchedGenres: [genre],
                reason: '',
              })
            }
          })
        })
      })

      // 6. マッチ数が多い順にソート、上位を取得
      const candidates = [...actressMap.values()]
        .sort((a, b) => b.matchedGenres.length - a.matchedGenres.length)
        .slice(0, MAX_DISPLAY)

      // 7. 各女優の画像を取得（actress_idで検索）
      const withImages: ActressInfo[] = []
      for (const a of candidates) {
        await sleep(200)
        try {
          const res = await fetch(`/api/dmm-actress?actress_id=${a.id}`)
          const data = await res.json()
          const found = data.result?.actress?.[0]
          withImages.push({
            ...a,
            imageUrl: found?.imageUrl ?? '',
            reason: a.matchedGenres.length === 1
              ? `${a.matchedGenres[0]}が好きなあなたへ`
              : `${a.matchedGenres.slice(0, 2).join('・')}系のあなたへ`,
          })
        } catch {
          withImages.push({ ...a, reason: a.matchedGenres[0] + 'が好きなあなたへ', imageUrl: '' })
        }
      }

      // 画像があるものだけ表示
      setRecommended(withImages.filter(a => a.imageUrl))
      setLoading(false)
    }

    run()
  }, [favorites])

  // お気に入り登録/解除
  const toggleFavorite = async (a: ActressInfo) => {
    if (!user) return
    if (favoriteIds.includes(a.id)) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('actress_id', a.id)
      setFavoriteIds(prev => prev.filter(id => id !== a.id))
    } else {
      await supabase.from('favorites').upsert({
        user_id: user.id, actress_id: a.id, actress_name: a.name, actress_image: a.imageUrl,
      }, { onConflict: 'user_id,actress_id' })
      setFavoriteIds(prev => [...prev, a.id])
    }
  }

  if (!user) {
    return (
      <div style={{ padding: '20px', background: 'var(--card)', borderRadius: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
        <div style={{ fontSize: '14px', color: 'var(--subtext)', marginBottom: '12px' }}>
          ログインしてお気に入り登録すると<br />あなたの好みに合う女優をおすすめします
        </div>
      </div>
    )
  }

  if (favorites.length === 0) {
    return (
      <div style={{ padding: '20px', background: 'var(--card)', borderRadius: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>💖</div>
        <div style={{ fontSize: '14px', color: 'var(--subtext)', marginBottom: '12px' }}>
          お気に入り登録すると<br />あなたの好みに合う女優をおすすめします
        </div>
        <button
          onClick={() => router.push('/swipe')}
          style={{
            background: 'var(--gradient)', color: '#fff', border: 'none',
            borderRadius: '50px', padding: '10px 20px',
            fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            boxShadow: 'var(--shadow-btn)',
          }}
        >
          診断してみる 🔥
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        {topGenres.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {topGenres.map(g => (
              <div key={g.name} style={{ fontSize: '11px', padding: '3px 10px', background: 'var(--card)', borderRadius: '20px', color: 'var(--subtext)' }}>
                {g.name}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ flexShrink: 0, width: '90px' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'var(--card)', opacity: 0.5 }} />
              <div style={{ height: '12px', background: 'var(--card)', borderRadius: '6px', marginTop: '8px', opacity: 0.5 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (recommended.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--subtext)', fontSize: '13px' }}>
        おすすめ女優が見つかりませんでした
      </div>
    )
  }

  return (
    <div>
      {/* ジャンル傾向タグ */}
      {topGenres.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--subtext)', marginBottom: '6px' }}>
            あなたの好み傾向
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {topGenres.map(g => (
              <div
                key={g.name}
                style={{
                  fontSize: '11px', fontWeight: '700',
                  padding: '4px 10px',
                  background: 'linear-gradient(135deg, #FD297B22, #FF655B11)',
                  border: '1px solid rgba(253,41,123,0.25)',
                  borderRadius: '20px', color: '#FD297B',
                }}
              >
                {g.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 女優一覧（横スクロール） */}
      <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px' }}>
        {recommended.map(a => (
          <div key={a.id} style={{ flexShrink: 0, width: compact ? '90px' : '110px', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: compact ? '82px' : '100px', height: compact ? '82px' : '100px', margin: '0 auto 8px' }}>
              <div
                onClick={() => router.push(`/recommend?ids=${a.id}&names=${a.name}&images=${encodeURIComponent(a.imageUrl)}`)}
                style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  overflow: 'hidden', cursor: 'pointer',
                  boxShadow: '0 0 0 2px #FD297B66',
                }}
              >
                <Image
                  src={a.imageUrl}
                  alt={a.name}
                  width={compact ? 82 : 100}
                  height={compact ? 82 : 100}
                  style={{ objectFit: 'cover', objectPosition: 'top' }}
                  unoptimized
                />
              </div>
              <button
                onClick={() => toggleFavorite(a)}
                style={{
                  position: 'absolute', bottom: '-2px', right: '-2px',
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: '#fff', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
              >
                {favoriteIds.includes(a.id) ? '💖' : '🤍'}
              </button>
            </div>
            <div style={{
              fontSize: '12px', fontWeight: '700', color: 'var(--text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              marginBottom: '2px',
            }}>
              {a.name}
            </div>
            <div style={{
              fontSize: '10px', color: 'var(--subtext)',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden', lineHeight: '1.3',
            } as React.CSSProperties}>
              {a.reason}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
