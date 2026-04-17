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

type Genre = {
  genre_id: string
  name: string
}

type Work = {
  content_id: string
  title: string
  affiliateURL: string
  imageURL: { large: string; small: string }
  prices?: { price: string }
  iteminfo?: { genre?: { id: number; name: string }[] }
}

// よく使うジャンルを厳選
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

export default function GenreSearchPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [selectedActresses, setSelectedActresses] = useState<string[]>([])
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)

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

    const selectedFavorites = favorites.filter(f => selectedActresses.includes(f.actress_id))
    const genreIds = selectedGenres.join(',')

    // 女優が選ばれてない場合はジャンルのみで検索
    if (selectedFavorites.length === 0) {
      const res = await fetch(`/api/dmm?genre=${genreIds}&hits=20&sort=rank`)
      const data = await res.json()
      setWorks(data.result?.items ?? [])
      setLoading(false)
      return
    }

    // 女優の作品を取得してフロントでジャンルフィルタリング
    const results = await Promise.all(
      selectedFavorites.map(f =>
        fetch(`/api/dmm?actress_id=${f.actress_id}&hits=100&sort=rank`)
          .then(r => r.json())
          .then(data => data.result?.items ?? [])
      )
    )
    const merged = results.flat()
    // 重複除去
    const unique = merged.filter((w: Work, i: number, arr: Work[]) =>
      arr.findIndex((b: Work) => b.content_id === w.content_id) === i
    )
    // 選択したジャンルを全て含む作品のみ表示
    const filtered = unique.filter((w: Work) => {
      const workGenreIds = (w.iteminfo?.genre ?? []).map((g: { id: number }) => String(g.id))
      return selectedGenres.every(gId => workGenreIds.includes(gId))
    })
    setWorks(filtered)
    setLoading(false)
  }

  return (
    <>
      <Header />
      <main style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', maxWidth: '480px', margin: '0 auto', padding: '24px 20px 48px' }}>

        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>ジャンル検索 🔍</h2>
        <p style={{ fontSize: '13px', color: 'var(--subtext)', marginBottom: '24px' }}>ジャンルを選んで好みの作品を探そう</p>

        {/* お気に入り女優選択 */}
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

        {/* ジャンル選択 */}
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

        {/* 検索ボタン */}
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
          {loading ? '検索中...' : `この条件で検索 🔍`}
        </button>

        {/* 検索結果 */}
        {searched && !loading && (
          <>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px' }}>
              検索結果 {works.length}件
            </div>
            {works.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--subtext)' }}>
                条件に合う作品が見つかりませんでした
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {works.map((work, i) => (
                  <div
                    key={work.content_id}
                    style={{
                      background: 'var(--card)', borderRadius: '20px', overflow: 'hidden',
                      boxShadow: i === 0 ? '0 8px 32px rgba(253,41,123,0.15)' : '0 2px 12px rgba(0,0,0,0.06)',
                      border: i === 0 ? '1.5px solid #FD297B44' : '1.5px solid transparent',
                      position: 'relative',
                    }}
                  >
                    {i === 0 && (
                      <div style={{
                        position: 'absolute', top: '12px', left: '12px', zIndex: 2,
                        background: 'var(--gradient)', color: '#fff',
                        fontSize: '10px', padding: '4px 10px', borderRadius: '20px',
                        fontWeight: '700', boxShadow: 'var(--shadow-btn)',
                      }}>
                        💖 BEST MATCH
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
                        <div style={{ fontSize: '13px', fontWeight: '700', lineHeight: 1.4, color: 'var(--text)', marginTop: i === 0 ? '18px' : 0 }}>
                          {work.title.length > 40 ? work.title.slice(0, 40) + '...' : work.title}
                        </div>
                        <div style={{
                          fontSize: '13px', marginTop: '6px', fontWeight: '700',
                          background: 'var(--gradient)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        } as React.CSSProperties}>
                          {work.prices?.price}
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
            )}
          </>
        )}

      </main>
    </>
  )
}



