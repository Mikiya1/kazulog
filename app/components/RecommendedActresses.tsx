'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '../lib/supabase'

type RecommendedActress = {
  id: string
  name: string
  image_url: string
  tags: string[]
  matched_count: number
}

type RecommendedWork = {
  id: string
  title: string
  affiliate_url: string
  image_small: string
  image_large: string
  volume: number | null
  date: string | null
}

export default function RecommendedActresses({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [actresses, setActresses] = useState<RecommendedActress[]>([])
  const [works, setWorks] = useState<RecommendedWork[]>([])
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [preferredTags, setPreferredTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [hasTags, setHasTags] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (!u) { setLoading(false); return }
      loadAll(u.id)
    })
  }, [])

  const loadAll = async (userId: string) => {
    setLoading(true)

    // 好みタグ確認
    const { data: tags } = await supabase
      .from('user_preferred_tags')
      .select('tag_name')
      .eq('user_id', userId)
    
    if (!tags || tags.length === 0) {
      setHasTags(false)
      setLoading(false)
      return
    }
    setPreferredTags(tags.map(t => t.tag_name))

    // お気に入り一覧
    const { data: favs } = await supabase
      .from('favorites')
      .select('actress_id')
      .eq('user_id', userId)
    setFavoriteIds((favs ?? []).map(f => f.actress_id))

    // おすすめ女優
    const { data: actressData } = await supabase.rpc('get_recommended_actresses', {
      p_user_id: userId,
      p_limit: 20,
    })
    setActresses(actressData ?? [])

    // おすすめ作品
    const { data: workData } = await supabase.rpc('get_recommended_works', {
      p_user_id: userId,
      p_limit: 20,
    })
    setWorks(workData ?? [])

    setLoading(false)
  }

  const toggleFavorite = async (actress: RecommendedActress) => {
    if (!user) return
    if (favoriteIds.includes(actress.id)) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('actress_id', actress.id)
      setFavoriteIds(prev => prev.filter(id => id !== actress.id))
    } else {
      await supabase.from('favorites').upsert({
        user_id: user.id, actress_id: actress.id,
        actress_name: actress.name, actress_image: actress.image_url,
      }, { onConflict: 'user_id,actress_id' })
      setFavoriteIds(prev => [...prev, actress.id])
    }
  }

  if (!user) {
    return (
      <div style={{ padding: '20px', background: 'var(--card)', borderRadius: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>✨</div>
        <div style={{ fontSize: '14px', color: 'var(--subtext)' }}>
          ログインしてお気に入り登録すると<br />あなたの好みに合う女優をおすすめします
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--subtext)', fontSize: '13px' }}>
        読み込み中...
      </div>
    )
  }

  if (!hasTags) {
    return (
      <div style={{ padding: '20px', background: 'var(--card)', borderRadius: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏷️</div>
        <div style={{ fontSize: '14px', color: 'var(--subtext)', marginBottom: '12px' }}>
          好みタグを設定するとおすすめが表示されます
        </div>
        <button
          onClick={() => router.push('/favorites/tags')}
          style={{
            background: 'var(--gradient)', color: '#fff', border: 'none',
            borderRadius: '50px', padding: '10px 20px',
            fontSize: '13px', fontWeight: '700', cursor: 'pointer',
            boxShadow: 'var(--shadow-btn)',
          }}
        >
          好みタグを設定する ✨
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* 好み傾向タグ */}
      {preferredTags.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--subtext)', marginBottom: '6px' }}>あなたの好み傾向</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {preferredTags.slice(0, 8).map(tag => (
              <div key={tag} style={{
                fontSize: '11px', fontWeight: '700', padding: '4px 10px',
                background: 'linear-gradient(135deg, #FD297B22, #FF655B11)',
                border: '1px solid rgba(253,41,123,0.25)',
                borderRadius: '20px', color: '#FD297B',
              }}>
                {tag}
              </div>
            ))}
            <button
              onClick={() => router.push('/favorites/tags')}
              style={{
                fontSize: '11px', fontWeight: '700', padding: '4px 10px',
                background: 'none', border: '1px solid var(--border)',
                borderRadius: '20px', color: 'var(--subtext)', cursor: 'pointer',
              }}
            >
              編集 ✏️
            </button>
          </div>
        </div>
      )}

      {/* おすすめ女優 */}
      {actresses.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>おすすめ女優 👩</div>
          <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px' }}>
            {actresses.map(a => (
              <div key={a.id} style={{ flexShrink: 0, width: '90px', textAlign: 'center' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 6px' }}>
                  <div
                    onClick={() => router.push(`/recommend?ids=${a.id}&names=${a.name}&images=${encodeURIComponent(a.image_url)}`)}
                    style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 0 0 2px #FD297B66' }}
                  >
                    <Image src={a.image_url} alt={a.name} width={80} height={80} style={{ objectFit: 'cover', objectPosition: 'top' }} unoptimized />
                  </div>
                  <button
                    onClick={() => toggleFavorite(a)}
                    style={{
                      position: 'absolute', bottom: '-2px', right: '-2px',
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: '#fff', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }}
                  >
                    {favoriteIds.includes(a.id) ? '💖' : '🤍'}
                  </button>
                </div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.name}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--subtext)', marginTop: '2px' }}>
                  {a.matched_count}タグ一致
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* おすすめ作品 */}
      {works.length > 0 && (
        <div>
          <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>おすすめ作品 🎬</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {works.map(w => (
              <div
                key={w.id}
                onClick={() => window.open(w.affiliate_url, '_blank')}
                style={{
                  display: 'flex', gap: '10px', background: 'var(--card)',
                  borderRadius: '12px', overflow: 'hidden', cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ width: '80px', height: '100px', position: 'relative', flexShrink: 0 }}>
                  <Image src={w.image_small || w.image_large || ''} alt={w.title} fill style={{ objectFit: 'cover' }} unoptimized />
                </div>
                <div style={{ flex: 1, padding: '10px 10px 10px 0', minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', lineHeight: 1.4,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                    {w.title}
                  </div>
                  {w.volume && (
                    <div style={{ fontSize: '11px', color: 'var(--subtext)', marginTop: '4px' }}>🕐 {w.volume}分</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
