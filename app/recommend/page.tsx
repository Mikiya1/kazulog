'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '../components/Header'
import FavoriteButton from '../components/FavoriteButton'

type Work = {
  content_id: string
  title: string
  affiliateURL: string
  price: string
  imageURL: { large: string; small: string }
  iteminfo?: { actress?: { id: number; name: string }[] }
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
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [sort, setSort] = useState<'rank' | 'date'>('rank')
  const [offset, setOffset] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const HITS = 10

  useEffect(() => {
    if (!selectedActress) return
    setLoading(true)
    setWorks([])
    setOffset(1)
    setHasMore(true)
    fetch(`/api/dmm?actress=${encodeURIComponent(selectedActress.name)}&hits=${HITS}&sort=${sort}&offset=1`)
      .then(r => r.json())
      .then(data => {
        const items = data.result?.items ?? []
        setWorks(items)
        setHasMore(items.length === HITS)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [selectedActress, sort])

  const loadMore = () => {
    if (!selectedActress || loadingMore) return
    const nextOffset = offset + HITS
    setLoadingMore(true)
    fetch(`/api/dmm?actress=${encodeURIComponent(selectedActress.name)}&hits=${HITS}&sort=${sort}&offset=${nextOffset}`)
      .then(r => r.json())
      .then(data => {
        const items = data.result?.items ?? []
        setWorks(prev => [...prev, ...items])
        setOffset(nextOffset)
        setHasMore(items.length === HITS)
        setLoadingMore(false)
      })
      .catch(() => setLoadingMore(false))
  }

  if (likedActresses.length === 0) {
    return (
      <>
        <Header />
        <main style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
          <div style={{ fontSize: '48px' }}>😢</div>
          <p style={{ fontSize: '16px', color: 'var(--subtext)', textAlign: 'center' }}>LIKEした女優がいませんでした</p>
          <button
            onClick={() => router.push('/swipe')}
            style={{ background: 'var(--gradient)', color: '#fff', border: 'none', borderRadius: '50px', padding: '16px 32px', fontSize: '16px', fontWeight: '700', boxShadow: 'var(--shadow-btn)' }}
          >
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

        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '16px' }}>
          気になった女優 💖
        </h2>

        {/* 女優タブ */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {likedActresses.map(actress => (
            <button
              key={actress.id}
              onClick={() => setSelectedActress(actress)}
              style={{
                flexShrink: 0,
                padding: '8px 18px',
                borderRadius: '50px',
                border: selectedActress?.id === actress.id ? 'none' : '1.5px solid var(--border)',
                background: selectedActress?.id === actress.id ? 'var(--gradient)' : 'var(--card)',
                color: selectedActress?.id === actress.id ? '#fff' : 'var(--text)',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: selectedActress?.id === actress.id ? 'var(--shadow-btn)' : '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              {actress.name}
            </button>
          ))}
        </div>

        {/* お気に入りボタン */}
        {selectedActress && (
          <div style={{ marginBottom: '16px' }}>
            <FavoriteButton
              actressId={selectedActress.id}
              actressName={selectedActress.name}
              actressImage={selectedActress.imageUrl ?? ''}
            />
          </div>
        )}

        {/* ソート切り替え */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            onClick={() => setSort('rank')}
            style={{
              padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              background: sort === 'rank' ? '#FD297B' : 'var(--card)',
              color: sort === 'rank' ? '#fff' : 'var(--subtext)',
              border: sort === 'rank' ? 'none' : '1.5px solid var(--border)',
            }}
          >
            人気順
          </button>
          <button
            onClick={() => setSort('date')}
            style={{
              padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              background: sort === 'date' ? '#FD297B' : 'var(--card)',
              color: sort === 'date' ? '#fff' : 'var(--subtext)',
              border: sort === 'date' ? 'none' : '1.5px solid var(--border)',
            }}
          >
            最新順
          </button>
        </div>

        {/* 作品一覧 */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
            <div style={{ fontSize: '24px' }}>🔥</div>
            <span style={{ color: 'var(--subtext)', fontWeight: '600' }}>読み込み中...</span>
          </div>
        ) : works.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--subtext)' }}>
            作品が見つかりませんでした
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
              {works.map((work, i) => (
                <div
                  key={work.content_id}
                  style={{
                    background: 'var(--card)',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: i === 0 ? '0 8px 32px rgba(253,41,123,0.15)' : '0 2px 12px rgba(0,0,0,0.06)',
                    border: i === 0 ? '1.5px solid #FD297B44' : '1.5px solid transparent',
                    position: 'relative',
                  }}
                >
                  {i === 0 && (
                    <div style={{
                      position: 'absolute', top: '12px', left: '12px', zIndex: 2,
                      background: 'var(--gradient)', color: '#fff',
                      fontSize: '10px', padding: '4px 10px', borderRadius: '20px',
                      fontWeight: '700', letterSpacing: '0.5px', boxShadow: 'var(--shadow-btn)',
                    }}>
                      💖 BEST MATCH
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'stretch' }}>
                    <div style={{ width: '100px', minHeight: '130px', position: 'relative', flexShrink: 0 }}>
                      <Image
                        src={work.imageURL?.small ?? ''}
                        alt={work.title}
                        fill
                        style={{ objectFit: 'cover' }}
                        unoptimized
                      />
                    </div>
                    <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', lineHeight: 1.4, color: 'var(--text)', marginTop: i === 0 ? '18px' : 0 }}>
                        {work.title.length > 40 ? work.title.slice(0, 40) + '...' : work.title}
                      </div>
                      <div style={{
                        fontSize: '13px', marginTop: '6px', fontWeight: '700',
                        background: 'var(--gradient)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      } as React.CSSProperties}>
                        {work.price}
                      </div>
                      <button
                        onClick={() => window.open(work.affiliateURL, '_blank')}
                        style={{
                          marginTop: '10px',
                          background: 'var(--gradient)',
                          color: '#fff', border: 'none',
                          borderRadius: '20px', padding: '7px 16px',
                          fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(253,41,123,0.3)',
                        }}
                      >
                        作品を見る →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* もっと見るボタン */}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  width: '100%',
                  background: loadingMore ? 'var(--border)' : 'var(--card)',
                  color: loadingMore ? 'var(--subtext)' : '#FD297B',
                  border: '1.5px solid #FD297B44',
                  borderRadius: '50px',
                  padding: '16px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: loadingMore ? 'not-allowed' : 'pointer',
                  marginBottom: '16px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                }}
              >
                {loadingMore ? '読み込み中...' : 'もっと見る +10'}
              </button>
            )}
          </>
        )}

        <button
          onClick={() => router.push('/swipe')}
          style={{
            width: '100%', background: 'var(--card)',
            color: 'var(--subtext)', border: '1.5px solid var(--border)',
            borderRadius: '50px', padding: '16px',
            fontSize: '15px', fontWeight: '600', cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            marginBottom: '32px',
          }}
        >
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