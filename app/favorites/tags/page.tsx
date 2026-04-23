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

// よく使われる人気タグ一覧（手動追加用）
const POPULAR_TAGS = [
  '中出し', '巨乳', '美少女', '痴女', 'フェラ', '騎乗位', '女子校生',
  '潮吹き', 'パイズリ', '顔射', 'アナル', 'SM', '素人', '人妻・主婦',
  '熟女', 'ギャル', 'レズビアン', '3P・4P', '単体作品', 'ハーレム',
  '巨尻', 'スレンダー', '貧乳・微乳', 'パイパン', '美乳', 'ぽっちゃり',
  'NTR・寝取られ', '調教', 'コスプレ', '制服', '水着', 'OL',
]

export default function PreferredTagsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [preferredTags, setPreferredTags] = useState<PreferredTag[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

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
    // 自動検出タグを一旦削除して再計算（手動タグは残す）
    await supabase.from('user_preferred_tags')
      .delete()
      .eq('user_id', user.id)
      .eq('is_manual', false)
    await supabase.rpc('sync_preferred_tags', { p_user_id: user.id })
    // 自動タグを上位5個に制限
    const { data: autoTags } = await supabase
      .from('user_preferred_tags')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_manual', false)
      .order('score', { ascending: false })
    if (autoTags && autoTags.length > 10) {
      const toDelete = autoTags.slice(10).map(t => t.id)
      await supabase.from('user_preferred_tags').delete().in('id', toDelete)
    }
    await loadTags(user.id)
    setSyncing(false)
  }

  const addManualTag = async (tagName: string) => {
    if (!user) return
    if (preferredTags.find(t => t.tag_name === tagName)) return
    await supabase.from('user_preferred_tags').upsert({
      user_id: user.id,
      tag_name: tagName,
      score: 999,
      is_manual: true,
    }, { onConflict: 'user_id,tag_name' })
    await loadTags(user.id)
  }

  const removeTag = async (tagName: string) => {
    if (!user) return
    await supabase.from('user_preferred_tags')
      .delete()
      .eq('user_id', user.id)
      .eq('tag_name', tagName)
    setPreferredTags(prev => prev.filter(t => t.tag_name !== tagName))
  }

  const existingTagNames = preferredTags.map(t => t.tag_name)

  return (
    <>
      <Header />
      <main style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', maxWidth: '480px', margin: '0 auto', padding: '24px 20px 48px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: 0 }}>←</button>
          <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>好みタグ ✨</h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--subtext)', marginBottom: '24px' }}>
          お気に入り女優のタグから自動生成されます。手動で追加・削除もできます。
        </p>

        {!user ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--subtext)' }}>
            ログインが必要です
          </div>
        ) : (
          <>
            {/* 同期ボタン */}
            <button
              onClick={syncTags}
              disabled={syncing}
              style={{
                width: '100%', marginBottom: '20px',
                background: 'var(--gradient)', color: '#fff', border: 'none',
                borderRadius: '50px', padding: '14px', fontSize: '15px',
                fontWeight: '700', cursor: syncing ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--shadow-btn)', opacity: syncing ? 0.7 : 1,
              }}
            >
              {syncing ? '同期中...' : '🔄 お気に入り女優から再計算'}
            </button>

            {/* 現在の好みタグ */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>
                現在の好みタグ ({preferredTags.length}件)
              </div>
              {loading ? (
                <div style={{ color: 'var(--subtext)', fontSize: '13px' }}>読み込み中...</div>
              ) : preferredTags.length === 0 ? (
                <div style={{ color: 'var(--subtext)', fontSize: '13px' }}>
                  まだタグがありません。「再計算」ボタンを押すか、下から手動で追加してください。
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {preferredTags.map(tag => (
                    <div key={tag.tag_name} style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: tag.is_manual ? '#FD297B' : '#FD297B18',
                      color: tag.is_manual ? '#fff' : '#FD297B',
                      borderRadius: '20px', padding: '6px 12px',
                      fontSize: '13px', fontWeight: '600',
                    }}>
                      <span>{tag.tag_name}</span>
                      {!tag.is_manual && <span style={{ fontSize: '11px', opacity: 0.7 }}>×{tag.score}</span>}
                      <button
                        onClick={() => removeTag(tag.tag_name)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '0 0 0 4px', color: 'inherit', lineHeight: 1 }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 手動追加 */}
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>
                タグを手動で追加
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {POPULAR_TAGS.map(tag => {
                  const already = existingTagNames.includes(tag)
                  return (
                    <button
                      key={tag}
                      onClick={() => !already && addManualTag(tag)}
                      style={{
                        padding: '6px 12px', borderRadius: '20px',
                        fontSize: '13px', fontWeight: '600', cursor: already ? 'default' : 'pointer',
                        background: already ? 'var(--border)' : 'var(--card)',
                        color: already ? 'var(--subtext)' : 'var(--text)',
                        border: already ? 'none' : '1.5px solid var(--border)',
                        opacity: already ? 0.5 : 1,
                      }}
                    >
                      {already ? '✓ ' : '+ '}{tag}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  )
}
