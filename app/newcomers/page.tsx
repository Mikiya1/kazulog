'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'

type Newcomer = {
  id: string
  name: string
  image_url: string
  debut_year: number
  popular_rank: number | null
  work_count: number
  first_work_date: string | null
}

export default function NewcomersPage() {
  const router = useRouter()
  const [newcomers, setNewcomers] = useState<Newcomer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.rpc('get_rising_newcomers', { p_limit: 10 }).then(({ data }) => {
      setNewcomers(data ?? [])
      setLoading(false)
    })
  }, [])

  return (
    <>
      <Header />
      <main style={{ background: 'var(--bg)', minHeight: '100vh', maxWidth: '480px', margin: '0 auto', padding: '20px 16px 80px' }}>
        <div style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>🌟 注目の新人</div>
        <div style={{ fontSize: '13px', color: 'var(--subtext)', marginBottom: '20px' }}>直近3ヶ月で活躍中の新人女優TOP10</div>

        {loading ? (
          <div style={{ color: 'var(--subtext)', textAlign: 'center', padding: '40px' }}>読み込み中...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {newcomers.map((a, i) => (
              <div
                key={a.id}
                onClick={() => router.push(`/recommend?ids=${a.id}&names=${a.name}&images=${encodeURIComponent(a.image_url)}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--card)', borderRadius: '16px', padding: '12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              >
                {/* 順位 */}
                <div style={{ width: '28px', textAlign: 'center', fontWeight: '800', fontSize: i < 3 ? '20px' : '16px', color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--subtext)', flexShrink: 0 }}>
                  {i < 3 ? ['🥇','🥈','🥉'][i] : `${i + 1}`}
                </div>

                {/* 顔写真 */}
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, boxShadow: i < 2 ? '0 0 0 2px #FFD700' : '0 0 0 2px #FD297B44' }}>
                  <Image src={a.image_url.replace('/thumbnail/', '/')} alt={a.name} width={60} height={60} style={{ objectFit: 'cover', objectPosition: 'top' }} unoptimized />
                </div>

                {/* 情報 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.name.split('（')[0]}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--subtext)', marginTop: '2px' }}>
                    📅 {a.first_work_date ? `${new Date(a.first_work_date).getFullYear()}年${new Date(a.first_work_date).getMonth()+1}月デビュー` : `${a.debut_year}年デビュー`}
                    {a.popular_rank && <span style={{ marginLeft: '8px', color: '#FD297B', fontWeight: '700' }}>🏆 月間{a.popular_rank}位</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--subtext)', marginTop: '2px' }}>
                    🎬 直近3ヶ月で{a.work_count}作品
                  </div>
                </div>

                <div style={{ fontSize: '16px', color: 'var(--subtext)' }}>›</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
