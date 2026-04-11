'use client'

import { useState, useRef } from 'react'
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

  // ドラッグ・タッチ用
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)

  const current = cards[index]
  const next = cards[index + 1]
  const nextNext = cards[index + 2]

  const handleSwipe = (dir: 'left' | 'right' | 'up') => {
    if (animating) return
    setDragOffset({ x: 0, y: 0 })
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
    }, 320)
  }

  // タッチ開始
  const onTouchStart = (e: React.TouchEvent) => {
    if (animating) return
    const t = e.touches[0]
    dragStart.current = { x: t.clientX, y: t.clientY }
    isDragging.current = true
  }

  // タッチ移動中
  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !dragStart.current || animating) return
    const t = e.touches[0]
    setDragOffset({
      x: t.clientX - dragStart.current.x,
      y: t.clientY - dragStart.current.y,
    })
  }

  // タッチ終了
  const onTouchEnd = () => {
    if (!isDragging.current) return
    isDragging.current = false

    const { x, y } = dragOffset
    if (x > 80) {
      handleSwipe('right')
    } else if (x < -80) {
      handleSwipe('left')
    } else if (y < -80) {
      handleSwipe('up')
    } else {
      // 戻す
      setDragOffset({ x: 0, y: 0 })
    }
    dragStart.current = null
  }

  // マウスドラッグ（PC用）
  const onMouseDown = (e: React.MouseEvent) => {
    if (animating) return
    dragStart.current = { x: e.clientX, y: e.clientY }
    isDragging.current = true
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !dragStart.current || animating) return
    setDragOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    })
  }

  const onMouseUp = () => {
    if (!isDragging.current) return
    isDragging.current = false

    const { x, y } = dragOffset
    if (x > 80) {
      handleSwipe('right')
    } else if (x < -80) {
      handleSwipe('left')
    } else if (y < -80) {
      handleSwipe('up')
    } else {
      setDragOffset({ x: 0, y: 0 })
    }
    dragStart.current = null
  }

  // カードのスタイル計算
  const getCardTransform = () => {
    if (animating === 'right') return 'translateX(130%) rotate(20deg)'
    if (animating === 'left') return 'translateX(-130%) rotate(-20deg)'
    if (animating === 'up') return 'translateY(-130%) rotate(5deg)'
    if (isDragging.current || (dragOffset.x !== 0 || dragOffset.y !== 0)) {
      const rotate = dragOffset.x * 0.08
      return `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotate}deg)`
    }
    return 'none'
  }

  // ドラッグ中のLIKE/NOPEラベル表示判定
  const showLike = animating === 'right' || dragOffset.x > 40
  const showNope = animating === 'left' || dragOffset.x < -40
  const showSuper = animating === 'up' || dragOffset.y < -40

  if (done) {
    return (
      <>
        <Header />
        <main style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '24px', maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ fontSize: '64px' }}>🎉</div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text)', textAlign: 'center' }}>診断完了！</h2>
          <p style={{ fontSize: '14px', color: 'var(--subtext)', textAlign: 'center' }}>あなたの好みが分かりました</p>

          <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '20px', width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '11px', color: 'var(--subtext)', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>あなたの好みタグ</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[...new Set(likedTags)].map(tag => (
                <span key={tag} style={{
                  background: 'linear-gradient(135deg, #FD297B15, #FF655B10)',
                  color: '#FD297B', fontSize: '13px', padding: '6px 14px',
                  borderRadius: '20px', fontWeight: '600', border: '1px solid #FD297B33',
                }}>{tag}</span>
              ))}
            </div>
          </div>

          <button
            onClick={() => router.push(`/recommend?tags=${[...new Set(likedTags)].join(',')}`)}
            style={{ background: 'var(--gradient)', color: '#fff', border: 'none', borderRadius: '50px', padding: '18px', fontSize: '17px', fontWeight: '700', width: '100%', boxShadow: 'var(--shadow-btn)' }}
          >
            おすすめを見る 💖
          </button>
          <button
            onClick={() => { setIndex(0); setLikedTags([]); setDone(false) }}
            style={{ background: 'var(--card)', color: 'var(--subtext)', border: '1.5px solid var(--border)', borderRadius: '50px', padding: '16px', fontSize: '15px', fontWeight: '600', width: '100%' }}
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
      <main style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 20px 32px', maxWidth: '480px', margin: '0 auto' }}>

        {/* プログレスバー */}
        <div style={{ width: '100%', display: 'flex', gap: '6px', marginBottom: '20px' }}>
          {cards.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: '4px', borderRadius: '2px',
              backgroundImage: i <= index ? 'linear-gradient(135deg, #FD297B, #FF655B)' : 'none',
              backgroundColor: i <= index ? undefined : 'var(--border)',
            }} />
          ))}
        </div>

        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--subtext)', fontWeight: '500' }}>残り {cards.length - index} 人</span>
          <span style={{ fontSize: '13px', color: 'var(--subtext)', fontWeight: '500' }}>{index + 1} / {cards.length}</span>
        </div>

        {/* カードエリア */}
        <div style={{ width: '100%', position: 'relative', height: '460px', marginBottom: '28px' }}>

          {nextNext && (
            <div style={{ position: 'absolute', inset: 0, background: 'var(--card)', borderRadius: '24px', transform: 'scale(0.90) translateY(16px)', zIndex: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }} />
          )}
          {next && (
            <div style={{ position: 'absolute', inset: 0, background: 'var(--card)', borderRadius: '24px', transform: 'scale(0.95) translateY(8px)', zIndex: 1, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }} />
          )}

          {/* 現在のカード（タッチ・ドラッグ対応） */}
          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            style={{
              position: 'absolute', inset: 0,
              background: 'var(--card)',
              borderRadius: '24px',
              overflow: 'hidden',
              zIndex: 2,
              transform: getCardTransform(),
              transition: animating ? 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
              boxShadow: 'var(--shadow-card)',
              cursor: 'grab',
              userSelect: 'none',
            }}
          >
            <div style={{ height: '300px', position: 'relative', overflow: 'hidden', pointerEvents: 'none' }}>
              <Image src={current.image} alt={current.name} fill style={{ objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.6) 100%)' }} />

              {/* LIKE */}
              {showLike && (
                <div style={{
                  position: 'absolute', top: '32px', left: '24px',
                  border: '3px solid #4CD964', borderRadius: '8px', padding: '6px 16px',
                  transform: 'rotate(-15deg)', color: '#4CD964',
                  fontSize: '28px', fontWeight: '800', letterSpacing: '2px',
                  opacity: Math.min(1, Math.abs(dragOffset.x) / 80),
                }}>LIKE</div>
              )}
              {/* NOPE */}
              {showNope && (
                <div style={{
                  position: 'absolute', top: '32px', right: '24px',
                  border: '3px solid #FF3B30', borderRadius: '8px', padding: '6px 16px',
                  transform: 'rotate(15deg)', color: '#FF3B30',
                  fontSize: '28px', fontWeight: '800', letterSpacing: '2px',
                  opacity: Math.min(1, Math.abs(dragOffset.x) / 80),
                }}>NOPE</div>
              )}
              {/* SUPER LIKE */}
              {showSuper && (
                <div style={{
                  position: 'absolute', bottom: '80px', left: '50%',
                  transform: 'translateX(-50%)',
                  border: '3px solid #34E0FE', borderRadius: '8px', padding: '6px 20px',
                  color: '#34E0FE', fontSize: '26px', fontWeight: '800',
                  letterSpacing: '2px', whiteSpace: 'nowrap',
                  opacity: Math.min(1, Math.abs(dragOffset.y) / 80),
                }}>SUPER LIKE</div>
              )}
            </div>

            <div style={{ padding: '18px 20px 20px', pointerEvents: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text)' }}>{current.name}</span>
                <span style={{
                  fontSize: '14px', fontWeight: '700',
                  background: 'var(--gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                } as React.CSSProperties}>{current.cup}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {current.tags.map(tag => (
                  <span key={tag} style={{
                    background: '#F5F6FA', color: '#666', fontSize: '12px',
                    padding: '5px 12px', borderRadius: '20px', fontWeight: '500',
                    border: '1px solid var(--border)',
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* アクションボタン */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center' }}>
          <button
            onClick={() => handleSwipe('left')}
            style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--card)', border: '1.5px solid var(--border)', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
          >✕</button>

          <button
            onClick={() => handleSwipe('up')}
            style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--card)', border: '1.5px solid #34E0FE44', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(52,224,254,0.2)', color: '#34E0FE' }}
          >⭐</button>

          <button
            onClick={() => handleSwipe('right')}
            style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--gradient)', border: 'none', fontSize: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-btn)' }}
          >💖</button>
        </div>

        <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--subtext)', fontWeight: '500' }}>
          ✕ NOPE　　⭐ SUPER LIKE　　💖 LIKE
        </div>

      </main>
    </>
  )
}