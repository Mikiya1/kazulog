'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from './components/Header'
import { supabase } from './lib/supabase'
import { useState, useEffect } from 'react'

const POPULAR_ACTRESSES = [
  { id: '1044864', name: '河北彩伽', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/kawakita_saika.jpg' },
  { id: '1088602', name: '逢沢みゆ', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/aizawa_miyu.jpg' },
  { id: '1092427', name: '北岡果林', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/kitaoka_karin.jpg' },
  { id: '1099472', name: '瀬戸環奈', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/seto_kanna.jpg' },
  { id: '1065724', name: '乙アリス', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/otu_arisu.jpg' },
  { id: '1044099', name: '美園和花', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/misono_waka.jpg' },
]

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (!u) return
      supabase
        .from('favorites')
        .select('actress_id')
        .eq('user_id', u.id)
        .then(({ data }) => {
          setFavoriteIds(data?.map(f => f.actress_id) ?? [])
        })
    })
  }, [])

  const toggleFavorite = async (actress: typeof POPULAR_ACTRESSES[0]) => {
    if (!user) {
      alert('お気に入りにはGoogleログインが必要です')
      return
    }
    if (favoriteIds.includes(actress.id)) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('actress_id', actress.id)
      setFavoriteIds(prev => prev.filter(id => id !== actress.id))
    } else {
      await supabase.from('favorites').upsert({
        user_id: user.id,
        actress_id: actress.id,
        actress_name: actress.name,
        actress_image: actress.imageUrl,
      }, { onConflict: 'user_id,actress_id' })
      setFavoriteIds(prev => [...prev, actress.id])
    }
  }

  return (
    <>
      <Header />
      <main style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', maxWidth: '480px', margin: '0 auto', padding: '0 0 48px' }}>

        {/* ヒーローカード */}
        <div style={{ padding: '24px 20px 16px' }}>
          <div style={{
            background: 'var(--card)',
            borderRadius: '24px',
            padding: '32px 24px',
            boxShadow: 'var(--shadow-card)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', background: 'linear-gradient(135deg, #FD297B22, #FF655B11)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '-20px', left: '-20px', width: '100px', height: '100px', background: 'linear-gradient(135deg, #FF655B11, #FD297B22)', borderRadius: '50%' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #FD297B15, #FF655B10)', border: '1px solid #FD297B33', borderRadius: '20px', padding: '4px 12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#FD297B', letterSpacing: '0.5px' }}>✨ AI診断</span>
              </div>
              <div style={{ fontSize: '26px', fontWeight: '800', lineHeight: 1.3, marginBottom: '8px', color: 'var(--text)' }}>
                スワイプして<br />好みを見つけよう
              </div>
              <div style={{ fontSize: '13px', color: 'var(--subtext)', marginBottom: '24px', lineHeight: 1.6 }}>
                3タップで見つかる、あなただけの一本
              </div>
              <button
                onClick={() => router.push('/swipe')}
                style={{ background: 'var(--gradient)', color: '#fff', border: 'none', borderRadius: '50px', padding: '16px 36px', fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-btn)' }}
              >
                診断スタート <span style={{ fontSize: '18px' }}>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* 人気女優 */}
        <div style={{ padding: '8px 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px 12px' }}>
            <div style={{ fontSize: '11px', color: 'var(--subtext)', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>
              人気女優
            </div>
            <button
              onClick={() => router.push('/actresses')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: '600', color: '#FD297B',
              }}
            >
              もっと見る →
            </button>
          </div>
          <div style={{ display: 'flex', gap: '14px', padding: '0 20px', overflowX: 'auto' }}>
            {POPULAR_ACTRESSES.filter(a => !favoriteIds.includes(a.id)).map(a => (
              <div key={a.id} style={{ flexShrink: 0, width: '80px', textAlign: 'center' }}>
                <div style={{ position: 'relative', width: '72px', height: '72px', margin: '0 auto 8px' }}>
                  <div
                    onClick={() => router.push(`/recommend?ids=${a.id}&names=${a.name}&images=${encodeURIComponent(a.imageUrl)}`)}
                    style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 0 0 2px #FD297B44' }}
                  >
                    <Image src={a.imageUrl} alt={a.name} width={72} height={72} style={{ objectFit: 'cover', objectPosition: 'top' }} unoptimized />
                  </div>
                  {/* お気に入りボタン */}
                  <button
                    onClick={() => toggleFavorite(a)}
                    style={{
                      position: 'absolute', bottom: '-2px', right: '-2px',
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: '#fff', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }}
                  >
                    {favoriteIds.includes(a.id) ? '💖' : '🤍'}
                  </button>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 使い方 */}
        <div style={{ padding: '28px 20px 0' }}>
          <div style={{ fontSize: '11px', color: 'var(--subtext)', marginBottom: '14px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>使い方</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { step: '01', text: '女優をスワイプして好みを選ぶ', icon: '💖' },
              { step: '02', text: 'AIがあなたの好みを分析', icon: '🤖' },
              { step: '03', text: 'ぴったりの作品が見つかる', icon: '🎬' },
            ].map(item => (
              <div key={item.step} style={{ background: 'var(--card)', borderRadius: '16px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '24px', flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#FD297B', marginBottom: '2px', letterSpacing: '0.5px' }}>STEP {item.step}</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </>
  )
}