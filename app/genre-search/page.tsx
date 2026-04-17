'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'

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
  prices?: { price: string }
  date?: string
  iteminfo?: {
    genre?: { id: number; name: string }[]
    actress?: { id: number; name: string }[]
  }
}

const POPULAR_GENRES: { category: string; genres: { id: string; name: string }[] }[] = [
  {
    category: '体型・外見',
    genres: [
      { id: '2001', name: '巨乳' },
      { id: '1027', name: '美少女' },
      { id: '6012', name: 'スレンダー' },
      { id: '4007', name: '貧乳・微乳' },
      { id: '4060', name: '美脚' },
      { id: '4008', name: '脚フェチ' },
      { id: '6202', name: 'ぽっちゃり' },
      { id: '6011', name: '美尻' },
    ],
  },
  {
    category: 'キャラクター',
    genres: [
      { id: '4118', name: 'アイドル・芸能人' },
      { id: '1001', name: 'OL' },
      { id: '1013', name: '看護婦・ナース' },
      { id: '1016', name: '女教師' },
      { id: '1033', name: 'お姉さん' },
      { id: '4057', name: '姉・妹' },
      { id: '1032', name: 'お母さん' },
      { id: '4056', name: '人妻' },
    ],
  },
  {
    category: 'プレイ',
    genres: [
      { id: '4001', name: 'SM' },
      { id: '5025', name: '淫語' },
      { id: '4059', name: 'キス・接吻' },
      { id: '5063', name: '主観' },
      { id: '5008', name: 'オナニー' },
      { id: '4030', name: '淫乱・ハード系' },
      { id: '5005', name: 'アナル' },
      { id: '5017', name: 'おもちゃ' },
    ],
  },
  {
    category: 'シチュエーション',
    genres: [
      { id: '4025', name: '単体作品' },
      { id: '4019', name: '3P・4P' },
      { id: '4023', name: 'ドキュメンタリー' },
      { id: '553', name: '学園もの' },
      { id: '4026', name: 'カーセックス' },
      { id: '4119', name: 'エステ' },
      { id: '4140', name: '温泉' },
      { id: '5010', name: '監禁' },
    ],
  },
]

const PER_PAGE = 20

export default function GenreSearchPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [selectedActresses, setSelectedActresses] = useState<string[]>([])
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [partialResults, setPartialResults] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<'date' | 'rank'>('date')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (!u) return
      supabase
        .from('favorites')
        .select('actress_id, actress_name, actress_image')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setFavorites(data ?? [])
        })
    })
  }, [])

  const toggleActress = (id: string) => {
    setSelectedActresses(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const toggleGenre = (id: string) => {
    setSelectedGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const search = async () => {
    if (selectedGenres.length === 0) {
      alert('ジャンルを1つ以上選んでください')
      return
    }
    setLoading(true)
    setSearched(true)
    setWorks([])
    setCurrentPage(1)

    const selectedFavorites = favorites.filter(f => selectedActresses.includes(f.actress_id))
    const genreIds = selectedGenres.join(',')

    if (selectedFavorites.length === 0) {
      const res = await fetch(`/api/dmm?genre=${genreIds}&hits=50&sort=rank`)
      const data = await res.json()
      setWorks(data.result?.items ?? [])
      setLoading(false)
      return
    }

    const MAX_WORKS = 1000
    const partial: string[] = []

    const fetchAllWorksForActress = async (actressId: string, actressName: string) => {
      const firstRes = await fetch(`/api/dmm?actress_id=${actressId}&hits=100&sort=rank&offset=1`)
      const firstData = await firstRes.json()
      const total = Number(firstData.result?.total_count ?? 0)
      const firstItems = firstData.result?.items ?? []
      if (total > MAX_WORKS) partial.push(actressName)
      if (total <= 100) return firstItems
      const offsets: number[] = []
      for (let i = 101; i <= Math.min(total, MAX_WORKS); i += 100) offsets.push(i)
      const rest = await Promise.all(
        offsets.map(offset =>
          fetch(`/api/dmm?actress_id=${actressId}&hits=100&sort=rank&offset=${offset}`)
            .then(r => r.json())
            .then(d => d.result?.items ?? [])
        )
      )
      return [...firstItems, ...rest.flat()]
    }

    const results = await Promise.all(
      selectedFavorites.map(f => fetchAllWorksForActress(f.actress_id, f.actress_name))
    )
    const merged = results.flat()
    const unique = merged.filter((w: Work, i: number, arr: Work[]) =>
      arr.findIndex((b: Work) => b.content_id === w.content_id) === i
    )
    const filtered = unique.filter((w: Work) => {
      const workGenreIds = (w.iteminfo?.genre ?? []).map((g: { id: number }) => String(g.id))
      return selectedGenres.every(gId => workGenreIds.includes(gId))
    })
    setPartialResults(partial)
    setWorks(filtered)
    setLoading(false)
  }

  const sortedWorks = [...works].sort((a, b) => {
    if (sortOrder === 'date') {
      return new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
    }
    return 0
  })
  const totalPages = Math.ceil(sortedWorks.length / PER_PAGE)
  const pagedWorks = sortedWorks.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  return (
    <>
      <Header />
      <main style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', maxWidth: '480px', margin: '0 auto', padding: '24px 20px 48px' }}>

        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>ジャンル検索 🔍</h2>
        <p style={{ fontSize: '13px', color: 'var(--subtext)', marginBottom: '24px' }}>ジャンルを選んで好みの作品を探そう</p>

        {user && favorites.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '12px' }}>
              💖 お気に入り女優で絞り込む（任意）
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {favorites.map(fav => (
                <button
                  key={fav.actress_id}
                  onClick={() => toggleActress(fav.actress_id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', borderRadius: '50px',
                    border: selectedActresses.includes(fav.actress_id) ? 'none' : '1.5px solid var(--border)',
                    background: selectedActresses.includes(fav.actress_id) ? 'var(--gradient)' : 'var(--card)',
                    color: selectedActresses.includes(fav.actress_id) ? '#fff' : 'var(--text)',
                    fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                    boxShadow: selectedActresses.includes(fav.actress_id) ? 'var(--shadow-btn)' : '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  {fav.actress_image && (
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                      <Image src={fav.actress_image} alt={fav.actress_name} width={20} height={20} style={{ objectFit: 'cover' }} unoptimized />
                    </div>
                  )}
                  {fav.actress_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {!user && (
          <div style={{
            background: 'linear-gradient(135deg, #FD297B10, #FF655B08)',
            border: '1px solid #FD297B22', borderRadius: '12px',
            padding: '12px 16px', fontSize: '13px', color: '#FD297B',
            fontWeight: '500', marginBottom: '24px',
          }}>
            💖 ログインするとお気に入り女優で絞り込めます
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '12px' }}>
            🏷️ ジャンルを選ぶ
          </div>
          {POPULAR_GENRES.map(cat => (
            <div key={cat.category} style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: 'var(--subtext)', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '8px', textTransform: 'uppercase' }}>
                {cat.category}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {cat.genres.map(genre => (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.id)}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                      background: selectedGenres.includes(genre.id) ? '#FD297B' : 'var(--card)',
                      color: selectedGenres.includes(genre.id) ? '#fff' : 'var(--text)',
                      border: selectedGenres.includes(genre.id) ? 'none' : '1.5px solid var(--border)',
                      boxShadow: selectedGenres.includes(genre.id) ? '0 4px 12px rgba(253,41,123,0.3)' : '0 2px 6px rgba(0,0,0,0.06)',
                    }}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={search}
          disabled={loading || selectedGenres.length === 0}
          style={{
            width: '100%', background: selectedGenres.length > 0 ? 'var(--gradient)' : 'var(--border)',
            color: '#fff', border: 'none', borderRadius: '50px',
            padding: '18px', fontSize: '17px', fontWeight: '700',
            cursor: selectedGenres.length > 0 ? 'pointer' : 'not-allowed',
            boxShadow: selectedGenres.length > 0 ? 'var(--shadow-btn)' : 'none',
            marginBottom: '32px',
          }}
        >
          {loading ? '検索中...' : 'この条件で検索 🔍'}
        </button>

        {searched && !loading && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>
                検索結果 {works.length}件
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => { setSortOrder('date'); setCurrentPage(1) }}
                  style={{
                    padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    background: sortOrder === 'date' ? '#FD297B' : 'var(--card)',
                    color: sortOrder === 'date' ? '#fff' : 'var(--subtext)',
                    border: sortOrder === 'date' ? 'none' : '1.5px solid var(--border)',
                  }}
                >
                  発売日順
                </button>
                <button
                  onClick={() => { setSortOrder('rank'); setCurrentPage(1) }}
                  style={{
                    padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    background: sortOrder === 'rank' ? '#FD297B' : 'var(--card)',
                    color: sortOrder === 'rank' ? '#fff' : 'var(--subtext)',
                    border: sortOrder === 'rank' ? 'none' : '1.5px solid var(--border)',
                  }}
                >
                  売り上げ順
                </button>
              </div>
            </div>

            {partialResults.length > 0 && (
              <div style={{
                background: '#FFF3CD', border: '1px solid #FFEAA7',
                borderRadius: '12px', padding: '10px 14px',
                fontSize: '12px', color: '#856404', marginBottom: '16px',
              }}>
                ⚠️ {partialResults.join('・')} は作品数が多いため一部のみ表示しています
              </div>
            )}

            {works.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--subtext)' }}>
                条件に合う作品が見つかりませんでした
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                  {pagedWorks.map((work, i) => (
                    <div
                      key={work.content_id}
                      style={{
                        background: 'var(--card)', borderRadius: '20px', overflow: 'hidden',
                        boxShadow: i === 0 && currentPage === 1 ? '0 8px 32px rgba(253,41,123,0.15)' : '0 2px 12px rgba(0,0,0,0.06)',
                        border: i === 0 && currentPage === 1 ? '1.5px solid #FD297B44' : '1.5px solid transparent',
                        position: 'relative',
                      }}
                    >
                      {i === 0 && currentPage === 1 && (
                        <div style={{
                          position: 'absolute', top: '12px', left: '12px', zIndex: 2,
                          background: 'var(--gradient)', color: '#fff',
                          fontSize: '10px', padding: '4px 10px', borderRadius: '20px',
                          fontWeight: '700', boxShadow: 'var(--shadow-btn)',
                        }}>
                          {sortOrder === 'date' ? '🆕 LATEST' : '🏆 BEST SELLER'}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'stretch' }}>
                        <div style={{ width: '100px', minHeight: '130px', position: 'relative', flexShrink: 0 }}>
                          <Image
                            src={work.imageURL?.small ?? ''}
                            alt={work.title}
                            fill
                            style={{ objectFit: 'cover' }}
                            unoptimized
                          />
                        </div>
                        <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', lineHeight: 1.4, color: 'var(--text)', marginTop: i === 0 && currentPage === 1 ? '18px' : 0 }}>
                            {work.title.length > 40 ? work.title.slice(0, 40) + '...' : work.title}
                          </div>

                          <button
                            onClick={() => window.open(work.affiliateURL, '_blank')}
                            style={{
                              marginTop: '10px', background: 'var(--gradient)',
                              color: '#fff', border: 'none', borderRadius: '20px',
                              padding: '7px 16px', fontSize: '12px', fontWeight: '700',
                              cursor: 'pointer', boxShadow: '0 4px 12px rgba(253,41,123,0.3)',
                            }}
                          >
                            作品を見る →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <button
                      onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo(0, 0) }}
                      disabled={currentPage === 1}
                      style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', background: 'var(--card)', color: currentPage === 1 ? 'var(--border)' : 'var(--text)', border: '1.5px solid var(--border)' }}
                    >←</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce((acc: (number | string)[], p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                        acc.push(p)
                        return acc
                      }, [])
                      .map((p, i) => (
                        <button
                          key={i}
                          onClick={() => { if (typeof p === 'number') { setCurrentPage(p); window.scrollTo(0, 0) } }}
                          style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: p === '...' ? 'default' : 'pointer', background: p === currentPage ? '#FD297B' : 'var(--card)', color: p === currentPage ? '#fff' : 'var(--text)', border: p === currentPage ? 'none' : '1.5px solid var(--border)' }}
                        >{p}</button>
                      ))
                    }
                    <button
                      onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo(0, 0) }}
                      disabled={currentPage === totalPages}
                      style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', background: 'var(--card)', color: currentPage === totalPages ? 'var(--border)' : 'var(--text)', border: '1.5px solid var(--border)' }}
                    >→</button>
                    <input
                      type='number'
                      min={1}
                      max={totalPages}
                      placeholder='ページ'
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const v = parseInt((e.target as HTMLInputElement).value)
                          if (v >= 1 && v <= totalPages) { setCurrentPage(v); window.scrollTo(0, 0) }
                          ;(e.target as HTMLInputElement).value = ''
                        }
                      }}
                      style={{ width: '80px', height: '38px', padding: '0 12px', borderRadius: '20px', border: '1.5px solid var(--border)', background: 'var(--card)', fontSize: '14px', fontWeight: '600', color: 'var(--text)', textAlign: 'center', outline: 'none' }}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}

      </main>
    </>
  )
}




