'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from './components/Header'
import { supabase } from './lib/supabase'
import { useState, useEffect } from 'react'

type Favorite = {
  actress_id: string
  actress_name: string
  actress_image: string
}

type Work = {
  id: string
  title: string
  affiliate_url: string
  image_small: string
  image_large: string
  volume: number | null
  date: string | null
}

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [weeklyWorks, setWeeklyWorks] = useState<Work[]>([])
  const [monthlyWorks, setMonthlyWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const u = session?.user ?? null
      setUser(u)

      const [weeklyRes, monthlyRes, favsRes] = await Promise.all([
        supabase.rpc('get_ranking_works', { p_sort: 'weekly', p_limit: 10 }),
        supabase.rpc('get_ranking_works', { p_sort: 'monthly', p_limit: 10 }),
        u ? supabase.from('favorites').select('actress_id, actress_name, actress_image').eq('user_id', u.id).limit(20) : Promise.resolve({ data: [] }),
      ])

      setWeeklyWorks(weeklyRes.data ?? [])
      setMonthlyWorks(monthlyRes.data ?? [])
      setFavorites((favsRes.data ?? []) as Favorite[])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <Header />
      <main style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', maxWidth: '480px', margin: '0 auto', padding: '0 0 80px' }}>

        {/* ストーリー */}
        <div style={{ padding: '16px 0 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ overflowX: 'auto', display: 'flex', gap: '12px', padding: '0 16px' }}>

            {/* 新規追加ボタン */}
            <div style={{ flexShrink: 0, textAlign: 'center', width: '68px' }}>
              <div
                onClick={() => router.push('/actresses')}
                style={{
                  width: '60px', height: '60px', borderRadius: '50%',
                  background: 'var(--card)', border: '2px dashed var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', margin: '0 auto 4px', fontSize: '24px',
                }}
              >
                +
              </div>
              <div style={{ fontSize: '10px', color: 'var(--subtext)', fontWeight: '600' }}>追加</div>
            </div>

            {/* お気に入り女優ストーリー */}
            {favorites.length === 0 && !loading && (
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--subtext)', fontSize: '12px', paddingRight: '16px' }}>
                お気に入り女優を追加するとここに表示されます
              </div>
            )}
            {favorites.map((fav, idx) => (
              <div key={fav.actress_id} style={{ flexShrink: 0, textAlign: 'center', width: '68px' }}>
                <div
                  onClick={() => router.push(`/story?index=${idx}&ids=${favorites.map(f => f.actress_id).join(',')}&names=${favorites.map(f => encodeURIComponent(f.actress_name)).join(',')}&images=${favorites.map(f => encodeURIComponent(f.actress_image)).join(',')}`)}
                  style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    overflow: 'hidden', cursor: 'pointer', margin: '0 auto 4px',
                    boxShadow: '0 0 0 2.5px #FD297B, 0 0 0 4px white',
                  }}
                >
                  {fav.actress_image ? (
                    <Image src={fav.actress_image} alt={fav.actress_name} width={60} height={60} style={{ objectFit: 'cover', objectPosition: 'top' }} unoptimized />
                  ) : (
                    <div style={{ width: '60px', height: '60px', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👩</div>
                  )}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text)', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fav.actress_name.split('（')[0]}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '20px 16px 0' }}>

          {/* 今週の売れ筋TOP10 */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800' }}>🔥 今週の売れ筋</div>
              <div style={{ fontSize: '12px', color: 'var(--subtext)', fontWeight: '600' }}>TOP10</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ height: '80px', background: 'var(--card)', borderRadius: '12px', opacity: 0.5 }} />
                ))
              ) : weeklyWorks.map((w, i) => (
                <div
                  key={w.id}
                  onClick={() => window.open(w.affiliate_url, '_blank')}
                  style={{ display: 'flex', gap: '10px', background: 'var(--card)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                >
                  <div style={{ width: '28px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i < 3 ? 'var(--gradient)' : 'var(--border)', color: i < 3 ? '#fff' : 'var(--subtext)', fontWeight: '800', fontSize: '13px' }}>
                    {i + 1}
                  </div>
                  <div style={{ width: '60px', height: '80px', position: 'relative', flexShrink: 0 }}>
                    <Image src={w.image_small || w.image_large} alt={w.title} fill style={{ objectFit: 'cover' }} unoptimized />
                  </div>
                  <div style={{ flex: 1, padding: '10px 10px 10px 0', minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                      {w.title}
                    </div>
                    {w.volume && <div style={{ fontSize: '11px', color: 'var(--subtext)', marginTop: '4px' }}>🕐 {w.volume}分</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 今月の売れ筋TOP10 */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800' }}>📅 今月の売れ筋</div>
              <div style={{ fontSize: '12px', color: 'var(--subtext)', fontWeight: '600' }}>TOP10</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ height: '80px', background: 'var(--card)', borderRadius: '12px', opacity: 0.5 }} />
                ))
              ) : monthlyWorks.map((w, i) => (
                <div
                  key={w.id}
                  onClick={() => window.open(w.affiliate_url, '_blank')}
                  style={{ display: 'flex', gap: '10px', background: 'var(--card)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                >
                  <div style={{ width: '28px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i < 3 ? 'var(--gradient)' : 'var(--border)', color: i < 3 ? '#fff' : 'var(--subtext)', fontWeight: '800', fontSize: '13px' }}>
                    {i + 1}
                  </div>
                  <div style={{ width: '60px', height: '80px', position: 'relative', flexShrink: 0 }}>
                    <Image src={w.image_small || w.image_large} alt={w.title} fill style={{ objectFit: 'cover' }} unoptimized />
                  </div>
                  <div style={{ flex: 1, padding: '10px 10px 10px 0', minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                      {w.title}
                    </div>
                    {w.volume && <div style={{ fontSize: '11px', color: 'var(--subtext)', marginTop: '4px' }}>🕐 {w.volume}分</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </>
  )
}
