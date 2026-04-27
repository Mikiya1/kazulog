'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'

type Actress = {
  id: string
  name: string
  image_url: string
  tags: string[]
  debut_year: number | null
  cup: string | null
  height: number | null
}

const SWIPED_KEY = 'kazulog_swiped_actresses'
const LIKED_KEY = 'kazulog_liked_actresses'

const getSwipedIds = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SWIPED_KEY) || '[]')
  } catch { return [] }
}

const addSwipedId = (id: string) => {
  try {
    const ids = getSwipedIds()
    if (!ids.includes(id)) {
      localStorage.setItem(SWIPED_KEY, JSON.stringify([...ids, id]))
    }
  } catch {}
}

const getLikedActresses = (): Actress[] => {
  try {
    return JSON.parse(localStorage.getItem(LIKED_KEY) || '[]')
  } catch { return [] }
}

const addLikedActress = (actress: Actress) => {
  try {
    const liked = getLikedActresses()
    if (!liked.find(a => a.id === actress.id)) {
      localStorage.setItem(LIKED_KEY, JSON.stringify([...liked, actress]))
    }
  } catch {}
}

export default function SwipePage() {
  const router = useRouter()
  const [cards, setCards] = useState<Actress[]>([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [likedItems, setLikedItems] = useState<Actress[]>([])
  const [animating, setAnimating] = useState<'left' | 'right' | 'up' | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const isDragging = useRef(false)
  const [done, setDone] = useState(false)
  const [superLikeToast, setSuperLikeToast] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    loadCards()
  }, [])

  const loadCards = async () => {
    setLoading(true)
    const swipedIds = getSwipedIds()
    const { data } = await supabase.rpc('get_swipe_actresses', {
      p_exclude_ids: swipedIds,
      p_limit: 20,
    })
    setCards(data ?? [])
    setIndex(0)
    setDone(false)
    setLoading(false)
  }

  const current = cards[index]

  const triggerAnim = (dir: 'left' | 'right' | 'up', actress: Actress) => {
    setAnimating(dir)
    addSwipedId(actress.id)

    if (dir === 'right' || dir === 'up') {
      addLikedActress(actress)
      setLikedItems(prev => [...prev, actress])
      if (dir === 'up') {
        setSuperLikeToast(`⭐ ${actress.name.split('（')[0]}をスーパーライク！`)
        setTimeout(() => setSuperLikeToast(null), 2000)
      }
    }

    setTimeout(() => {
      setAnimating(null)
      setDragOffset({ x: 0, y: 0 })
      if (index + 1 >= cards.length) {
        setDone(true)
      } else {
        setIndex(prev => prev + 1)
      }
    }, 350)
  }

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    const point = 'touches' in e ? e.touches[0] : e
    dragStart.current = { x: point.clientX, y: point.clientY }
    isDragging.current = true
  }

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging.current || !dragStart.current) return
    const point = 'touches' in e ? e.touches[0] : e
    setDragOffset({
      x: point.clientX - dragStart.current.x,
      y: point.clientY - dragStart.current.y,
    })
  }

  const handleDragEnd = () => {
    if (!isDragging.current || !current) return
    isDragging.current = false
    const { x, y } = dragOffset
    if (y < -80 && Math.abs(x) < 60) triggerAnim('up', current)
    else if (x > 80) triggerAnim('right', current)
    else if (x < -80) triggerAnim('left', current)
    else setDragOffset({ x: 0, y: 0 })
  }

  // スワイプ完了後に好みタグを更新
  const finishSwipe = async () => {
    if (!user || likedItems.length === 0) {
      router.push('/favorites?tab=recommended')
      return
    }

    // いいねした女優のタグを集計してuser_preferred_tagsに反映
    const tagCount: Record<string, number> = {}
    likedItems.forEach(a => {
      a.tags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1
      })
    })

    // 上位5タグをupsert
    const topTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    for (const [tag, score] of topTags) {
      await supabase.from('user_preferred_tags').upsert({
        user_id: user.id,
        tag_name: tag,
        score: score,
        is_manual: false,
      }, { onConflict: 'user_id,tag_name' })
    }

    router.push('/favorites?tab=recommended')
  }

  const rotate = Math.min(Math.max(dragOffset.x / 15, -20), 20)

  const getCardStyle = (): React.CSSProperties => ({
    position: 'absolute',
    width: '100%',
    transition: animating ? 'transform 0.35s ease, opacity 0.35s ease' : 'none',
    transform: animating === 'right'
      ? 'translateX(120%) rotate(20deg)'
      : animating === 'left'
      ? 'translateX(-120%) rotate(-20deg)'
      : animating === 'up'
      ? 'translateY(-120%)'
      : `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotate}deg)`,
    opacity: animating ? 0 : 1,
    cursor: 'grab',
    userSelect: 'none',
  })

  const likeOpacity = Math.min(dragOffset.x / 80, 1)
  const nopeOpacity = Math.min(-dragOffset.x / 80, 1)
  const superOpacity = Math.min(-dragOffset.y / 80, 1)

  if (loading) {
    return (
      <>
        <Header />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', color: 'var(--subtext)', fontSize: '14px' }}>
          読み込み中...
        </div>
      </>
    )
  }

  if (done || cards.length === 0) {
    return (
      <>
        <Header />
        <main style={{ background: 'var(--bg)', minHeight: '100vh', maxWidth: '480px', margin: '0 auto', padding: '40px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <div style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>診断完了！</div>
            <div style={{ fontSize: '14px', color: 'var(--subtext)' }}>
              {likedItems.length}人の女優にいいね！しました
            </div>
          </div>

          {likedItems.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>いいね！した女優</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                {likedItems.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--card)', borderRadius: '50px', padding: '4px 12px 4px 4px', border: '1.5px solid var(--border)' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                      <Image src={a.image_url} alt={a.name} width={28} height={28} style={{ objectFit: 'cover', objectPosition: 'top' }} unoptimized />
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '600' }}>{a.name.split('（')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={finishSwipe}
              style={{ width: '100%', background: 'var(--gradient)', color: '#fff', border: 'none', borderRadius: '50px', padding: '16px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: 'var(--shadow-btn)' }}
            >
              {user ? 'おすすめを見る ✨' : '結果を見る ✨'}
            </button>
            <button
              onClick={loadCards}
              style={{ width: '100%', background: 'var(--card)', color: 'var(--text)', border: '1.5px solid var(--border)', borderRadius: '50px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
            >
              もっとスワイプする 🔄
            </button>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      {superLikeToast && (
        <div style={{ position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', background: '#1da1f2', color: '#fff', borderRadius: '50px', padding: '10px 20px', fontSize: '14px', fontWeight: '700', zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          {superLikeToast}
        </div>
      )}
      <main style={{ background: 'var(--bg)', minHeight: '100vh', maxWidth: '480px', margin: '0 auto', padding: '16px 20px 100px', display: 'flex', flexDirection: 'column' }}>

        {/* 進捗 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', color: 'var(--subtext)', fontWeight: '600' }}>
            {index + 1} / {cards.length}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--subtext)', fontWeight: '600' }}>
            💖 {likedItems.length}人
          </div>
        </div>

        {/* カードエリア */}
        <div style={{ position: 'relative', flex: 1, minHeight: '520px' }}>

          {/* 次のカード */}
          {cards[index + 1] && (
            <div style={{ position: 'absolute', width: '100%', transform: 'scale(0.95)', transformOrigin: 'bottom', filter: 'brightness(0.8)' }}>
              <div style={{ background: 'var(--card)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                <div style={{ height: '420px', position: 'relative', background: '#f8f0f4' }}>
                  {cards[index + 1].image_url && (
                    <Image src={cards[index + 1].image_url} alt="" fill style={{ objectFit: 'cover', objectPosition: 'top' }} unoptimized />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 現在のカード */}
          {current && (
            <div
              style={getCardStyle()}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
            >
              <div style={{ background: 'var(--card)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                {/* 画像 */}
                <div style={{ height: '420px', position: 'relative', background: '#f8f0f4' }}>
                  {current.image_url && (
                    <Image src={current.image_url} alt={current.name} fill style={{ objectFit: 'cover', objectPosition: 'top' }} unoptimized />
                  )}

                  {/* LIKE/NOPE/SUPER表示 */}
                  {likeOpacity > 0.1 && (
                    <div style={{ position: 'absolute', top: '24px', left: '24px', border: '3px solid #4cd964', borderRadius: '8px', padding: '4px 12px', color: '#4cd964', fontSize: '24px', fontWeight: '900', transform: `rotate(-15deg)`, opacity: likeOpacity }}>
                      LIKE 💖
                    </div>
                  )}
                  {nopeOpacity > 0.1 && (
                    <div style={{ position: 'absolute', top: '24px', right: '24px', border: '3px solid #ff3b30', borderRadius: '8px', padding: '4px 12px', color: '#ff3b30', fontSize: '24px', fontWeight: '900', transform: `rotate(15deg)`, opacity: nopeOpacity }}>
                      NOPE ✕
                    </div>
                  )}
                  {superOpacity > 0.1 && (
                    <div style={{ position: 'absolute', top: '24px', left: '50%', transform: 'translateX(-50%)', border: '3px solid #1da1f2', borderRadius: '8px', padding: '4px 12px', color: '#1da1f2', fontSize: '24px', fontWeight: '900', opacity: superOpacity }}>
                      SUPER ⭐
                    </div>
                  )}
                </div>

                {/* 女優情報 */}
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ fontSize: '20px', fontWeight: '800' }}>{current.name.split('（')[0]}</div>
                    {current.debut_year && (
                      <div style={{ fontSize: '12px', color: 'var(--subtext)', fontWeight: '600' }}>
                        🎬 {new Date().getFullYear() - current.debut_year}年目
                      </div>
                    )}
                  </div>

                  {/* スペック */}
                  {(current.cup || current.height) && (
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      {current.cup && (
                        <span style={{ fontSize: '12px', background: '#FD297B18', color: '#FD297B', borderRadius: '20px', padding: '3px 10px', fontWeight: '700' }}>
                          {current.cup}カップ
                        </span>
                      )}
                      {current.height && (
                        <span style={{ fontSize: '12px', background: 'var(--border)', color: 'var(--subtext)', borderRadius: '20px', padding: '3px 10px', fontWeight: '700' }}>
                          {current.height}cm
                        </span>
                      )}
                    </div>
                  )}

                  {/* タグ */}
                  {current.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {current.tags.slice(0, 4).map(tag => (
                        <span key={tag} style={{ fontSize: '11px', background: 'var(--border)', color: 'var(--subtext)', borderRadius: '20px', padding: '3px 10px', fontWeight: '600' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ボタン */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', padding: '20px 0 0' }}>
          <button
            onClick={() => current && triggerAnim('left', current)}
            style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fff', border: '2px solid #ff3b30', color: '#ff3b30', fontSize: '24px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >✕</button>
          <button
            onClick={() => current && triggerAnim('up', current)}
            style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fff', border: '2px solid #1da1f2', color: '#1da1f2', fontSize: '20px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >⭐</button>
          <button
            onClick={() => current && triggerAnim('right', current)}
            style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fff', border: '2px solid #4cd964', color: '#4cd964', fontSize: '24px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >💖</button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: 'var(--subtext)' }}>
          ← スワイプで判断 / 上にスワイプでスーパーライク ⭐
        </div>
      </main>
    </>
  )
}
