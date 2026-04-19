'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '../../../components/Header'
import { supabase } from '../../../lib/supabase'

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
}

type ActressWorks = {
  actress: Favorite
  works: Work[]
  loading: boolean
  error: boolean
}

const HITS = 30

export default function NewWorksByActressPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [actressWorks, setActressWorks] = useState<ActressWorks[]>([])
  const [pageLoading, setPageLoading] = useState(true)
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
          const favs = data ?? []
          setFavorites(favs)
          setActressWorks(favs.map(a => ({ actress: a, works: [], loading: true, error: false })))
          setPageLoading(false)
        })
    })
  }, [])

  useEffect(() => {
    if (favorites.length === 0) return
    favorites.forEach((fav, i) => {
      fetch(`/api/dmm?actress=${encodeURIComponent(fav.actress_name)}&hits=${HITS}&sort=date&offset=1`)
        .then(r => r.json())
        .then(data => {
          setActressWorks(prev => prev.map((aw, j) =>
            j === i ? { ...aw, works: data.result?.items ?? [], loading: false } : aw
          ))
        })
        .catch(() => {
          setActressWorks(prev => prev.map((aw, j) =>
            j === i ? { ...aw, loading: false, error: true } : aw
          ))
        })
    })
  }, [favorites])

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '0', color: 'var(--text)' }}>
            ←
          </button>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>女優別 最新作 💖</h2>
            <div style={{ fontSize: '12px', color: 'var(--subtext)', marginTop: '2px' }}>
              お気に入り {favorites.length}人 · 各{HITS}件
            </div>
          </div>
        </div>

        {actressWorks.map(({ actress, works, loading, error }) => (
          <div key={actress.actress_id} style={{ marginBottom: '32px' }}>

            {/* 女優ヘッダー */}
            <div
              onClick={() => router.push(`/recommend?ids=${actress.actress_id}&names=${actress.actress_name}&images=${encodeURIComponent(actress.actress_image)}`)}
              style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', cursor: 'pointer' }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, boxShadow: '0 0 0 2px #FD297B44' }}>
                {actress.actress_image ? (
                  <Image src={actress.actress_image} alt={actress.actress_name} width={44} height={44} style={{ objectFit: 'cover', objectPosition: 'top' }} unoptimized />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: '#f8f0f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👩</div>
                )}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '700' }}>{actress.actress_name}</div>
                <div style={{ fontSize: '12px', color: '#FD297B', fontWeight: '600' }}>
                  {loading ? '取得中...' : `${works.length}件 · 全作品を見る →`}
                </div>
              </div>
            </div>

            {/* 作品横スクロール */}
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

      </main>
    </>
  )
}
