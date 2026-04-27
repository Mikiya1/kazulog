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

const getLargeImageUrl = (url: string) => url.replace('/thumbnail/', '/')

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
  const [animating, setAnimating] = useState<'left' | 'right' | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const isDragging = useRef(false)
  const cardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const onMove = (e: TouchEvent) => {
      if (!isDragging.current || !dragStart.current) return
      e.preventDefault()
      const point = e.touches[0]
      setDragOffset({
        x: point.clientX - dragStart.current.x,
        y: point.clientY - dragStart.current.y,
      })
    }
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => el.removeEventListener('touchmove', onMove)
  }, [index, cards])
  const [done, setDone] = useState(false)
  const [history, setHistory] = useState<number[]>([])
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
      p_limit: 10,
    })
    setCards(data ?? [])
    setIndex(0)
    setDone(false)
    setLoading(false)
  }

  const current = cards[index]

  const triggerAnim = async (dir: 'left' | 'right', actress: Actress) => {
    setHistory(prev => [...prev, index])
    setAnimating(dir)
    addSwipedId(actress.id)

    if (dir === 'right') {
      addLikedActress(actress)
      setLikedItems(prev => [...prev, actress])
      // 即お気に入り登録
      if (user) {
        await supabase.from('favorites').upsert({
          user_id: user.id,
          actress_id: actress.id,
          actress_name: actress.name,
          actress_image: actress.image_url,
        }, { onConflict: 'user_id,actress_id' })
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

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !dragStart.current) return
    setDragOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    })
  }

  const handleDragEnd = () => {
    if (!isDragging.current || !current) return
    isDragging.current = false
    const { x, y } = dragOffset
    if (y < -80 && Math.abs(x) < 60) triggerAnim('right', current)
    else if (x > 80) triggerAnim('right', current)
    else if (x < -80) triggerAnim('left', current)
    else setDragOffset({ x: 0, y: 0 })
  }

  const [tagUpdating, setTagUpdating] = useState(false)
  const [tagUpdated, setTagUpdated] = useState(false)
  const [showTagSelector, setShowTagSelector] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // いいねした女優のタグを集計
  const swipeTagCounts = (() => {
    const tagCount: Record<string, number> = {}
    likedItems.forEach(a => {
      a.tags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1
      })
    })
    return Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 15)
  })()

  const applyTagsFromSwipe = async () => {
    if (!user || selectedTags.length === 0) return
    setTagUpdating(true)

    const tagCountMap = Object.fromEntries(swipeTagCounts)
    for (const tag of selectedTags) {
      await supabase.from('user_preferred_tags').upsert({
        user_id: user.id,
        tag_name: tag,
        score: tagCountMap[tag] ?? 1,
        is_manual: false,
      }, { onConflict: 'user_id,tag_name' })
    }

    setTagUpdating(false)
    setTagUpdated(true)
    setShowTagSelector(false)
  }

  const goBack = () => {
    if (history.length === 0) return
    const prevIndex = history[history.length - 1]
    setHistory(prev => prev.slice(0, -1))
    setIndex(prevIndex)
    setAnimating(null)
    setDragOffset({ x: 0, y: 0 })
    // スワイプ済みから削除
    const swipedIds = getSwipedIds()
    const prevActress = cards[prevIndex]
    if (prevActress) {
      try {
        localStorage.setItem(SWIPED_KEY, JSON.stringify(swipedIds.filter(id => id !== prevActress.id)))
      } catch {}
    }
    // お気に入りから削除
    const likedActress = likedItems.find(a => a.id === cards[prevIndex]?.id)
    if (likedActress && user) {
      supabase.from('favorites').delete().eq('user_id', user.id).eq('actress_id', likedActress.id)
      setLikedItems(prev => prev.filter(a => a.id !== likedActress.id))
    }
    if (done) setDone(false)
  }

  const finishSwipe = () => {
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
            {user && likedItems.length > 0 && !tagUpdated && swipeTagCounts.length > 0 && (
              <>
                {!showTagSelector ? (
                  <button
                    onClick={() => { setShowTagSelector(true); setSelectedTags(swipeTagCounts.slice(0, 5).map(([tag]) => tag)) }}
                    style={{ width: '100%', background: 'var(--card)', color: '#FD297B', border: '2px solid #FD297B', borderRadius: '50px', padding: '14px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
                  >
                    🏷️ 診断結果を好みタグに反映する
                  </button>
                ) : (
                  <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '16px', border: '1.5px solid var(--border)' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px' }}>反映するタグを選んでください</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                      {swipeTagCounts.map(([tag, count]) => {
                        const selected = selectedTags.includes(tag)
                        return (
                          <button
                            key={tag}
                            onClick={() => setSelectedTags(prev => selected ? prev.filter(t => t !== tag) : [...prev, tag])}
                            style={{
                              padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                              background: selected ? '#FD297B' : 'var(--bg)',
                              color: selected ? '#fff' : 'var(--text)',
                              border: selected ? 'none' : '1.5px solid var(--border)',
                            }}
                          >
                            {tag} ×{count}
                          </button>
                        )
                      })}
                    </div>
                    <button
                      onClick={applyTagsFromSwipe}
                      disabled={tagUpdating || selectedTags.length === 0}
                      style={{ width: '100%', background: 'var(--gradient)', color: '#fff', border: 'none', borderRadius: '50px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: tagUpdating || selectedTags.length === 0 ? 'not-allowed' : 'pointer', opacity: tagUpdating || selectedTags.length === 0 ? 0.7 : 1 }}
                    >
                      {tagUpdating ? '反映中...' : `選択した${selectedTags.length}個のタグを反映`}
                    </button>
                  </div>
                )}
              </>
            )}
            {tagUpdated && (
              <div style={{ textAlign: 'center', padding: '12px', background: '#4cd96418', borderRadius: '50px', fontSize: '14px', fontWeight: '700', color: '#4cd964' }}>
                ✅ 好みタグに反映しました！
              </div>
            )}
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

      <main style={{ background: 'var(--bg)', maxWidth: '480px', margin: '0 auto', padding: '8px 16px 12px', display: 'flex', flexDirection: 'column' }}>

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
        <div style={{ position: 'relative', height: '440px', marginBottom: '12px' }}>

          {/* 次のカード */}
          {cards[index + 1] && (
            <div style={{ position: 'absolute', width: '100%', transform: 'scale(0.95)', transformOrigin: 'bottom', filter: 'brightness(0.8)' }}>
              <div style={{ background: 'var(--card)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                <div style={{ height: '340px', position: 'relative', background: '#f8f0f4' }}>
                  {cards[index + 1].image_url && (
                    <Image src={getLargeImageUrl(cards[index + 1].image_url)} alt="" fill style={{ objectFit: 'cover', objectPosition: 'top' }} unoptimized />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 現在のカード */}
          {current && (
            <div
              ref={cardRef}
              style={getCardStyle()}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={handleDragStart}
              onTouchEnd={handleDragEnd}
            >
              <div style={{ background: 'var(--card)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                {/* 画像 */}
                <div style={{ height: '340px', position: 'relative', background: '#f8f0f4' }}>
                  {current.image_url && (
                    <Image src={getLargeImageUrl(current.image_url)} alt={current.name} fill style={{ objectFit: 'cover', objectPosition: 'top', filter: 'contrast(1.05) saturate(1.1) sharpen(1)', imageRendering: 'crisp-edges' } as React.CSSProperties} unoptimized />
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

                </div>

                {/* 女優情報 */}
                <div style={{ padding: '12px' }}>
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
                      {current.tags.slice(0, 3).map(tag => (
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
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', padding: '10px 0 0', alignItems: 'center' }}>
          <button
            onClick={goBack}
            disabled={history.length === 0}
            style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#fff', border: '2px solid #aaa', color: '#aaa', fontSize: '18px', cursor: history.length === 0 ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: history.length === 0 ? 0.4 : 1 }}
          >↩</button>
          <button
            onClick={() => current && triggerAnim('left', current)}
            style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fff', border: '2px solid #ff3b30', color: '#ff3b30', fontSize: '24px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >✕</button>
          <button
            onClick={() => current && triggerAnim('right', current)}
            style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fff', border: '2px solid #4cd964', color: '#4cd964', fontSize: '24px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >💖</button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: 'var(--subtext)' }}>
          ← スワイプで判断
        </div>
      </main>
    </>
  )
}
