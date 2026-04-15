'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'

type Favorite = {
  id: string
  actress_id: string
  actress_name: string
  actress_image: string
}

export default function FavoritesPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (!u) {
        setLoading(false)
        return
      }
      supabase
        .from('favorites')
        .select('*')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setFavorites(data ?? [])
          setLoading(false)
        })
    })
  }, [])

  if (loading) {
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
          <button
            onClick={() => router.push('/')}
            style={{ background: 'var(--gradient)', color: '#fff', border: 'none', borderRadius: '50px', padding: '16px 32px', fontSize: '16px', fontWeight: '700', boxShadow: 'var(--shadow-btn)' }}
          >
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
          <p style={{ fontSize: '16px', color: 'var(--subtext)', textAlign: 'center' }}>お気に入りがまだありません</p>
          <button
            onClick={() => router.push('/swipe')}
            style={{ background: 'var(--gradient)', color: '#fff', border: 'none', borderRadius: '50px', padding: '16px 32px', fontSize: '16px', fontWeight: '700', boxShadow: 'var(--shadow-btn)' }}
          >
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

        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '20px' }}>
          お気に入り 💖
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '32px' }}>
          {favorites.map(fav => (
            <div
              key={fav.id}
              onClick={() => router.push(`/recommend?ids=${fav.actress_id}&names=${fav.actress_name}`)}
              style={{
                background: 'var(--card)',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                cursor: 'pointer',
              }}
            >
              <div style={{ height: '160px', position: 'relative', background: '#f8f0f4' }}>
                {fav.actress_image ? (
                    <Image
                    src={fav.actress_image}
                    alt={fav.actress_name}
                    fill
                    style={{ objectFit: 'contain', objectPosition: 'center' }}
                    unoptimized
                    />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>👩</div>
                )}
                </div>
              <div style={{ padding: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text)' }}>
                  {fav.actress_name}
                </div>
                <div style={{
                  fontSize: '12px', marginTop: '4px', fontWeight: '600',
                  background: 'var(--gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                } as React.CSSProperties}>
                  作品を見る →
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/swipe')}
          style={{
            width: '100%', background: 'var(--card)',
            color: 'var(--subtext)', border: '1.5px solid var(--border)',
            borderRadius: '50px', padding: '16px',
            fontSize: '15px', fontWeight: '600', cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          診断する 🔥
        </button>

      </main>
    </>
  )
}