'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '../components/Header'

const cards = [
  {
    id: 1, name: '桃乃木かな', cup: 'Eカップ', tags: ['清楚系', 'スレンダー', 'ロリ'],
    image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop',
  },
  {
    id: 2, name: '三上悠亜', cup: 'Cカップ', tags: ['アイドル', '清楚', '美脚'],
    image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop',
  },
  {
    id: 3, name: '明日花キラ', cup: 'Iカップ', tags: ['ギャル', '巨乳', '豊胸'],
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop',
  },
  {
    id: 4, name: '天使もえ', cup: 'Dカップ', tags: ['ロリ', 'かわいい', '清楚'],
    image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop',
  },
  {
    id: 5, name: '深田えいみ', cup: 'Gカップ', tags: ['巨乳', 'グラマー', '色白'],
    image: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&h=400&fit=crop',
  },
]

export default function SwipePage() {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [likedTags, setLikedTags] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [animating, setAnimating] = useState<'left' | 'right' | 'up' | null>(null)

  const current = cards[index]
  const next = cards[index + 1]

  const handleSwipe = (dir: 'left' | 'right' | 'up') => {
    if (animating) return
    setAnimating(dir)
    const liked = dir === 'right' || dir === 'up'
    const newTags = liked ? [...likedTags, ...current.tags] : likedTags
    if (liked) setLikedTags(newTags)

    setTimeout(() => {
      setAnimating(null)
      if (index + 1 >= cards.length) {
        setDone(true)
      } else {
        setIndex(prev => prev + 1)
      }
    }, 280)
  }

  const getCardTransform = () => {
    if (animating === 'right') return 'translateX(120%) rotate(15deg)'
    if (animating === 'left') return 'translateX(-120%) rotate(-15deg)'
    if (animating === 'up') return 'translateY(-120%) rotate(5deg)'
    return 'none'
  }

  if (done) {
    return (
      <>
        <Header />
        <main style={{ background: '#0F0F0F', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '20px', maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ fontSize: '48px' }}>🎉</div>
          <h2 style={{ fontSize: '24px', fontWeight: '600' }}>診断完了！</h2>
          <div style={{ background: '#1C1C1E', borderRadius: '16px', padding: '16px 20px', width: '100%' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>あなたの好みタグ</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[...new Set(likedTags)].map(tag => (
                <span key={tag} style={{ background: '#2a2a2a', color: '#FF2D55', fontSize: '13px', padding: '4px 12px', borderRadius: '20px', border: '1px solid #FF2D55' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => router.push(`/recommend?tags=${[...new Set(likedTags)].join(',')}`)}
            style={{ background: '#FF2D55', color: '#fff', border: 'none', borderRadius: '16px', padding: '16px', fontSize: '17px', fontWeight: '600', width: '100%' }}
          >
            おすすめを見る →
          </button>
          <button
            onClick={() => { setIndex(0); setLikedTags([]); setDone(false) }}
            style={{ background: 'transparent', color: '#888', border: '1px solid #333', borderRadius: '16px', padding: '14px', fontSize: '15px', width: '100%' }}
          >
            もう一度やり直す
          </button>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main style={{ background: '#0F0F0F', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px', maxWidth: '480px', margin: '0 auto' }}>

        {/* プログレスバー */}
        <div style={{ width: '100%', height: '3px', background: '#1C1C1E', borderRadius: '2px', marginBottom: '24px' }}>
          <div style={{ height: '100%', background: '#FF2D55', borderRadius: '2px', width: `${((index + 1) / cards.length) * 100}%`, transition: 'width 0.3s' }} />
        </div>

        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <span style={{ color: '#666', fontSize: '14px' }}>{index + 1} / {cards.length}</span>
        </div>

        {/* カードエリア */}
        <div style={{ width: '100%', position: 'relative', height: '420px', marginBottom: '24px' }}>
          {next && (
            <div style={{ position: 'absolute', inset: 0, background: '#1C1C1E', borderRadius: '20px', transform: 'scale(0.95) translateY(8px)', zIndex: 0 }} />
          )}
          <div style={{
            position: 'absolute', inset: 0, background: '#1C1C1E', borderRadius: '20px', overflow: 'hidden', zIndex: 1,
            transform: getCardTransform(),
            transition: animating ? 'transform 0.28s ease' : 'none',
          }}>
            <div style={{ height: '260px', position: 'relative', overflow: 'hidden' }}>
              <Image
                src={current.image}
                alt={current.name}
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>{current.name}</div>
              <div style={{ color: '#FF2D55', fontSize: '15px', marginTop: '4px', fontWeight: '500' }}>{current.cup}</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                {current.tags.map(tag => (
                  <span key={tag} style={{ background: '#2a2a2a', color: '#ccc', fontSize: '13px', padding: '5px 12px', borderRadius: '20px' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ボタン */}
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button
            onClick={() => handleSwipe('left')}
            style={{ width: '64px', height: '64px', borderRadius: '50%', border: '1.5px solid #444', background: '#1C1C1E', fontSize: '26px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
          <button
            onClick={() => handleSwipe('right')}
            style={{ width: '72px', height: '72px', borderRadius: '50%', border: '2px solid #FF2D55', background: '#FF2D55', fontSize: '28px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(255,45,85,0.4)' }}
          >
            ♥
          </button>
          <button
            onClick={() => handleSwipe('up')}
            style={{ width: '64px', height: '64px', borderRadius: '50%', border: '1.5px solid #333', background: '#1C1C1E', fontSize: '22px', color: '#FFD60A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ⭐
          </button>
        </div>

        <div style={{ marginTop: '16px', fontSize: '12px', color: '#444' }}>← スワイプで選択 →</div>

      </main>
    </>
  )
}