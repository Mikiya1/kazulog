'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'
import { getWorksByActressId } from '../lib/db'
import RecommendedActresses from '../components/RecommendedActresses'

type Favorite = {
  id: string
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
  matchedActresses: string[]
}

type ActressWorks = {
  actress: Favorite
  works: Work[]
  loading: boolean
  error: boolean
}

type Tab = 'list' | 'timeline' | 'by-actress' | 'recommended'

const HITS = 30

export default function FavoritesPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('list')
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)

  // 最新作（時系列）
  const [timelineWorks, setTimelineWorks] = useState<WorkWithActresses[]>([])
  const [timelineFetched, setTimelineFetched] = useState(false)
  const [timelineLoading, setTimelineLoading] = useState(false)

  // 女優別
  const [actressWorks, setActressWorks] = useState<ActressWorks[]>([])
  const [byActressFetched, setByActressFetched] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (!u) { setPageLoading(false); return }
      supabase
        .from('favorites')
        .select('*')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setFavorites(data ?? [])
          setPageLoading(false)
        })
    })
  }, [])

  // タブ切り替え時にデータ取得
  useEffect(() => {
    if (favorites.length === 0) return

    if (tab === 'timeline' && !timelineFetched) {
      setTimelineLoading(true)
      setTimelineFetched(true)
      const favNames = new Set(favorites.map(f => f.actress_name))
      Promise.all(
        favorites.map(fav =>
          getWorksByActressId(fav.actress_id, 'date', HITS, 0)
            .then(items => ({ fav, items }))
            .catch(() => ({ fav, items: [] }))
        )
      ).then(results => {
        const map = new Map<string, WorkWithActresses>()
        results.forEach(({ fav, items }) => {
          items.forEach(work => {
            if (map.has(work.id)) {
              const existing = map.get(work.id)!
              if (!existing.matchedActresses.includes(fav.actress_name)) {
                existing.matchedActresses.push(fav.actress_name)
              }
            } else {
              const workActresses = work.actresses.map(a => a.name)
              const matched = workActresses.filter(n => favNames.has(n))
              map.set(work.id, {
                content_id: work.id,
                title: work.title,
                affiliateURL: work.affiliate_url,
                imageURL: { large: work.image_large, small: work.image_small },
                date: work.date ?? '',
                volume: work.volume ? String(work.volume) : undefined,
                iteminfo: { actress: work.actresses.map(a => ({ id: Number(a.id), name: a.name })) },
                matchedActresses: matched.length > 0 ? matched : [fav.actress_name],
              })
            }
          })
        })
        const sorted = Array.from(map.values()).sort((a, b) =>
          (b.date ?? '').localeCompare(a.date ?? '')
        )
        setTimelineWorks(sorted)
        setTimelineLoading(false)
      })
    }

    if (tab === 'by-actress' && !byActressFetched) {
      setByActressFetched(true)
      setActressWorks(favorites.map(a => ({ actress: a, works: [], loading: true, error: false })))
      favorites.forEach((fav, i) => {
        getWorksByActressId(fav.actress_id, 'date', HITS, 0)
          .then(items => {
            setActressWorks(prev => prev.map((aw, j) =>
              j === i ? { ...aw, works: items.map(w => ({
                content_id: w.id,
                title: w.title,
                affiliateURL: w.affiliate_url,
                imageURL: { large: w.image_large, small: w.image_small },
                date: w.date ?? '',
                volume: w.volume ? String(w.volume) : undefined,
              })), loading: false } : aw
            ))
          })
          .catch(() => {
            setActressWorks(prev => prev.map((aw, j) =>
              j === i ? { ...aw, loading: false, error: true } : aw
            ))
          })
      })
    }
  }, [tab, favorites])

  const removeFavorite = async (actressId: string) => {
    if (!user) return
    if (removedIds.includes(actressId)) {
      await supabase.from('favorites').upsert({
        user_id: user.id,
        actress_id: actressId,
        actress_name: favorites.find(f => f.actress_id === actressId)?.actress_name ?? '',
        actress_image: favorites.find(f => f.actress_id === actressId)?.actress_image ?? '',
      }, { onConflict: 'user_id,actress_id' })
      setRemovedIds(prev => prev.filter(id => id !== actressId))
    } else {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('actress_id', actressId)
      setRemovedIds(prev => [...prev, actressId])
    }
  }

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
          <p style={{ fontSize: '16px', color: 'var(--subtext)', textAlign: 'center' }}>お気に入りを見るにはログインが必要です</p>
          <button onClick={() => router.push('/')} style={{ background: 'var(--gradient)', color: '#fff', border: 'none', borderRadius: '50px', padding: '16px 32px', fontSize: '16px', fontWeight: '700', boxShadow: 'var(--shadow-btn)', cursor: 'pointer' }}>
            トップへ戻る
          </button>
        </main>
      </>
    )
  }

  const tabStyle = (t: Tab) => ({
    flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
    fontSize: '13px', fontWeight: '700',
    background: tab === t ? 'var(--gradient)' : 'var(--card)',
    color: tab === t ? '#fff' : 'var(--subtext)',
    borderRadius: '12px',
    boxShadow: tab === t ? 'var(--shadow-btn)' : 'none',
    transition: 'all 0.2s',
  })

  return (
    <>
      <Header />
      <main style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', maxWidth: '480px', margin: '0 auto' }}>

        {/* タブ */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', padding: '16px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={tabStyle('list') as React.CSSProperties} onClick={() => setTab('list')}>
              💖 お気に入り
            </button>
            <button style={tabStyle('timeline') as React.CSSProperties} onClick={() => setTab('timeline')}>
              📬 最新作
            </button>
            <button style={tabStyle('by-actress') as React.CSSProperties} onClick={() => setTab('by-actress')}>
              👩 女優別
            </button>
            <button style={tabStyle('recommended') as React.CSSProperties} onClick={() => setTab('recommended')}>
              ✨ おすすめ
            </button>
          </div>
        </div>

        <div style={{ padding: '20px 20px 40px' }}>

          {/* ===== お気に入り一覧 ===== */}
          {tab === 'list' && (
            <>
              {favorites.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '64px 0' }}>
                  <div style={{ fontSize: '48px' }}>💔</div>
                  <p style={{ fontSize: '16px', color: 'var(--subtext)', textAlign: 'center' }}>お気に入りがまだありません</p>
                  <button onClick={() => router.push('/swipe')} style={{ background: 'var(--gradient)', color: '#fff', border: 'none', borderRadius: '50px', padding: '16px 32px', fontSize: '16px', fontWeight: '700', boxShadow: 'var(--shadow-btn)', cursor: 'pointer' }}>
                    診断してみる
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '32px' }}>
                    {favorites.map(fav => (
                      <div key={fav.id} style={{ background: 'var(--card)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', position: 'relative' }}>
                        <button
                          onClick={() => removeFavorite(fav.actress_id)}
                          style={{
                            position: 'absolute', top: '8px', right: '8px', zIndex: 3,
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            opacity: removedIds.includes(fav.actress_id) ? 0.4 : 1,
                          }}
                        >
                          {removedIds.includes(fav.actress_id) ? '🤍' : '💖'}
                        </button>
                        <div onClick={() => router.push(`/recommend?ids=${fav.actress_id}&names=${fav.actress_name}&images=${encodeURIComponent(fav.actress_image)}`)} style={{ cursor: 'pointer' }}>
                          <div style={{ height: '160px', position: 'relative', background: '#f8f0f4' }}>
                            {fav.actress_image ? (
                              <Image src={fav.actress_image} alt={fav.actress_name} fill style={{ objectFit: 'contain', objectPosition: 'center' }} unoptimized />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>👩</div>
                            )}
                          </div>
                          <div style={{ padding: '12px' }}>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>{fav.actress_name}</div>
                            <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: '600', background: 'var(--gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' } as React.CSSProperties}>
                              作品を見る →
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => router.push('/swipe')} style={{ width: '100%', background: 'var(--card)', color: 'var(--subtext)', border: '1.5px solid var(--border)', borderRadius: '50px', padding: '16px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                    診断する 🔥
                  </button>
                </>
              )}
            </>
          )}

          {/* ===== 最新作（時系列） ===== */}
          {tab === 'timeline' && (
            <>
              {timelineLoading ? (
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
              ) : timelineWorks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--subtext)' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>😢</div>
                  <div style={{ fontSize: '14px' }}>作品が見つかりませんでした</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {timelineWorks.map(work => (
                    <div
                      key={work.content_id}
                      onClick={() => window.open(work.affiliateURL, '_blank')}
                      style={{ display: 'flex', gap: '12px', background: 'var(--card)', borderRadius: '16px', padding: '12px', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                    >
                      <div style={{ flexShrink: 0, width: '100px', height: '130px', borderRadius: '10px', overflow: 'hidden', background: '#f8f0f4', position: 'relative' }}>
                        <Image src={work.imageURL?.large || work.imageURL?.small || ''} alt={work.title} fill style={{ objectFit: 'cover' }} unoptimized />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
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
                        <div style={{
                          fontSize: '13px', fontWeight: '600', color: 'var(--text)',
                          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                          overflow: 'hidden', lineHeight: '1.5', flex: 1,
                        } as React.CSSProperties}>
                          {work.title}
                        </div>
                        {(work.iteminfo?.actress?.length ?? 0) > 0 && (
                          <div style={{ fontSize: '11px', color: 'var(--subtext)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            👩 {work.iteminfo!.actress!.map(a => a.name).join(' / ')}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: 'var(--subtext)', marginTop: '2px' }}>
                          {work.date ? `📅 ${work.date}` : ''}{work.volume ? `　🕐 ${work.volume}分` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ===== 女優別 ===== */}
          {tab === 'by-actress' && (
            <>
              {actressWorks.map(({ actress, works, loading, error }) => (
                <div key={actress.actress_id} style={{ marginBottom: '32px' }}>
                  <div
                    onClick={() => router.push(`/recommend?ids=${actress.actress_id}&names=${actress.actress_name}&images=${encodeURIComponent(actress.actress_image)}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', cursor: 'pointer' }}
                  >
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, boxShadow: '0 0 0 2px #FD297B44' }}>
                      {actress.actress_image ? (
                        <Image src={actress.actress_image} alt={actress.actress_name} width={44} height={44} style={{ objectFit: 'cover', objectPosition: 'top' }} unoptimized />
                      ) : (
                        <div style={{ width: '44px', height: '44px', background: '#f8f0f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👩</div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700' }}>{actress.actress_name}</div>
                      <div style={{ fontSize: '12px', color: '#FD297B', fontWeight: '600' }}>
                        {loading ? '取得中...' : `${works.length}件 · 全作品を見る →`}
                      </div>
                    </div>
                  </div>
                  {loading ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {[...Array(4)].map((_, i) => (
                        <div key={i} style={{ flexShrink: 0, width: '100px', height: '155px', borderRadius: '12px', background: 'var(--card)', opacity: 0.5 }} />
                      ))}
                    </div>
                  ) : error || works.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--subtext)', padding: '8px 0' }}>作品が見つかりませんでした</div>
                  ) : (
                    <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {works.map(work => (
                        <div
                          key={work.content_id}
                          onClick={() => window.open(work.affiliateURL, '_blank')}
                          style={{ flexShrink: 0, width: '100px', cursor: 'pointer', borderRadius: '12px', overflow: 'hidden', background: 'var(--card)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                        >
                          <div style={{ width: '100px', height: '140px', position: 'relative', background: '#f8f0f4' }}>
                            <Image src={work.imageURL?.large || work.imageURL?.small || ''} alt={work.title} fill style={{ objectFit: 'cover' }} unoptimized />
                          </div>
                          <div style={{ padding: '6px 8px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--subtext)', marginBottom: '2px' }}>{work.date}</div>
                            <div style={{
                              fontSize: '11px', fontWeight: '600', color: 'var(--text)',
                              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                              overflow: 'hidden', lineHeight: '1.4',
                            } as React.CSSProperties}>
                              {work.title}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ borderBottom: '1px solid var(--border)', marginTop: '16px' }} />
                </div>
              ))}
              {actressWorks.length === 0 && (
                <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--subtext)' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>💔</div>
                  <div style={{ fontSize: '14px' }}>お気に入り女優がいません</div>
                </div>
              )}
            </>
          )}




          {/* ===== おすすめ ===== */}
          {tab === 'recommended' && (
            <RecommendedActresses />
          )}

        </div>
      </main>
    </>
  )
}
