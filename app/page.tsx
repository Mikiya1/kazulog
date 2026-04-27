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

type Newcomer = {
  id: string
  name: string
  image_url: string
  debut_year: number
  popular_rank: number | null
  work_count: number
  first_work_date: string | null
}

type Work = {
  id: string
  title: string
  affiliate_url: string
  image_small: string
  image_large: string
  volume: number | null
  date: string | null
  actress_name?: string
}

const RankCard = ({ work, rank, onClick }: { work: Work; rank: number; onClick: () => void }) => (
  <div onClick={onClick} style={{ display: 'flex', gap: '10px', background: 'var(--card)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
    <div style={{ width: '28px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: rank <= 3 ? 'var(--gradient)' : 'var(--border)', color: rank <= 3 ? '#fff' : 'var(--subtext)', fontWeight: '800', fontSize: '13px' }}>
      {rank}
    </div>
    <div style={{ width: '60px', height: '80px', position: 'relative', flexShrink: 0 }}>
      <Image src={work.image_small || work.image_large} alt={work.title} fill style={{ objectFit: 'cover' }} unoptimized />
    </div>
    <div style={{ flex: 1, padding: '10px 10px 10px 0', minWidth: 0 }}>
      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
        {work.title}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--subtext)', marginTop: '4px' }}>{work.date ? `📅 ${new Date(work.date).toLocaleDateString('ja-JP', {year: 'numeric', month: 'numeric', day: 'numeric'})}発売　` : ''}{work.volume ? `🕐 ${work.volume}分` : ''}</div>
    </div>
  </div>
)

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [weeklyWorks, setWeeklyWorks] = useState<Work[]>([])
  const [monthlyWorks, setMonthlyWorks] = useState<Work[]>([])
  const [newWorks, setNewWorks] = useState<Work[]>([])
  const [storyFavorites, setStoryFavorites] = useState<Favorite[]>([])
  const [showAllWeekly, setShowAllWeekly] = useState(false)
  const [showAllMonthly, setShowAllMonthly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [seenActresses, setSeenActresses] = useState<string[]>([])
  const [newWorkActresses, setNewWorkActresses] = useState<Set<string>>(new Set())
  const [newcomers, setNewcomers] = useState<Newcomer[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const u = session?.user ?? null
      setUser(u)

      const [weeklyRes, monthlyRes, favsRes, activeRes, newcomerRes] = await Promise.all([
        supabase.rpc('get_ranking_works', { p_sort: 'weekly', p_limit: 10 }),
        supabase.rpc('get_ranking_works', { p_sort: 'monthly', p_limit: 10 }),
        u ? supabase.from('favorites').select('actress_id, actress_name, actress_image').eq('user_id', u.id).limit(20) : Promise.resolve({ data: [] }),
        u ? supabase.rpc('get_active_favorites', { p_user_id: u.id, p_months: 3 }) : Promise.resolve({ data: [] }),
        supabase.rpc('get_rising_newcomers', { p_limit: 10 }),
      ])

      setWeeklyWorks(weeklyRes.data ?? [])
      setMonthlyWorks(monthlyRes.data ?? [])
      const favs = (favsRes.data ?? []) as Favorite[]
      setFavorites(favs)
      setNewcomers(newcomerRes.data ?? [])
      // ストーリー用：直近3ヶ月に新作がある女優だけ
      // storyFavoritesはactiveResのデータをそのまま使う（最新のimageURLを保証）
      const activeFavs = (activeRes.data ?? []).map((f: any) => ({
        actress_id: f.actress_id,
        actress_name: f.actress_name,
        actress_image: f.actress_image,
      }))
      setStoryFavorites(activeFavs)

      // お気に入り女優の最新作を取得（女優ごとに1件ずつ）
      if (favs.length > 0) {
        const actressIds = favs.map(f => f.actress_id)
        const { data: newWorksData } = await supabase.rpc('get_favorite_latest_works', {
          p_actress_ids: actressIds,
          p_limit: 20,
        })
        const favNameMap = new Map(favs.map(f => [f.actress_id, f.actress_name]))
        const sorted = [...(newWorksData ?? [])].sort((a: any, b: any) => {
          if (!a.date) return 1
          if (!b.date) return -1
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        })
        setNewWorks(sorted.map((w: any) => ({
          ...w,
          actress_name: favNameMap.get(w.actress_id) ?? '',
        })))
      }

      setLoading(false)
    }
    load()
    // 既読女優を取得
    try {
      const raw = localStorage.getItem('kazulog_story_seen')
      if (raw) {
        const data = JSON.parse(raw)
        const now = Date.now()
        const filtered = data.filter((d: any) => now - d.ts < 86400000)
        const seenIds = filtered.map((d: any) => d.id as string)
        setSeenActresses(seenIds)

        // 既読女優の中で新作が出てるか確認
        if (seenIds.length > 0) {
          const { data: latestWorks } = await supabase
            .from('actress_latest_works')
            .select('actress_id, latest_work_date')
            .in('actress_id', seenIds)

          const newSet = new Set<string>()
          ;(latestWorks ?? []).forEach((lw: any) => {
            const seenEntry = data.find((d: any) => d.id === lw.actress_id)
            if (seenEntry && new Date(lw.latest_work_date).getTime() > seenEntry.ts) {
              newSet.add(lw.actress_id)
            }
          })
          setNewWorkActresses(newSet)
        }
      }
    } catch {}
  }, [])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  }

  return (
    <>
      <Header />
      <main style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', maxWidth: '480px', margin: '0 auto', padding: '0 0 80px' }}>

        {/* ストーリー */}
        <div style={{ padding: '16px 0 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ overflowX: 'auto', display: 'flex', gap: '12px', padding: '4px 16px 4px' }}>
            <div style={{ flexShrink: 0, textAlign: 'center', width: '68px' }}>
              <div onClick={() => router.push('/actresses')} style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--card)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '0 auto 4px', fontSize: '24px' }}>+</div>
              <div style={{ fontSize: '10px', color: 'var(--subtext)', fontWeight: '600' }}>追加</div>
            </div>
            {!loading && storyFavorites.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', color: 'var(--subtext)', fontSize: '12px' }}>お気に入り女優を追加するとここに表示されます</div>
            )}
            {[...storyFavorites].sort((a, b) => {
              const aSeen = seenActresses.includes(a.actress_id)
              const bSeen = seenActresses.includes(b.actress_id)
              if (aSeen && !bSeen) return 1
              if (!aSeen && bSeen) return -1
              return 0
            }).map((fav, idx) => (
              <div key={fav.actress_id} style={{ flexShrink: 0, textAlign: 'center', width: '68px' }}>
                <div
                  onClick={() => router.push(`/story?index=${storyFavorites.findIndex(f => f.actress_id === fav.actress_id)}&ids=${storyFavorites.map(f => f.actress_id).join(',')}&names=${storyFavorites.map(f => encodeURIComponent(f.actress_name)).join(',')}&images=${storyFavorites.map(f => encodeURIComponent(f.actress_image)).join(',')}`)}
                  style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', margin: '0 auto 4px', boxShadow: 
                    seenActresses.includes(fav.actress_id) && !newWorkActresses.has(fav.actress_id)
                      ? '0 0 0 2.5px #ccc, 0 0 0 4px white'
                      : '0 0 0 2.5px #FD297B, 0 0 0 4px white'
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

          {/* 今週の売れ筋 */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800' }}>🔥 今週の売れ筋 TOP10</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loading ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ height: '80px', background: 'var(--card)', borderRadius: '12px', opacity: 0.5 }} />
              )) : (showAllWeekly ? weeklyWorks : weeklyWorks.slice(0, 3)).map((w, i) => (
                <RankCard key={w.id} work={w} rank={i + 1} onClick={() => window.open(w.affiliate_url, '_blank')} />
              ))}
            </div>
            {!loading && weeklyWorks.length > 3 && (
              <button onClick={() => setShowAllWeekly(v => !v)} style={{ width: '100%', marginTop: '10px', background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: '50px', padding: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', color: 'var(--subtext)' }}>
                {showAllWeekly ? '▲ 閉じる' : `▼ もっと見る（残り${weeklyWorks.length - 3}件）`}
              </button>
            )}
          </div>

          {/* 今月の売れ筋 */}
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800' }}>📅 今月の売れ筋 TOP10</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loading ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ height: '80px', background: 'var(--card)', borderRadius: '12px', opacity: 0.5 }} />
              )) : (showAllMonthly ? monthlyWorks : monthlyWorks.slice(0, 3)).map((w, i) => (
                <RankCard key={w.id} work={w} rank={i + 1} onClick={() => window.open(w.affiliate_url, '_blank')} />
              ))}
            </div>
            {!loading && monthlyWorks.length > 3 && (
              <button onClick={() => setShowAllMonthly(v => !v)} style={{ width: '100%', marginTop: '10px', background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: '50px', padding: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', color: 'var(--subtext)' }}>
                {showAllMonthly ? '▲ 閉じる' : `▼ もっと見る（残り${monthlyWorks.length - 3}件）`}
              </button>
            )}
          </div>

          {/* 注目の新人 */}
          {newcomers.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '14px' }}>🌟 注目の新人</div>
              <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                {newcomers.map((a, i) => (
                  <div
                    key={a.id}
                    onClick={() => router.push(`/recommend?ids=${a.id}&names=${a.name}&images=${encodeURIComponent(a.image_url)}`)}
                    style={{ flexShrink: 0, width: '80px', textAlign: 'center', cursor: 'pointer' }}
                  >
                    <div style={{ position: 'relative', width: '72px', height: '72px', margin: '0 auto 6px' }}>
                      <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', boxShadow: i < 2 ? '0 0 0 2.5px #FFD700, 0 0 0 4px white' : '0 0 0 2px #FD297B44' }}>
                        <Image src={a.image_url.replace('/thumbnail/', '/')} alt={a.name} width={72} height={72} style={{ objectFit: 'cover', objectPosition: 'top' }} unoptimized />
                      </div>
                      {i < 2 && (
                        <div style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#FFD700', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>
                          🏆
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.name.split('（')[0]}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--subtext)', marginTop: '2px' }}>
                      {a.first_work_date ? `${new Date(a.first_work_date).getFullYear()}年${new Date(a.first_work_date).getMonth()+1}月デビュー` : `${a.debut_year}年デビュー`}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => router.push('/newcomers')}
                style={{ width: '100%', marginTop: '10px', background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: '50px', padding: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', color: 'var(--subtext)' }}
              >
                新人一覧を見る →
              </button>
            </div>
          )}

          {/* お気に入り女優の最新作 */}
          {newWorks.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', marginBottom: '14px' }}>💖 お気に入り女優の最新作</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {newWorks.map(w => (
                  <div key={w.id} onClick={() => window.open(w.affiliate_url, '_blank')} style={{ display: 'flex', gap: '10px', background: 'var(--card)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <div style={{ width: '60px', height: '80px', position: 'relative', flexShrink: 0 }}>
                      <Image src={w.image_small || w.image_large} alt={w.title} fill style={{ objectFit: 'cover' }} unoptimized />
                    </div>
                    <div style={{ flex: 1, padding: '10px 10px 10px 0', minWidth: 0 }}>
                      <div style={{ fontSize: '11px', color: '#FD297B', fontWeight: '700', marginBottom: '2px' }}>
                        {w.actress_name?.split('（')[0]}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                        {w.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--subtext)', marginTop: '4px' }}>
                        {w.date && <span>📅 {formatDate(w.date)}</span>}
                        {w.date && <span>📅 {new Date(w.date).toLocaleDateString('ja-JP', {year: 'numeric', month: 'numeric', day: 'numeric'})}発売　</span>}{w.volume && <span>🕐 {w.volume}分</span>}
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => router.push('/favorites?tab=timeline')} style={{ width: '100%', background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: '50px', padding: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', color: 'var(--subtext)' }}>
                  もっと見る →
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  )
}
