'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '../../components/Header'
import { supabase } from '../../lib/supabase'

type Favorite = {
  actress_id: string
  actress_name: string
  actress_image: string
}

type Work = {
  content_id: string
  title: string
  affiliateURL: string
  imageURL: { large: string; small: string }
  date: string
  iteminfo?: { actress?: { id: number; name: string }[]; genre?: { id: number; name: string }[] }
  volume?: string
}

type WorkWithActresses = Work & {
  matchedActresses: string[] // お気に入りの中で出演している女優名
}

export default function NewWorksPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [works, setWorks] = useState<WorkWithActresses[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [fetchLoading, setFetchLoading] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (!u) { setPageLoading(false); return }
      supabase
        .from('favorites')
        .select('actress_id, actress_name, actress_image')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setFavorites(data ?? [])
          setPageLoading(false)
        })
    })
  }, [])

  useEffect(() => {
    if (favorites.length === 0) return
    setFetchLoading(true)

    // 全女優の最新作を並列取得
    Promise.all(
      favorites.map(fav =>
        fetch(`/api/dmm?actress=${encodeURIComponent(fav.actress_name)}&hits=30&sort=date&offset=1`)
          .then(r => r.json())
          .then(data => ({ fav, items: (data.result?.items ?? []) as Work[] }))
          .catch(() => ({ fav, items: [] as Work[] }))
      )
    ).then(results => {
      // content_idをキーに重複まとめ＋出演女優を集約
      const map = new Map<string, WorkWithActresses>()
      const favNames = new Set(favorites.map(f => f.actress_name))

      results.forEach(({ fav, items }) => {
        items.forEach(work => {
          if (map.has(work.content_id)) {
            // 既存にこの女優を追加
            const existing = map.get(work.content_id)!
            if (!existing.matchedActresses.includes(fav.actress_name)) {
              existing.matchedActresses.push(fav.actress_name)
            }
          } else {
            // 作品のiteminfo.actressとお気に入りを照合
            const workActresses = work.iteminfo?.actress?.map(a => a.name) ?? []
            const matched = workActresses.filter(n => favNames.has(n))
            // matchedが空の場合はAPIで返ってきた女優名で代替
            map.set(work.content_id, {
              ...work,
              matchedActresses: matched.length > 0 ? matched : [fav.actress_name],
            })
          }
        })
      })

      // 発売日順にソート
      const sorted = Array.from(map.values()).sort((a, b) =>
        (b.date ?? '').localeCompare(a.date ?? '')
      )
      setWorks(sorted)
      setFetchLoading(false)
    })
  }, [favorites])

  const getLabel = (matchedActresses: string[]) => {
    if (matchedActresses.length === 1) return `${matchedActresses[0]}の最新作`
    if (matchedActresses.length === 2) return `${matchedActresses[0]}と${matchedActresses[1]}が出演`
    return `${matchedActresses.slice(0, 2).join('・')}ほかが出演`
  }

  if (pageLoading) {
    return (
      <>
        <Header />
        <main style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div style={{ fontSize: '24px' }}>🔥</div>
          <span style={{ color: 'var(--subtext)', fontWeight: '600' }}>読み込み中...</span>
        </main>
      </>
    )
  }

  if (!user) {
    return (
      <>
        <Header />
        <main style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
          <div style={{ fontSize: '48px' }}>🔒</div>
          <p style={{ fontSize: '16px', color: 'var(--subtext)', textAlign: 'center' }}>ログインが必要です</p>
          <button onClick={() => router.push('/')} style={{ background: 'var(--gradient)', color: '#fff', border: 'none', borderRadius: '50px', padding: '16px 32px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
            トップへ戻る
          </button>
        </main>
      </>
    )
  }

  if (favorites.length === 0) {
    return (
      <>
        <Header />
        <main style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
          <div style={{ fontSize: '48px' }}>💔</div>
          <p style={{ fontSize: '16px', color: 'var(--subtext)', textAlign: 'center' }}>お気に入り女優がいません</p>
          <button onClick={() => router.push('/swipe')} style={{ background: 'var(--gradient)', color: '#fff', border: 'none', borderRadius: '50px', padding: '16px 32px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
            診断してみる
          </button>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', padding: '24px 20px', maxWidth: '480px', margin: '0 auto' }}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '0', color: 'var(--text)' }}>
              ←
            </button>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>最新作一覧 📬</h2>
              <div style={{ fontSize: '12px', color: 'var(--subtext)', marginTop: '2px' }}>
                お気に入り {favorites.length}人 の最新作
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push('/favorites/new-works/by-actress')}
            style={{
              background: 'var(--card)', color: 'var(--text)',
              border: '1.5px solid var(--border)',
              borderRadius: '20px', padding: '8px 14px',
              fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            👩 女優別
          </button>
        </div>

        {/* ローディング */}
        {fetchLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', background: 'var(--card)', borderRadius: '16px', padding: '12px', opacity: 0.5 }}>
                <div style={{ width: '80px', height: '112px', borderRadius: '10px', background: 'var(--border)', flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                  <div style={{ height: '12px', background: 'var(--border)', borderRadius: '6px', width: '60%' }} />
                  <div style={{ height: '10px', background: 'var(--border)', borderRadius: '6px', width: '90%' }} />
                  <div style={{ height: '10px', background: 'var(--border)', borderRadius: '6px', width: '75%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : works.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--subtext)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>😢</div>
            <div style={{ fontSize: '14px' }}>作品が見つかりませんでした</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {works.map(work => (
              <div
                key={work.content_id}
                onClick={() => window.open(work.affiliateURL, '_blank')}
                style={{
                  display: 'flex', gap: '12px',
                  background: 'var(--card)', borderRadius: '16px',
                  padding: '12px', cursor: 'pointer',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                }}
              >
                {/* サムネイル */}
                <div style={{ flexShrink: 0, width: '80px', height: '112px', borderRadius: '10px', overflow: 'hidden', background: '#f8f0f4', position: 'relative' }}>
                  <Image
                    src={work.imageURL?.large || work.imageURL?.small || ''}
                    alt={work.title}
                    fill
                    style={{ objectFit: 'cover' }}
                    unoptimized
                  />
                </div>

                {/* 情報 */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                  {/* 女優ラベル */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center',
                    background: 'linear-gradient(135deg, #FD297B22, #FF655B11)',
                    border: '1px solid rgba(253,41,123,0.25)',
                    borderRadius: '20px', padding: '3px 10px',
                    fontSize: '11px', fontWeight: '700', color: '#FD297B',
                    marginBottom: '6px', alignSelf: 'flex-start',
                    maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    💖 {getLabel(work.matchedActresses)}
                  </div>

                  {/* タイトル */}
                  <div style={{
                    fontSize: '13px', fontWeight: '600', color: 'var(--text)',
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', lineHeight: '1.5', flex: 1,
                  } as React.CSSProperties}>
                    {work.title}
                  </div>

                  {/* 発売日 */}
                  <div style={{ fontSize: '11px', color: 'var(--subtext)', marginTop: '6px' }}>
                    {work.date ? `発売日: ${work.date}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </>
  )
}
