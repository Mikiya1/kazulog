'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'
import { getActressesByInitial, getPopularActresses } from '../lib/db'

type Actress = {
  id: string
  name: string
  imageUrl: string
  tags: string[]
  debutYear: number | null
}

const AIUEO_ROWS = [
  { row: 'あ行', kanas: ['あ', 'い', 'う', 'え', 'お'] },
  { row: 'か行', kanas: ['か', 'き', 'く', 'け', 'こ'] },
  { row: 'さ行', kanas: ['さ', 'し', 'す', 'せ', 'そ'] },
  { row: 'た行', kanas: ['た', 'ち', 'つ', 'て', 'と'] },
  { row: 'な行', kanas: ['な', 'に', 'ぬ', 'ね', 'の'] },
  { row: 'は行', kanas: ['は', 'ひ', 'ふ', 'へ', 'ほ'] },
  { row: 'ま行', kanas: ['ま', 'み', 'む', 'め', 'も'] },
  { row: 'や行', kanas: ['や', 'ゆ', 'よ'] },
  { row: 'ら行', kanas: ['ら', 'り', 'る', 'れ', 'ろ'] },
  { row: 'わ行', kanas: ['わ', 'を', 'ん'] },
]

const HITS = 100

export default function ActressesPage() {
  const router = useRouter()
  const [actresses, setActresses] = useState<Actress[]>([])
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [tab, setTab] = useState<'rank' | 'aiueo'>('rank')
  const [selectedRow, setSelectedRow] = useState<string>('あ行')
  const [selectedKana, setSelectedKana] = useState<string>('あ')
  const [keyword, setKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const resultsRef = useRef<HTMLDivElement>(null)

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

  const fetchActresses = useCallback(async () => {
    setLoading(true)
    setActresses([])

    if (keyword) {
      // キーワード検索はSupabaseから
      const { data, count } = await supabase
        .from('actresses')
        .select('id, name, ruby, image_url, tags, debut_year', { count: 'exact' })
        .ilike('name', `%${keyword}%`)
        .not('image_url', 'is', null)
        .order('ruby', { ascending: true })
        .range((page - 1) * HITS, page * HITS - 1)
      setActresses((data ?? []).map((a: any) => ({ id: String(a.id), name: a.name, imageUrl: a.image_url ?? '', tags: a.tags ?? [], debutYear: a.debut_year ?? null })))
      setTotalCount(count ?? 0)
      setLoading(false)
      return
    }

    if (tab === 'rank') {
      // 人気タブはSupabaseから
      const data = await getPopularActresses(100)
      setActresses(data.map((a: any) => ({ id: String(a.id), name: a.name, imageUrl: a.image_url ?? '', tags: a.tags ?? [], debutYear: a.debut_year ?? null })))
      setTotalCount(0)
      setLoading(false)
      return
    }

    // 50音タブはSupabaseから
    const { actresses: data, total } = await getActressesByInitial(selectedKana, HITS, (page - 1) * HITS)
    setActresses((data ?? []).map((a: any) => ({ id: String(a.id), name: a.name, imageUrl: a.image_url ?? '', tags: a.tags ?? [], debutYear: a.debut_year ?? null })))
    setTotalCount(total)
    setLoading(false)
  }, [tab, selectedKana, keyword, page])

  useEffect(() => {
    fetchActresses()
  }, [fetchActresses])

  const toggleFavorite = async (actress: Actress) => {
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

  const handleSearch = () => {
    setKeyword(searchInput)
    setPage(1)
  }

  const handleRowSelect = (row: string, kanas: string[]) => {
    setSelectedRow(row)
    setSelectedKana(kanas[0])
    setPage(1)
  }

  const handleKanaSelect = (kana: string) => {
    setSelectedKana(kana)
    setPage(1)
  }

  const totalPages = Math.ceil(totalCount / HITS)
  const currentRowKanas = AIUEO_ROWS.find(r => r.row === selectedRow)?.kanas ?? []

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('...')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
      if (page < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <>
      <Header />
      <main style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', maxWidth: '480px', margin: '0 auto', padding: '0 0 48px' }}>

        {/* タブ */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--card)', position: 'sticky', top: '57px', zIndex: 50 }}>
          <button
            onClick={() => { setTab('rank'); setPage(1); setKeyword(''); setSearchInput('') }}
            style={{
              flex: 1, padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
              background: 'none', border: 'none',
              color: tab === 'rank' ? '#FD297B' : 'var(--subtext)',
              borderBottom: tab === 'rank' ? '2px solid #FD297B' : '2px solid transparent',
            }}
          >
            人気
          </button>
          <button
            onClick={() => { setTab('aiueo'); setPage(1); setKeyword(''); setSearchInput('') }}
            style={{
              flex: 1, padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer',
              background: 'none', border: 'none',
              color: tab === 'aiueo' ? '#FD297B' : 'var(--subtext)',
              borderBottom: tab === 'aiueo' ? '2px solid #FD297B' : '2px solid transparent',
            }}
          >
            50音順
          </button>
        </div>

        <div style={{ padding: '16px 20px 0' }}>

          {/* 検索 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="女優名を検索..."
              style={{
                flex: 1, padding: '10px 16px', borderRadius: '50px',
                border: '1.5px solid var(--border)', background: 'var(--card)',
                fontSize: '14px', color: 'var(--text)', outline: 'none',
              }}
            />
            <button
              onClick={handleSearch}
              style={{
                background: 'var(--gradient)', color: '#fff', border: 'none',
                borderRadius: '50px', padding: '10px 20px',
                fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                boxShadow: 'var(--shadow-btn)',
              }}
            >
              検索
            </button>
          </div>

          {/* 五十音：行選択 */}
          {tab === 'aiueo' && !keyword && (
            <>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {AIUEO_ROWS.map(({ row, kanas }) => (
                  <button
                    key={row}
                    onClick={() => handleRowSelect(row, kanas)}
                    style={{
                      padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                      background: selectedRow === row ? '#FD297B' : 'var(--card)',
                      color: selectedRow === row ? '#fff' : 'var(--subtext)',
                      border: selectedRow === row ? 'none' : '1.5px solid var(--border)',
                    }}
                  >
                    {row}
                  </button>
                ))}
              </div>

              {/* 文字選択 */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                {currentRowKanas.map(kana => (
                  <button
                    key={kana}
                    onClick={() => handleKanaSelect(kana)}
                    style={{
                      padding: '8px 16px', borderRadius: '20px', fontSize: '15px', fontWeight: '700', cursor: 'pointer',
                      background: selectedKana === kana ? '#FD297B' : 'var(--card)',
                      color: selectedKana === kana ? '#fff' : 'var(--text)',
                      border: selectedKana === kana ? 'none' : '1.5px solid var(--border)',
                    }}
                  >
                    {kana}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* 検索中表示 */}
          {keyword && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: 'var(--subtext)' }}>「{keyword}」の検索結果</span>
              <button
                onClick={() => { setKeyword(''); setSearchInput(''); setPage(1) }}
                style={{ background: 'none', border: 'none', color: '#FD297B', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                ✕ クリア
              </button>
            </div>
          )}

          {/* 件数表示 */}
          {totalCount > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--subtext)', marginBottom: '12px' }}>
              {totalCount.toLocaleString()}人中 {(page - 1) * HITS + 1}〜{Math.min(page * HITS, totalCount)}人目
            </div>
          )}

          {/* 女優一覧 */}
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '12px' }}>
              <div style={{ fontSize: '24px' }}>🔥</div>
              <span style={{ color: 'var(--subtext)', fontWeight: '600' }}>読み込み中...</span>
            </div>
          ) : actresses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--subtext)' }}>
              見つかりませんでした
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'calc(50% - 4px) calc(50% - 4px)', gap: '8px', marginBottom: '24px' }}>
              {actresses.map(actress => (
                <div key={actress.id} style={{
                  background: 'var(--card)', borderRadius: '16px',
                  padding: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  border: '1.5px solid var(--border)',
                }}>
                  <div
                    onClick={() => router.push(`/recommend?ids=${actress.id}&names=${actress.name}&images=${encodeURIComponent(actress.imageUrl)}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', cursor: 'pointer' }}
                  >
                    <div style={{ flexShrink: 0 }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 0 0 2px #FD297B44' }}>
                        <Image src={actress.imageUrl} alt={actress.name} width={56} height={56} style={{ objectFit: 'cover', objectPosition: 'top' }} unoptimized />
                      </div>
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text)', fontWeight: '700', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {actress.name}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(actress) }}
                          style={{
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: 'none', border: 'none', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', cursor: 'pointer',
                          }}
                        >
                          {favoriteIds.includes(actress.id) ? '💖' : '🤍'}
                        </button>
                      </div>
                      {actress.debutYear && (
                        <div style={{ fontSize: '10px', color: 'var(--subtext)', marginTop: '2px' }}>
                          🎬 {new Date().getFullYear() - actress.debutYear}年目
                        </div>
                      )}
                    </div>
                  </div>
                  {actress.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {actress.tags.slice(0, 5).map(tag => (
                        <span key={tag} style={{
                          fontSize: '10px', padding: '2px 6px', borderRadius: '20px',
                          background: '#FD297B18', color: '#FD297B', fontWeight: '600',
                          whiteSpace: 'nowrap',
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ページネーション */}
          {totalPages > 1 && (
            <div ref={resultsRef} style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px', scrollMarginTop: '80px' }}>
              <button
                onClick={() => { setPage(p => Math.max(1, p - 1)); setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50) }}
                disabled={page === 1}
                style={{
                  padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  background: 'var(--card)', color: page === 1 ? 'var(--border)' : 'var(--text)',
                  border: '1.5px solid var(--border)',
                }}
              >
                ←
              </button>
              {getPageNumbers().map((p, i) => (
                <button
                  key={i}
                  onClick={() => { if (typeof p === 'number') { setPage(p); setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50) } }}
                  disabled={p === '...'}
                  style={{
                    padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                    cursor: p === '...' ? 'default' : 'pointer',
                    background: p === page ? '#FD297B' : 'var(--card)',
                    color: p === page ? '#fff' : 'var(--text)',
                    border: p === page ? 'none' : '1.5px solid var(--border)',
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => { setPage(p => Math.min(totalPages, p + 1)); setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50) }}
                disabled={page === totalPages}
                style={{
                  padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  background: 'var(--card)', color: page === totalPages ? 'var(--border)' : 'var(--text)',
                  border: '1.5px solid var(--border)',
                }}
              >
                →
              </button>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: '20px', padding: '0 12px', height: '34px', gap: '4px' }}>
                <input
                  type='number'
                  min={1}
                  max={totalPages}
                  defaultValue={page}
                  key={page}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const v = parseInt((e.target as HTMLInputElement).value)
                      if (v >= 1 && v <= totalPages) { setPage(v); setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50) }
                    }
                  }}
                  style={{ width: '32px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: '700', color: 'var(--text)', textAlign: 'center', outline: 'none', padding: 0 }}
                />
                <span style={{ fontSize: '13px', color: 'var(--subtext)', fontWeight: '500' }}>/ {totalPages}</span>
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  )
}
