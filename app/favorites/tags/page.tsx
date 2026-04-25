'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '../../components/Header'
import { supabase } from '../../lib/supabase'

type PreferredTag = {
  id: string
  tag_name: string
  score: number
  is_manual: boolean
}

const POPULAR_GENRES: { category: string; genres: { id: string; name: string }[] }[] = [
  {
    category: '体型・外見',
    genres: [
      { id: '2001', name: '巨乳' }, { id: '6149', name: '超乳' }, { id: '102', name: '美乳' },
      { id: '2005', name: '貧乳・微乳' }, { id: '2006', name: 'スレンダー' }, { id: '2007', name: 'ぽっちゃり' },
      { id: '2008', name: 'ミニ系' }, { id: '2024', name: '巨尻' }, { id: '4008', name: '脚フェチ' },
      { id: '1027', name: '美少女' }, { id: '2003', name: '小柄' }, { id: '2002', name: '長身' },
      { id: '2004', name: 'めがね' }, { id: '4019', name: 'パイパン' },
    ],
  },
  {
    category: 'キャラクター',
    genres: [
      { id: '4024', name: '素人' }, { id: '1039', name: '人妻・主婦' }, { id: '1014', name: '熟女' },
      { id: '1031', name: '痴女' }, { id: '1034', name: 'ギャル' }, { id: '4118', name: 'アイドル・芸能人' },
      { id: '1001', name: 'OL' }, { id: '1013', name: '看護婦・ナース' }, { id: '1016', name: '女教師' },
      { id: '1033', name: 'お姉さん' }, { id: '4057', name: '姉・妹' }, { id: '1032', name: 'お母さん' },
      { id: '1019', name: '女子大生' }, { id: '6967', name: 'M女' },
    ],
  },
  {
    category: 'プレイ',
    genres: [
      { id: '5001', name: '中出し' }, { id: '5016', name: '潮吹き' }, { id: '5023', name: '顔射' },
      { id: '5002', name: 'フェラ' }, { id: '5068', name: 'イラマチオ' }, { id: '5019', name: 'パイズリ' },
      { id: '38', name: 'クンニ' }, { id: '6002', name: 'ハメ撮り' }, { id: '5008', name: 'オナニー' },
      { id: '5017', name: 'おもちゃ' }, { id: '4001', name: 'SM' }, { id: '25', name: '拘束' },
      { id: '4059', name: 'キス・接吻' }, { id: '5063', name: '主観' }, { id: '5005', name: 'アナル' },
    ],
  },
  {
    category: '体位・行為',
    genres: [
      { id: '4106', name: '騎乗位' }, { id: '6958', name: 'バック' }, { id: '5067', name: '顔面騎乗' },
      { id: '5022', name: '3P・4P' }, { id: '4005', name: '乱交' }, { id: '5071', name: 'ハーレム' },
      { id: '4111', name: '寝取り・NTR' },
    ],
  },
  {
    category: 'シチュエーション',
    genres: [
      { id: '4025', name: '単体作品' }, { id: '4021', name: '盗撮・のぞき' }, { id: '1069', name: '不倫' },
      { id: '4031', name: 'コスプレ' }, { id: '553', name: '学園もの' }, { id: '4002', name: '近親相姦' },
      { id: '55', name: '処女' }, { id: '28', name: '羞恥' }, { id: '5010', name: '監禁' },
    ],
  },
  {
    category: 'コスチューム',
    genres: [
      { id: '3008', name: '水着' }, { id: '48', name: '制服' }, { id: '3006', name: 'パンスト・タイツ' },
      { id: '3007', name: 'ミニスカ' }, { id: '3014', name: 'ランジェリー' }, { id: '3021', name: '和服・浴衣' },
    ],
  },
]

export default function PreferredTagsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [preferredTags, setPreferredTags] = useState<PreferredTag[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) loadTags(u.id)
      else setLoading(false)
    })
  }, [])

  const loadTags = async (userId: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('user_preferred_tags')
      .select('*')
      .eq('user_id', userId)
      .order('score', { ascending: false })
    setPreferredTags(data ?? [])
    setLoading(false)
  }

  const syncTags = async () => {
    if (!user) return
    setSyncing(true)
    await supabase.from('user_preferred_tags').delete().eq('user_id', user.id).eq('is_manual', false)
    await supabase.rpc('sync_preferred_tags', { p_user_id: user.id })
    const { data: autoTags } = await supabase
      .from('user_preferred_tags').select('id').eq('user_id', user.id).eq('is_manual', false)
      .order('score', { ascending: false })
    if (autoTags && autoTags.length > 10) {
      await supabase.from('user_preferred_tags').delete().in('id', autoTags.slice(10).map(t => t.id))
    }
    await loadTags(user.id)
    setSyncing(false)
  }

  const addManualTag = async (tagName: string) => {
    if (!user) return
    const manualCount = preferredTags.filter(t => t.is_manual).length
    if (manualCount >= 10) return
    if (preferredTags.find(t => t.tag_name === tagName)) return
    await supabase.from('user_preferred_tags').upsert({
      user_id: user.id, tag_name: tagName, score: 999, is_manual: true,
    }, { onConflict: 'user_id,tag_name' })
    await loadTags(user.id)
  }

  const removeTag = async (tagName: string) => {
    if (!user) return
    await supabase.from('user_preferred_tags').delete().eq('user_id', user.id).eq('tag_name', tagName)
    setPreferredTags(prev => prev.filter(t => t.tag_name !== tagName))
  }

  const existingTagNames = preferredTags.map(t => t.tag_name)
  const autoTags = preferredTags.filter(t => !t.is_manual)
  const manualTags = preferredTags.filter(t => t.is_manual)

  const tagStyle = {
    display: 'flex', alignItems: 'center', gap: '4px',
    background: '#FD297B18', color: '#FD297B',
    borderRadius: '20px', padding: '6px 12px',
    fontSize: '13px', fontWeight: '600',
  }

  return (
    <>
      <Header />
      <main style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', maxWidth: '480px', margin: '0 auto', padding: '24px 20px 48px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <button onClick={() => router.push('/favorites?tab=recommended')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: 0 }}>←</button>
          <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>好みタグ ✨</h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--subtext)', marginBottom: '24px' }}>
          お気に入り女優から自動検出（最大10個）＋手動追加（最大10個）できます。
        </p>

        {!user ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--subtext)' }}>ログインが必要です</div>
        ) : (
          <>
            <button onClick={syncTags} disabled={syncing} style={{
              width: '100%', marginBottom: '20px',
              background: 'var(--gradient)', color: '#fff', border: 'none',
              borderRadius: '50px', padding: '14px', fontSize: '15px',
              fontWeight: '700', cursor: syncing ? 'not-allowed' : 'pointer',
              boxShadow: 'var(--shadow-btn)', opacity: syncing ? 0.7 : 1,
            }}>
              {syncing ? '同期中...' : '🔄 お気に入り女優から自動検出'}
            </button>

            {/* 自動検出タグ */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: 'var(--subtext)' }}>
                自動検出タグ（{autoTags.length}/10）
              </div>
              {loading ? (
                <div style={{ color: 'var(--subtext)', fontSize: '13px' }}>読み込み中...</div>
              ) : autoTags.length === 0 ? (
                <div style={{ color: 'var(--subtext)', fontSize: '13px' }}>再計算ボタンで自動検出できます</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {autoTags.map(tag => (
                    <div key={tag.tag_name} style={tagStyle as React.CSSProperties}>
                      <span>{tag.tag_name}</span>
                      <button onClick={() => removeTag(tag.tag_name)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '0 0 0 2px', color: '#FD297B', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 手動タグ */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '10px', color: 'var(--subtext)' }}>
                手動追加タグ（{manualTags.length}/10）
              </div>
              {manualTags.length === 0 ? (
                <div style={{ color: 'var(--subtext)', fontSize: '13px' }}>下のリストから追加できます</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {manualTags.map(tag => (
                    <div key={tag.tag_name} style={tagStyle as React.CSSProperties}>
                      <span>{tag.tag_name}</span>
                      <button onClick={() => removeTag(tag.tag_name)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '0 0 0 2px', color: '#FD297B', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ジャンルから手動追加 */}
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '16px' }}>タグを追加</div>
              {POPULAR_GENRES.map(cat => (
                <div key={cat.category} style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--subtext)', marginBottom: '8px' }}>{cat.category}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {cat.genres.map(g => {
                      const already = existingTagNames.includes(g.name)
                      const manualFull = manualTags.length >= 10
                      const disabled = already || manualFull
                      return (
                        <button key={g.id} onClick={() => !disabled && addManualTag(g.name)} style={{
                          padding: '5px 12px', borderRadius: '20px',
                          fontSize: '12px', fontWeight: '600', cursor: disabled ? 'default' : 'pointer',
                          background: already ? '#FD297B18' : 'var(--card)',
                          color: already ? '#FD297B' : disabled ? 'var(--subtext)' : 'var(--text)',
                          border: already ? 'none' : '1.5px solid var(--border)',
                          opacity: disabled && !already ? 0.5 : 1,
                        }}>
                          {already ? '✓ ' : '+ '}{g.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  )
}
