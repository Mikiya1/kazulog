'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '../components/Header'
import FavoriteButton from '../components/FavoriteButton'
import { supabase } from '../lib/supabase'

type WorkFromDB = {
  id: string; title: string; affiliate_url: string
  image_large: string; image_small: string
  volume: number | null; date: string | null
}

function RecommendContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const idsParam = searchParams.get('ids') ?? ''
  const namesParam = searchParams.get('names') ?? ''
  const imagesParam = searchParams.get('images') ?? ''
  const ids = idsParam ? idsParam.split(',') : []
  const names = namesParam ? namesParam.split(',') : []
  const images = imagesParam ? imagesParam.split(',').map(decodeURIComponent) : []
  const likedActresses = ids.map((id, i) => ({ id, name: names[i] ?? '', imageUrl: images[i] ?? '' }))

  const [selectedActress, setSelectedActress] = useState<{ id: string; name: string; imageUrl: string } | null>(
    likedActresses[0] ?? null
  )
  const [works, setWorks] = useState<WorkFromDB[]>([])
  const [loading, setLoading] = useState(false)
  const [sort, setSort] = useState<'rank' | 'date' | 'rank_solo' | 'date_solo'>('rank')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const HITS = 20

  useEffect(() => {
    if (!selectedActress) return
    setLoading(true)
    setWorks([])
    setOffset(0)
    setHasMore(true)
    const soloOnly = sort === 'rank_solo' || sort === 'date_solo'
    const actualSort = sort === 'rank_solo' ? 'rank' : sort === 'date_solo' ? 'date' : sort
    supabase.rpc('get_works_by_actress', {
      p_actress_id: selectedActress.id,
      p_sort: actualSort,
      p_limit: HITS,
      p_offset: 0,
      p_solo_only: soloOnly,
    }).then(({ data }) => {
      setWorks(data ?? [])
      setHasMore((data ?? []).length === HITS)
      setLoading(false)
    })
  }, [selectedActress, sort])

  const loadMore = () => {
    if (!selectedActress || loading) return
    const nextOffset = offset + HITS
    const soloOnly = sort === 'rank_solo' || sort === 'date_solo'
    const actualSort = sort === 'rank_solo' ? 'rank' : sort === 'date_solo' ? 'date' : sort
    getWorksByActressId(selectedActress.id, actualSort, HITS, nextOffset, soloOnly)
      .then(items => {
        setWorks(prev => [...prev, ...items])
        setOffset(nextOffset)
        setHasMore(items.length === HITS)
      })
  }

  if (likedActresses.length === 0) {
    return (
      <>
        <Header />
        <main style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
          <div style={{ fontSize: '48px' }}>😢</div>
          <p style={{ fontSize: '16px', color: 'var(--subtext)', textAlign: 'center' }}>LIKEした女優がいませんでした</p>
          <button onClick={() => router.push('/swipe')} style={{ background: 'var(--gradient)', color: '#fff', border: 'none', borderRadius: '50px', padding: '16px 32px', fontSize: '16px', fontWeight: '700', boxShadow: 'var(--shadow-btn)', cursor: 'pointer' }}>
            もう一度診断する
          </button>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', padding: '24px 20px', maxWidth: '480px', margin: '0 auto' }}>

        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '16px' }}>気になった女優 💖</h2>

        {/* 女優タブ + お気に入りボタン */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
          {likedActresses.map(actress => (
            <button
              key={actress.id}
              onClick={() => setSelectedActress(actress)}
              style={{
                flexShrink: 0, padding: '8px 18px', borderRadius: '50px',
                border: selectedActress?.id === actress.id ? 'none' : '1.5px solid var(--border)',
                background: selectedActress?.id === actress.id ? 'var(--gradient)' : 'var(--card)',
                color: selectedActress?.id === actress.id ? '#fff' : 'var(--text)',
                fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                boxShadow: selectedActress?.id === actress.id ? 'var(--shadow-btn)' : '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              {actress.name}
            </button>
          ))}
          {selectedActress && (
            <FavoriteButton actressId={selectedActress.id} actressName={selectedActress.name} actressImage={selectedActress.imageUrl ?? ''} />
          )}
        </div>

        {/* ソート切り替え */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {([
            { key: 'rank', label: '人気順' },
            { key: 'date', label: '最新順' },
            { key: 'rank_solo', label: '人気順(単体)' },
            { key: 'date_solo', label: '最新順(単体)' },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setSort(key)} style={{
              padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
              background: sort === key ? '#FD297B' : 'var(--card)',
              color: sort === key ? '#fff' : 'var(--subtext)',
              border: sort === key ? 'none' : '1.5px solid var(--border)',
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* 作品一覧 */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>🔥</div>
            <span style={{ color: 'var(--subtext)', fontWeight: '600' }}>読み込み中...</span>
          </div>
        ) : works.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--subtext)' }}>作品が見つかりませんでした</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {works.map((work, i) => (
                <div key={work.id} style={{
                  background: 'var(--card)', borderRadius: '20px', overflow: 'hidden',
                  boxShadow: i === 0 ? '0 8px 32px rgba(253,41,123,0.15)' : '0 2px 12px rgba(0,0,0,0.06)',
                  border: i === 0 ? '1.5px solid #FD297B44' : '1.5px solid transparent',
                  position: 'relative',
                }}>
                  {i === 0 && (
                    <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 2, background: 'var(--gradient)', color: '#fff', fontSize: '10px', padding: '4px 10px', borderRadius: '20px', fontWeight: '700', boxShadow: 'var(--shadow-btn)' }}>
                      💖 BEST MATCH
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'stretch' }}>
                    <div style={{ width: '80px', minHeight: '100px', position: 'relative', flexShrink: 0 }}>
                      <Image src={work.image_small || work.image_large || ''} alt={work.title} fill style={{ objectFit: 'cover' }} unoptimized />
                    </div>
                    <div style={{ flex: 1, padding: '10px 12px', minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', lineHeight: 1.4, color: 'var(--text)', marginTop: 0 }}>
                        {work.title.length > 30 ? work.title.slice(0, 30) + '...' : work.title}
                      </div>

                      {work.actresses.length > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--subtext)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          👩 {work.actresses.map(a => a.name).join(' / ')}
                        </div>
                      )}
                      {work.volume && (
                        <div style={{ fontSize: '11px', color: 'var(--subtext)', marginTop: '2px' }}>{work.date ? `📅 ${new Date(work.date).toLocaleDateString('ja-JP', {year: 'numeric', month: 'numeric', day: 'numeric'})}発売` : ''}　{work.volume ? `🕐 ${work.volume}分` : ''}</div>
                      )}
                      <button onClick={() => window.open(work.affiliate_url, '_blank')} style={{ marginTop: '10px', background: 'var(--gradient)', color: '#fff', border: 'none', borderRadius: '20px', padding: '7px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(253,41,123,0.3)' }}>
                        作品を見る →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <button onClick={loadMore} style={{ width: '100%', background: 'var(--card)', color: '#FD297B', border: '1.5px solid #FD297B44', borderRadius: '50px', padding: '16px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginBottom: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                もっと見る +{HITS}
              </button>
            )}
          </>
        )}

        <button onClick={() => router.push('/swipe')} style={{ width: '100%', background: 'var(--card)', color: 'var(--subtext)', border: '1.5px solid var(--border)', borderRadius: '50px', padding: '16px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '32px' }}>
          もう一度診断する 🔄
        </button>

      </main>
    </>
  )
}

export default function RecommendPage() {
  return (
    <Suspense>
      <RecommendContent />
    </Suspense>
  )
}
